import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
    try {
        const [teamsRs, playersRs, captainsRs] = await Promise.all([
            db.execute('SELECT * FROM teams'),
            db.execute('SELECT id, name, team_id, rating FROM players WHERE team_id IS NOT NULL'),
            db.execute('SELECT id, name, team_id FROM captains')
        ]);

        const teams = teamsRs.rows as any[];
        const players = playersRs.rows as any[];
        const captains = captainsRs.rows as any[];

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
