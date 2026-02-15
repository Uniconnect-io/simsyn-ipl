import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
    try {
        const rs = await db.execute(`
            SELECT c.*, t.name as teamName, t.balance
            FROM captains c
            LEFT JOIN teams t ON c.team_id = t.id
        `);
        const captains = rs.rows;
        return NextResponse.json(captains);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch captains' }, { status: 500 });
    }
}
