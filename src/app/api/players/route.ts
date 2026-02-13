import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
    try {
        const players = db.prepare(`
            SELECT p.*, t.name as teamName 
            FROM players p
            LEFT JOIN teams t ON p.team_id = t.id
        `).all();
        return NextResponse.json(players);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
    }
}
