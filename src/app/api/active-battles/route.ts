
import { NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';

export async function GET() {
    try {
        await initDb();

        // Fetch active Group Matches (LEAGUE)
        const groupMatches = await db.execute(`
            SELECT m.id, m.team1_id, m.team2_id, m.status, m.case_description,
            t1.name as team1Name,
            t2.name as team2Name
            FROM matches m
            LEFT JOIN teams t1 ON m.team1_id = t1.id
            LEFT JOIN teams t2 ON m.team2_id = t2.id
            WHERE m.status = 'IN_PROGRESS' AND m.type = 'LEAGUE'
            ORDER BY m.created_at DESC
        `);

        // Fetch active Individual Battles (All other types)
        const individualBattles = await db.execute(`
            SELECT id, title, description, status, type
            FROM matches
            WHERE status = 'ACTIVE' AND type != 'LEAGUE'
            ORDER BY created_at DESC
        `);

        return NextResponse.json({
            groupMatches: groupMatches.rows,
            individualBattles: individualBattles.rows
        });
    } catch (error) {
        console.error('Failed to fetch active battles:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
