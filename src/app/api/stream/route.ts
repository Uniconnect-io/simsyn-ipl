import { NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

// Simple in-memory global to track active clients by ID
// In a serverless environment (Vercel), this is not perfect but works for short-lived instances.
// For true scalable SSE on serverless, you'd use a dedicated service like Pusher or Ably.
// But for "free and simple" with ~50 users, this often works well enough on Vercel's "streaming" support.
let clients: any[] = [];

export async function GET(request: Request) {
    try {
        const session = await getSession();
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const playerId = session.user.id;

        // Return a stream response
        const stream = new ReadableStream({
            start(controller) {
                const encoder = new TextEncoder();

                // Send initial heartbeat immediately
                const sendHeartbeat = async () => {
                    // Reuse the lightweight logic ideally, but for now simple query
                    // We can just send a "ping" to tell client to fetch, or send data directly
                    // Let's send a ping for simplicity first, or small data
                    try {
                        await initDb();
                        const [battleRs] = await Promise.all([
                            db.execute({
                                sql: "SELECT * FROM matches WHERE status = 'ACTIVE' AND type != 'LEAGUE' LIMIT 1",
                                args: []
                            })
                        ]);
                        const battle = battleRs.rows[0] as any;

                        // Check submission status
                        let hasSubmitted = false;
                        if (battle) {
                            const [answerCheckRs, totalQuestionsRs] = await Promise.all([
                                db.execute({
                                    sql: 'SELECT question_id FROM individual_battle_answers WHERE battle_id = ? AND player_id = ?',
                                    args: [battle.id, playerId]
                                }),
                                db.execute({
                                    sql: 'SELECT COUNT(*) as count FROM battle_questions WHERE battle_id = ?',
                                    args: [battle.id]
                                })
                            ]);
                            const answeredIds = answerCheckRs.rows.map((r: any) => r.question_id);
                            const total = (totalQuestionsRs.rows[0] as any)?.count || 0;
                            if (total > 0 && answeredIds.length >= total) hasSubmitted = true;
                        }

                        const data = JSON.stringify({
                            type: 'HEARTBEAT',
                            battle: battle || null,
                            hasSubmitted
                        });
                        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                    } catch (e) {
                        console.error("Stream heartbeat error", e);
                    }
                };

                // Send immediate
                sendHeartbeat();

                // Poll interval INSIDE the stream (Server-Side Events)
                // This keeps the connection open. Vercel has limits (e.g. 10s or 60s max duration).
                // Client auto-reconnects, so it works like a "long poll" loop automatically.
                const interval = setInterval(sendHeartbeat, 2000);

                request.signal.addEventListener('abort', () => {
                    clearInterval(interval);
                    controller.close();
                });
            }
        });

        return new NextResponse(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch (e) {
        console.error("Stream error", e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
