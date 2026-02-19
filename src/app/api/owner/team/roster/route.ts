import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.user.role !== 'OWNER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const teamId = session.user.team_id;
        if (!teamId) {
            return NextResponse.json({ error: 'No team assigned' }, { status: 400 });
        }

        const rs = await db.execute({
            sql: "SELECT id, name, rating, pool, sold_price FROM players WHERE team_id = ? AND role = 'PLAYER'",
            args: [teamId]
        });

        const teamRs = await db.execute({
            sql: 'SELECT name, captain_id FROM teams WHERE id = ?',
            args: [teamId]
        });

        return NextResponse.json({
            players: rs.rows,
            team: teamRs.rows[0]
        });
    } catch (error) {
        console.error('Failed to fetch roster:', error);
        return NextResponse.json({ error: 'Failed to fetch roster' }, { status: 500 });
    }
}
