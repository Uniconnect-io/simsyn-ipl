import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
    try {
        const rs = await db.execute(`
            SELECT p.*, t.name as teamName 
            FROM players p
            LEFT JOIN teams t ON p.team_id = t.id
            WHERE p.role = 'PLAYER'
        `);
        const players = rs.rows;
        return NextResponse.json(players);
    } catch (error) {
        console.error('Failed to fetch players:', error);
        return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
    }
}
