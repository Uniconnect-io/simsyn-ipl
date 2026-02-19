import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const teamId = searchParams.get('id');

        if (teamId) {
            const [teamRs, playersRs, ownerRs] = await Promise.all([
                db.execute({
                    sql: 'SELECT * FROM teams WHERE id = ?',
                    args: [teamId]
                }),
                db.execute({
                    sql: "SELECT id, name, team_id, rating FROM players WHERE team_id = ? AND role = 'PLAYER'",
                    args: [teamId]
                }),
                db.execute({
                    sql: "SELECT id, name, team_id FROM players WHERE team_id = ? AND role = 'OWNER'",
                    args: [teamId]
                })
            ]);

            const team = teamRs.rows[0];
            if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

            return NextResponse.json({
                ...(team as object),
                captain: ownerRs.rows[0],
                players: playersRs.rows as any[]
            });
        }

        const [teamsRs, playersRs, ownersRs] = await Promise.all([
            db.execute('SELECT * FROM teams'),
            db.execute('SELECT id, name, team_id, rating FROM players WHERE team_id IS NOT NULL AND role = "PLAYER"'),
            db.execute('SELECT id, name, team_id FROM players WHERE role = "OWNER"')
        ]);

        const teams = teamsRs.rows as any[];
        const players = playersRs.rows as any[];
        const owners = ownersRs.rows as any[];

        const teamsWithPlayers = teams.map(team => ({
            ...team,
            captain: owners.find(c => c.team_id === team.id),
            players: players.filter(p => p.team_id === team.id)
        }));

        return NextResponse.json(teamsWithPlayers);
    } catch (error) {
        console.error('Failed to fetch teams:', error);
        return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
    }
}
