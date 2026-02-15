import { NextResponse } from 'next/server';
import db from '@/lib/db';
import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

async function generateSummary(teamName: string, ideas: string[]) {
    if (!openai || ideas.length === 0) return "No significant contributions recorded.";

    const prompt = `Summarize the following innovative ideas submitted by Team ${teamName} during a business battle. Highlight the core themes and unique strengths of their approach in 2-3 concise sentences.\n\nIdeas:\n- ${ideas.join('\n- ')}`;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a professional business consultant summarizing innovation ideas." },
                { role: "user", content: prompt }
            ],
        });
        return response.choices[0].message.content;
    } catch (e) {
        console.error("Summary generation error:", e);
        return "Summary generation failed.";
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const matchId = searchParams.get('matchId');

        if (!matchId) {
            // Find current active match
            const activeMatchRs = await db.execute({
                sql: `
                SELECT m.*, t1.name as team1Name, t2.name as team2Name
                FROM matches m
                LEFT JOIN teams t1 ON m.team1_id = t1.id
                LEFT JOIN teams t2 ON m.team2_id = t2.id
                WHERE m.status = 'IN_PROGRESS'
                LIMIT 1
            `,
                args: []
            });
            const activeMatch = activeMatchRs.rows[0] as any;

            if (!activeMatch) return NextResponse.json({ status: 'NO_ACTIVE_MATCH' });

            // Calculate progression based on time (10s per ball)
            const startTime = new Date(activeMatch.start_time).getTime();
            const nowMs = new Date().getTime();
            const totalSeconds = Math.max(0, (nowMs - startTime) / 1000);
            const currentBallIndex = Math.floor(totalSeconds / 10);
            const TOTAL_OVERS = 20;
            const MAX_BALLS = TOTAL_OVERS * 6; // 120 balls

            // Cap currentBallIndex at MAX_BALLS to prevent over-progression
            const effectiveBallIndex = Math.min(currentBallIndex, MAX_BALLS);

            // Auto-complete if 20 overs finished (120 balls) ONLY if we truly reached it
            if (activeMatch.status === 'IN_PROGRESS' && currentBallIndex >= MAX_BALLS) {
                // Logic handled below
            }

            if (activeMatch.status === 'IN_PROGRESS') {
                // AUTO-PROGRESSION: Fill Dot Balls

                const teams = [
                    { id: activeMatch.team1_id, isTeam1: true },
                    { id: activeMatch.team2_id, isTeam1: false }
                ];

                for (const team of teams) {
                    if (!team.id) continue;

                    // STRICT TIME-BASED PROGRESSION
                    // We calculate expected balls (limit) based on time.
                    // We force the DB to match this count for the team.
                    const limit = Math.min(effectiveBallIndex, 120);
                    const colBalls = team.isTeam1 ? 'balls1' : 'balls2';
                    const colOvers = team.isTeam1 ? 'overs1' : 'overs2';

                    // Update Match Stats ONCE per team loop
                    // Recalculate overs
                    const cappedBalls = limit;
                    const overs = Math.floor(cappedBalls / 6);
                    const balls = cappedBalls % 6;
                    const cricketOver = overs + (balls / 10);

                    await db.execute({
                        sql: `UPDATE matches SET ${colBalls} = ?, ${colOvers} = ? WHERE id = ?`,
                        args: [limit, cricketOver, activeMatch.id]
                    });
                }
            }

            // Re-check completion AFTER loop to ensure we filled dots
            if (activeMatch.status === 'IN_PROGRESS' && currentBallIndex >= MAX_BALLS) {
                const finalCheckRs = await db.execute({
                    sql: 'SELECT balls1, balls2 FROM matches WHERE id = ?',
                    args: [activeMatch.id]
                });
                const finalCheck = finalCheckRs.rows[0] as any;

                if (finalCheck.balls1 >= 120 && finalCheck.balls2 >= 120) {
                    const winnerId = activeMatch.score1 > activeMatch.score2 ? activeMatch.team1_id :
                        activeMatch.score2 > activeMatch.score1 ? activeMatch.team2_id : null;

                    // GENERATE SUMMARIES
                    const [ideas1Rs, ideas2Rs] = await Promise.all([
                        db.execute({ sql: 'SELECT content FROM battle_ideas WHERE match_id = ? AND team_id = ?', args: [activeMatch.id, activeMatch.team1_id] }),
                        db.execute({ sql: 'SELECT content FROM battle_ideas WHERE match_id = ? AND team_id = ?', args: [activeMatch.id, activeMatch.team2_id] })
                    ]);

                    const ideas1 = ideas1Rs.rows.map((i: any) => i.content as string);
                    const ideas2 = ideas2Rs.rows.map((i: any) => i.content as string);

                    const summary1 = await generateSummary(activeMatch.team1Name, ideas1);
                    const summary2 = await generateSummary(activeMatch.team2Name, ideas2);

                    await db.execute({
                        sql: `
                            UPDATE matches
                            SET status = 'COMPLETED',
                                winner_id = ?,
                                team1_summary = ?,
                                team2_summary = ?
                            WHERE id = ?
                        `,
                        args: [winnerId, summary1, summary2, activeMatch.id]
                    });

                    activeMatch.status = 'COMPLETED';
                    activeMatch.winner_id = winnerId;
                }
            }
            // Get ideas for this match
            const ideasRs = await db.execute({
                sql: 'SELECT * FROM battle_ideas WHERE match_id = ? ORDER BY created_at DESC',
                args: [activeMatch.id]
            });
            const ideas = ideasRs.rows;

            return NextResponse.json({ match: activeMatch, ideas });
        }

        const matchRs = await db.execute({
            sql: `
            SELECT m.*, t1.name as team1Name, t2.name as team2Name
            FROM matches m
            LEFT JOIN teams t1 ON m.team1_id = t1.id
            LEFT JOIN teams t2 ON m.team2_id = t2.id
            WHERE m.id = ?
        `,
            args: [matchId]
        });
        const match = matchRs.rows[0] as any;

        const ideasRs = await db.execute({
            sql: 'SELECT * FROM battle_ideas WHERE match_id = ? ORDER BY created_at DESC',
            args: [matchId]
        });
        const ideas = ideasRs.rows;

        return NextResponse.json({ match, ideas });
    } catch (error) {
        console.error('Battle status error:', error);
        return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
    }
}
