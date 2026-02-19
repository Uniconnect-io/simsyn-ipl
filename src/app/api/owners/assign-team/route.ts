import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession, login } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { ownerId } = await request.json();

        if (!ownerId) {
            return NextResponse.json({ error: 'Owner ID is required' }, { status: 400 });
        }

        // Authorization: Only the owner themselves or an ADMIN can assign a team
        if (session.user.role !== 'ADMIN' && session.user.id !== ownerId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Check if owner already has a team
        interface Owner {
            id: string;
            team_id: string | null;
        }

        interface Team {
            id: string;
            name: string;
            owner_id: string | null;
            captain_id: string | null;
        }

        const ownerRs = await db.execute({
            sql: "SELECT * FROM players WHERE id = ? AND role = 'OWNER'",
            args: [ownerId]
        });
        const owner = ownerRs.rows[0] as unknown as Owner | undefined;

        if (!owner) {
            return NextResponse.json({ error: 'Owner not found' }, { status: 404 });
        }
        if (owner.team_id) {
            return NextResponse.json({ error: 'Owner already has a team' }, { status: 400 });
        }

        // Get available teams
        const teamsRs = await db.execute('SELECT * FROM teams WHERE owner_id IS NULL');
        const availableTeams = teamsRs.rows as unknown as Team[];

        if (availableTeams.length === 0) {
            return NextResponse.json({ error: 'No teams available' }, { status: 400 });
        }

        // Pick a random team
        const randomTeam = availableTeams[Math.floor(Math.random() * availableTeams.length)];

        // Assign team to owner and owner to team
        await db.batch([
            {
                sql: 'UPDATE teams SET owner_id = ? WHERE id = ?',
                args: [ownerId, randomTeam.id]
            },
            {
                sql: 'UPDATE players SET team_id = ? WHERE id = ?',
                args: [randomTeam.id, ownerId]
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
