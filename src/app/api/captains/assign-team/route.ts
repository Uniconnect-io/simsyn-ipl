import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
    try {
        const { captainId } = await request.json();

        if (!captainId) {
            return NextResponse.json({ error: 'Captain ID is required' }, { status: 400 });
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

        const captain = db.prepare('SELECT * FROM captains WHERE id = ?').get(captainId) as Captain | undefined;
        if (!captain) {
            return NextResponse.json({ error: 'Captain not found' }, { status: 404 });
        }
        if (captain.team_id) {
            return NextResponse.json({ error: 'Captain already has a team' }, { status: 400 });
        }

        // Get available teams
        const availableTeams = db.prepare('SELECT * FROM teams WHERE captain_id IS NULL').all() as Team[];
        if (availableTeams.length === 0) {
            return NextResponse.json({ error: 'No teams available' }, { status: 400 });
        }

        // Pick a random team
        const randomTeam = availableTeams[Math.floor(Math.random() * availableTeams.length)];

        // Assign team to captain and captain to team
        const updateTeam = db.prepare('UPDATE teams SET captain_id = ? WHERE id = ?');
        const updateCaptain = db.prepare('UPDATE captains SET team_id = ? WHERE id = ?');

        const transaction = db.transaction(() => {
            updateTeam.run(captainId, randomTeam.id);
            updateCaptain.run(randomTeam.id, captainId);
        });

        transaction();

        return NextResponse.json({
            success: true,
            team: { id: randomTeam.id, name: randomTeam.name }
        });

    } catch (error) {
        console.error('Assignment error:', error);
        return NextResponse.json({ error: 'Failed to assign team' }, { status: 500 });
    }
}
