import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const teamId = searchParams.get('teamId');

        let query = `
            SELECT 
                bi.*,
                m.type as match_type,
                t.name as team_name,
                c.name as captain_name
            FROM battle_ideas bi
            LEFT JOIN matches m ON bi.match_id = m.id
            LEFT JOIN teams t ON bi.team_id = t.id
            LEFT JOIN captains c ON bi.captain_id = c.id
        `;

        const params: any[] = [];

        if (teamId) {
            query += ` WHERE bi.team_id = ? AND bi.content != 'Dot ball'`;
            params.push(teamId);
        } else {
            query += ` WHERE bi.content != 'Dot ball'`;
        }

        query += ` ORDER BY bi.created_at DESC`;

        const ideas = db.prepare(query).all(...params);

        return NextResponse.json({ ideas });
    } catch (error) {
        console.error('Fetch battle history error:', error);
        return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
    }
}
