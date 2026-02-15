import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: teamId } = await params;

        const teamRs = await db.execute({
            sql: 'SELECT * FROM teams WHERE id = ?',
            args: [teamId]
        });
        const team = teamRs.rows[0];

        if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

        const [playersRs, captainRs] = await Promise.all([
            db.execute({ sql: 'SELECT * FROM players WHERE team_id = ?', args: [teamId] }),
            db.execute({ sql: 'SELECT * FROM captains WHERE team_id = ?', args: [teamId] })
        ]);

        const players = playersRs.rows;
        const captain = captainRs.rows[0];

        return NextResponse.json({ ...team, players, captain });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch team details' }, { status: 500 });
    }
}
