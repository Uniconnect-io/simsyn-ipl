import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.user.role !== 'OWNER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { playerId } = await request.json();
        const teamId = session.user.team_id;

        if (!playerId || !teamId) {
            return NextResponse.json({ error: 'Player ID and Team ID are required' }, { status: 400 });
        }

        // Verify player belongs to the owner's team
        const playerRs = await db.execute({
            sql: 'SELECT id FROM players WHERE id = ? AND team_id = ?',
            args: [playerId, teamId]
        });

        if (playerRs.rows.length === 0) {
            return NextResponse.json({ error: 'Player not found in your team' }, { status: 404 });
        }

        // Update team's captain_id
        await db.execute({
            sql: 'UPDATE teams SET captain_id = ? WHERE id = ?',
            args: [playerId, teamId]
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to assign captain:', error);
        return NextResponse.json({ error: 'Failed to assign captain' }, { status: 500 });
    }
}
