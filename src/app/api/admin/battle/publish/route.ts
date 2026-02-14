import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
    try {
        const { matchId, published } = await request.json();

        if (!matchId) {
            return NextResponse.json({ error: 'Match ID required' }, { status: 400 });
        }

        const isPublished = published !== undefined ? (published ? 1 : 0) : 1;

        if (isPublished) {
            // Recalculate scores and stats based on the ideas table
            // This ensures that any manual edits to scores are reflected in the final match result

            // Get all ideas for this match
            const ideas = db.prepare('SELECT team_id, score, is_wicket, is_duplicate FROM battle_ideas WHERE match_id = ?').all(matchId) as any[];
            const match = db.prepare('SELECT team1_id, team2_id FROM matches WHERE id = ?').get(matchId) as any;

            if (!match) {
                return NextResponse.json({ error: 'Match not found' }, { status: 404 });
            }

            let score1 = 0;
            let wickets1 = 0;
            let score2 = 0;
            let wickets2 = 0;

            for (const idea of ideas) {
                // Skip duplicates for score calculation if that's the rule, or maybe they count as 0/wicket?
                // Assuming duplicates might be wickets or just 0s. 
                // Using existing run logic:
                let runs = 0;
                let isWicket = false;

                // Simple run calculation based on score (duplicating logic from submit/route for consistency)
                // However, the `idea` record should already have updated `score` and `is_wicket` if we edited it properly.
                // But the `update-idea` API might only be updating the score, so we need to re-derive runs/wicket status OR trust the columns.
                // Let's trust the columns `score` and derive runs/wicket from it to be safe, 
                // because `update-idea` might just update `score` and `feedback`.

                // Re-eval runs/wicket based on score to be sure
                // NOTE: logic must match submit/route.ts convertToRuns
                if (idea.score >= 85) { runs = 6; isWicket = false; }
                else if (idea.score >= 75) { runs = 4; isWicket = false; }
                else if (idea.score >= 60) { runs = 2; isWicket = false; }
                else if (idea.score >= 50) { runs = 1; isWicket = false; }
                else if (idea.score >= 40) { runs = 0; isWicket = false; }
                else { runs = 0; isWicket = true; }

                if (idea.team_id === match.team1_id) {
                    score1 += runs;
                    if (isWicket) wickets1++;
                } else if (idea.team_id === match.team2_id) {
                    score2 += runs;
                    if (isWicket) wickets2++;
                }
            }

            let winnerId = null;
            if (score1 > score2) winnerId = match.team1_id;
            else if (score2 > score1) winnerId = match.team2_id;
            // Draw is null or handled elsewhere? Schema has winner_id. unique constraint? no.

            // Update match with new stats
            db.prepare(`
                UPDATE matches 
                SET score1 = ?, wickets1 = ?, score2 = ?, wickets2 = ?, winner_id = ?, is_published = 1 
                WHERE id = ?
            `).run(score1, wickets1, score2, wickets2, winnerId, matchId);

        } else {
            // Unpublish
            db.prepare('UPDATE matches SET is_published = 0 WHERE id = ?').run(matchId);
        }

        return NextResponse.json({ success: true, message: `Match results ${isPublished ? 'published' : 'unpublished'} successfully.` });
    } catch (error) {
        console.error('Publish error:', error);
        return NextResponse.json({ error: 'Failed to publish match' }, { status: 500 });
    }
}
