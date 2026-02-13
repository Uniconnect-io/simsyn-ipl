import { NextResponse } from 'next/server';
import db from '@/lib/db';

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

            // Auto-complete if timer expired
            if (activeMatch.status === 'IN_PROGRESS' && activeMatch.end_time && new Date() > new Date(activeMatch.end_time)) {
                const winnerId = activeMatch.score1 > activeMatch.score2 ? activeMatch.team1_id :
                    activeMatch.score2 > activeMatch.score1 ? activeMatch.team2_id : null;
                db.prepare("UPDATE matches SET status = 'COMPLETED', winner_id = ? WHERE id = ?").run(winnerId, activeMatch.id);
                activeMatch.status = 'COMPLETED';
                activeMatch.winner_id = winnerId;
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
