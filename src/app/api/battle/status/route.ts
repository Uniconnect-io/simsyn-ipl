import { NextResponse } from 'next/server';
import db from '@/lib/db';
import OpenAI from 'openai'; // Added import for OpenAI

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
            const activeMatch = db.prepare(`
                SELECT m.*, t1.name as team1Name, t2.name as team2Name
                FROM matches m
                LEFT JOIN teams t1 ON m.team1_id = t1.id
                LEFT JOIN teams t2 ON m.team2_id = t2.id
                WHERE m.status = 'IN_PROGRESS'
                LIMIT 1
            `).get() as any;

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
                // ... (completion logic same as before, but maybe delay it until loop finishes?)
                // Actually, if we are >= MAX_BALLS, we should first Ensure all dot balls up to 120 are filled, THEN complete.

                // Let's rely on the loop below to fill up to 120, then next polling triggers completion?
                // Or just do both.
            }

            if (activeMatch.status === 'IN_PROGRESS') {
                // AUTO-PROGRESSION: Fill Dot Balls

                const teams = [
                    { id: activeMatch.team1_id, isTeam1: true },
                    { id: activeMatch.team2_id, isTeam1: false }
                ];

                // Get all ideas for this match to check existing indices
                const existingIdeas = db.prepare('SELECT team_id, ball_index FROM battle_ideas WHERE match_id = ?').all(activeMatch.id) as any[];

                for (const team of teams) {
                    if (!team.id) continue;

                    // STRICT TIME-BASED PROGRESSION
                    // We calculate expected balls (limit) based on time.
                    // We force the DB to match this count for the team.
                    const limit = Math.min(effectiveBallIndex, 120);
                    const colBalls = team.isTeam1 ? 'balls1' : 'balls2';
                    const colOvers = team.isTeam1 ? 'overs1' : 'overs2';

                    // Update Match Stats ONCE per team loop, not per missing ball
                    // We don't need to loop to update the count!
                    // The count is `limit`.
                    db.prepare(`UPDATE matches SET ${colBalls} = ? WHERE id = ?`).run(limit, activeMatch.id);

                    // Recalculate overs
                    const cappedBalls = limit;
                    const overs = Math.floor(cappedBalls / 6);
                    const balls = cappedBalls % 6;
                    const cricketOver = overs + (balls / 10);
                    db.prepare(`UPDATE matches SET ${colOvers} = ? WHERE id = ?`).run(cricketOver, activeMatch.id);

                    // The inner loop `for (let i = 0; i < limit; i++)` is no longer needed
                    // because we are not inserting dot balls and the match stats update
                    // is now handled once per team based on the `limit`.
                }
            }

            // Re-check completion AFTER loop to ensure we filled dots
            if (activeMatch.status === 'IN_PROGRESS' && currentBallIndex >= MAX_BALLS) {
                const finalCheck = db.prepare('SELECT balls1, balls2 FROM matches WHERE id = ?').get(activeMatch.id) as any;
                if (finalCheck.balls1 >= 120 && finalCheck.balls2 >= 120) {
                    const winnerId = activeMatch.score1 > activeMatch.score2 ? activeMatch.team1_id :
                        activeMatch.score2 > activeMatch.score1 ? activeMatch.team2_id : null;

                    // GENERATE SUMMARIES
                    const ideas1 = db.prepare('SELECT content FROM battle_ideas WHERE match_id = ? AND team_id = ?').all(activeMatch.id, activeMatch.team1_id).map((i: any) => i.content);
                    const ideas2 = db.prepare('SELECT content FROM battle_ideas WHERE match_id = ? AND team_id = ?').all(activeMatch.id, activeMatch.team2_id).map((i: any) => i.content);

                    const summary1 = await generateSummary(activeMatch.team1Name, ideas1);
                    const summary2 = await generateSummary(activeMatch.team2Name, ideas2);

                    db.prepare(`
                            UPDATE matches
                            SET status = 'COMPLETED',
                                winner_id = ?,
                                team1_summary = ?,
                                team2_summary = ?
                            WHERE id = ?
                        `).run(winnerId, summary1, summary2, activeMatch.id);

                    activeMatch.status = 'COMPLETED';
                    activeMatch.winner_id = winnerId;
                }
            }
            // Get ideas for this match
            const ideas = db.prepare('SELECT * FROM battle_ideas WHERE match_id = ? ORDER BY created_at DESC').all(activeMatch.id);
            return NextResponse.json({ match: activeMatch, ideas });
        }

        const match = db.prepare(`
            SELECT m.*, t1.name as team1Name, t2.name as team2Name
            FROM matches m
            LEFT JOIN teams t1 ON m.team1_id = t1.id
            LEFT JOIN teams t2 ON m.team2_id = t2.id
            WHERE m.id = ?
        `).get(matchId);

        const ideas = db.prepare('SELECT * FROM battle_ideas WHERE match_id = ? ORDER BY created_at DESC').all(matchId);

        return NextResponse.json({ match, ideas });
    } catch (error) {
        console.error('Battle status error:', error);
        return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
    }
}
