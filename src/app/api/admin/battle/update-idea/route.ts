import { NextResponse } from 'next/server';
import db from '@/lib/db';

function convertToRuns(score: number) {
    if (score >= 85) return { runs: 6, wicket: false };
    if (score >= 75) return { runs: 4, wicket: false };
    if (score >= 60) return { runs: 2, wicket: false };
    if (score >= 50) return { runs: 1, wicket: false };
    if (score >= 40) return { runs: 0, wicket: false };
    return { runs: 0, wicket: true };
}

export async function POST(request: Request) {
    try {
        const { ideaId, breakdown, score } = await request.json();

        if (!ideaId || score === undefined) {
            return NextResponse.json({ error: 'Idea ID and Score required' }, { status: 400 });
        }

        // Get current idea state to handle diffs if needed (or just overwrite)
        const ideaRs = await db.execute({
            sql: 'SELECT * FROM battle_ideas WHERE id = ?',
            args: [ideaId]
        });
        const idea = ideaRs.rows[0] as any;

        if (!idea) {
            return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
        }

        // Calculate new runs/wicket
        const result = convertToRuns(score);

        // Update feedback with new breakdown if provided
        let feedback = JSON.parse(idea.feedback || '{}');
        if (breakdown) {
            feedback.breakdown = breakdown;
            feedback.commentary = "Score adjusted by Admin: " + (feedback.commentary || "");
        }

        // 1. Update Idea
        await db.execute({
            sql: `
            UPDATE battle_ideas 
            SET score = ?, runs = ?, is_wicket = ?, feedback = ?
            WHERE id = ?
        `,
            args: [score, result.runs, result.wicket ? 1 : 0, JSON.stringify(feedback), ideaId]
        });

        // 2. Recalculate Match Totals for this Team
        // It's safer to recount everything for the team in this match than to do delta
        // because multiple edits might happen.
        const matchId = idea.match_id;
        const teamId = idea.team_id;

        const totalStatsRs = await db.execute({
            sql: `
                 SELECT 
                    SUM(runs) as total_runs, 
                    SUM(is_wicket) as total_wickets 
                FROM battle_ideas 
                WHERE match_id = ? AND team_id = ?
            `,
            args: [matchId, teamId]
        });
        const totalStats = totalStatsRs.rows[0] as any;

        // Determine if team 1 or 2
        const matchRs = await db.execute({
            sql: 'SELECT team1_id, team2_id FROM matches WHERE id = ?',
            args: [matchId]
        });
        const match = matchRs.rows[0] as any;

        if (match.team1_id === teamId) {
            await db.execute({
                sql: 'UPDATE matches SET score1 = ?, wickets1 = ? WHERE id = ?',
                args: [totalStats.total_runs || 0, totalStats.total_wickets || 0, matchId]
            });
        } else {
            await db.execute({
                sql: 'UPDATE matches SET score2 = ?, wickets2 = ? WHERE id = ?',
                args: [totalStats.total_runs || 0, totalStats.total_wickets || 0, matchId]
            });
        }

        return NextResponse.json({ success: true, message: 'Idea updated and match score recalculated.' });
    } catch (error) {
        console.error('Update Idea error:', error);
        return NextResponse.json({ error: 'Failed to update idea' }, { status: 500 });
    }
}
