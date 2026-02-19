import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
    try {
        const rs = await db.execute(`
            SELECT 
                bi.*,
                m.type as match_type,
                t.name as team_name,
                o.name as captain_name
            FROM battle_ideas bi
            JOIN matches m ON bi.match_id = m.id
            JOIN teams t ON bi.team_id = t.id
            JOIN players o ON bi.captain_id = o.id
            ORDER BY bi.created_at DESC
        `);
        const ideas = rs.rows;

        return NextResponse.json(ideas);
    } catch (error) {
        console.error('Fetch ideas error:', error);
        return NextResponse.json({ error: 'Failed to fetch battle insights' }, { status: 500 });
    }
}
