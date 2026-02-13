import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const teamId = searchParams.get('teamId');

        if (!teamId) {
            return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
        }

        const ideas = db.prepare(`
            SELECT 
                bi.*,
                m.type as match_type,
                t1.name as team1_name,
                t2.name as team2_name
            FROM battle_ideas bi
            JOIN matches m ON bi.match_id = m.id
            JOIN teams t1 ON m.team1_id = t1.id
            JOIN teams t2 ON m.team2_id = t2.id
            WHERE bi.team_id = ?
            ORDER BY bi.created_at DESC
        `).all(teamId);

        return NextResponse.json(ideas);
    } catch (error) {
        console.error('Fetch captain ideas error:', error);
        return NextResponse.json({ error: 'Failed to fetch idea history' }, { status: 500 });
    }
}
