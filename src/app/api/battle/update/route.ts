import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
    try {
        const { ideaId, weightedScore, breakdown } = await request.json();

        if (!ideaId) {
            return NextResponse.json({ error: 'Missing ideaId' }, { status: 400 });
        }

        // 1. Determine Runs/Wicket based on new score
        let runs = 0;
        let isWicket = false;
        let wicketReason = null;

        if (weightedScore >= 95) runs = 6;
        else if (weightedScore >= 80) runs = 4;
        else if (weightedScore >= 60) runs = 2;
        else if (weightedScore >= 40) runs = 1;
        else {
            isWicket = true;
            wicketReason = "Low Score (Admin/Audit)";
        }

        // 2. Prepare new feedback JSON
        // We need to fetch existing to preserve commentary if possible, or just overwrite breakdown
        const existingRs = await db.execute({
            sql: 'SELECT feedback FROM battle_ideas WHERE id = ?',
            args: [ideaId]
        });
        const existing = existingRs.rows[0] as any;

        let feedbackObj = {};
        try {
            feedbackObj = JSON.parse(existing.feedback || '{}');
        } catch { }

        feedbackObj = {
            ...feedbackObj,
            breakdown: breakdown,
            score: weightedScore
        };

        // 3. Update battle_idea
        await db.execute({
            sql: `
            UPDATE battle_ideas 
            SET score = ?, runs = ?, is_wicket = ?, wicket_reason = ?, feedback = ?
            WHERE id = ?
        `,
            args: [weightedScore, runs, isWicket ? 1 : 0, wicketReason, JSON.stringify(feedbackObj), ideaId]
        });

        // 4. Recalculate Match Score
        // We need the match_id and team to update the match table
        const ideaRs = await db.execute({
            sql: 'SELECT match_id, team_id FROM battle_ideas WHERE id = ?',
            args: [ideaId]
        });
        const idea = ideaRs.rows[0] as any;

        if (idea) {
            const matchId = idea.match_id;
            const teamId = idea.team_id;

            // Get match details
            const matchRs = await db.execute({
                sql: 'SELECT * FROM matches WHERE id = ?',
                args: [matchId]
            });
            const match = matchRs.rows[0] as any;

            const isTeam1 = match.team1_id === teamId;

            // Recalculate total score for this team in this match
            // We should sum up all ideas for this team in this match
            const statsRs = await db.execute({
                sql: `
                SELECT 
                    SUM(runs) as total_runs, 
                    SUM(CASE WHEN is_wicket = 1 THEN 1 ELSE 0 END) as total_wickets
                FROM battle_ideas
                WHERE match_id = ? AND team_id = ?
            `,
                args: [matchId, teamId]
            });
            const stats = statsRs.rows[0] as any;

            if (isTeam1) {
                await db.execute({
                    sql: 'UPDATE matches SET score1 = ?, wickets1 = ? WHERE id = ?',
                    args: [stats.total_runs || 0, stats.total_wickets || 0, matchId]
                });
            } else {
                await db.execute({
                    sql: 'UPDATE matches SET score2 = ?, wickets2 = ? WHERE id = ?',
                    args: [stats.total_runs || 0, stats.total_wickets || 0, matchId]
                });
            }
        }

        return NextResponse.json({ success: true, runs, isWicket });

    } catch (error) {
        console.error('Update idea error:', error);
        return NextResponse.json({ error: 'Failed to update idea' }, { status: 500 });
    }
}
