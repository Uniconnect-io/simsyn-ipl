import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
    try {
        const rs = await db.execute(`
            SELECT p.*, t.name as "teamName", t.balance
            FROM players p
            LEFT JOIN teams t ON p.team_id = t.id
            WHERE p.role = 'OWNER'
        `);
        const owners = rs.rows;
        return NextResponse.json(owners);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch owners' }, { status: 500 });
    }
}
