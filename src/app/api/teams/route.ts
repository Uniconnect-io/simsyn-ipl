import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
    try {
        const teams = db.prepare('SELECT * FROM teams').all() as any[];
        const players = db.prepare('SELECT id, name, team_id, rating FROM players WHERE team_id IS NOT NULL').all() as any[];
        const captains = db.prepare('SELECT id, name, team_id FROM captains').all() as any[];

        const teamsWithPlayers = teams.map(team => ({
            ...team,
            captain: captains.find(c => c.team_id === team.id),
            players: players.filter(p => p.team_id === team.id)
        }));

        return NextResponse.json(teamsWithPlayers);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
    }
}
