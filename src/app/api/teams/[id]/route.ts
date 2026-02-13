import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: teamId } = await params;
        const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
        if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

        const players = db.prepare('SELECT * FROM players WHERE team_id = ?').all(teamId);
        const captain = db.prepare('SELECT * FROM captains WHERE team_id = ?').get(teamId);

        return NextResponse.json({ ...team, players, captain });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch team details' }, { status: 500 });
    }
}
