import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
    try {
        const { matchId } = await request.json();

        if (!matchId) {
            return NextResponse.json({ error: 'Missing matchId' }, { status: 400 });
        }

        // 1. Determine Winner
        const matchRs = await db.execute({
            sql: 'SELECT * FROM matches WHERE id = ?',
            args: [matchId]
        });
        const match = matchRs.rows[0] as any;

        if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

        let winnerId = null;
        if (match.score1 > match.score2) winnerId = match.team1_id;
        else if (match.score2 > match.score1) winnerId = match.team2_id;

        // 2. Update Match
        const result = await db.execute({
            sql: `
            UPDATE matches 
            SET is_published = 1, winner_id = ?, status = 'COMPLETED'
            WHERE id = ?
        `,
            args: [winnerId, matchId]
        });

        if (result.rowsAffected === 0) {
            // Maybe column doesn't exist? Check schema or error will be thrown
            // If it throws, we catch it below.
            // If it runs but changes 0, matchId wrong?
        }

        return NextResponse.json({ success: true, winnerId });

    } catch (error) {
        console.error('Publish match error:', error);
        // If error is "no such column: is_published", we should probably add it automatically?
        // Or just fail and let dev fix it.
        return NextResponse.json({ error: 'Failed to publish match' }, { status: 500 });
    }
}
