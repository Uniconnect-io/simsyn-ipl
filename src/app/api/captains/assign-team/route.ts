import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession, login } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { captainId } = await request.json();

        if (!captainId) {
            return NextResponse.json({ error: 'Captain ID is required' }, { status: 400 });
        }

        // Authorization: Only the captain themselves or an ADMIN can assign a team
        if (session.user.role !== 'ADMIN' && session.user.id !== captainId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Check if captain already has a team
        interface Captain {
            id: string;
            team_id: string | null;
        }

        interface Team {
            id: string;
            name: string;
            captain_id: string | null;
        }

        const captainRs = await db.execute({
            sql: 'SELECT * FROM captains WHERE id = ?',
            args: [captainId]
        });
        const captain = captainRs.rows[0] as unknown as Captain | undefined;

        if (!captain) {
            return NextResponse.json({ error: 'Captain not found' }, { status: 404 });
        }
        if (captain.team_id) {
            return NextResponse.json({ error: 'Captain already has a team' }, { status: 400 });
        }

        // Get available teams
        const teamsRs = await db.execute('SELECT * FROM teams WHERE captain_id IS NULL');
        const availableTeams = teamsRs.rows as unknown as Team[];

        if (availableTeams.length === 0) {
            return NextResponse.json({ error: 'No teams available' }, { status: 400 });
        }

        // Pick a random team
        const randomTeam = availableTeams[Math.floor(Math.random() * availableTeams.length)];

        // Assign team to captain and captain to team
        await db.batch([
            {
                sql: 'UPDATE teams SET captain_id = ? WHERE id = ?',
                args: [captainId, randomTeam.id]
            },
            {
                sql: 'UPDATE captains SET team_id = ? WHERE id = ?',
                args: [randomTeam.id, captainId]
            }
        ], 'write');

        // Update the session cookie so the user has the team_id immediately
        const updatedUser = { ...session.user, team_id: randomTeam.id };
        await login(updatedUser);

        return NextResponse.json({
            success: true,
            team: { id: randomTeam.id, name: randomTeam.name }
        });

    } catch (error) {
        console.error('Assignment error:', error);
        return NextResponse.json({ error: 'Failed to assign team' }, { status: 500 });
    }
}
