import { NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
    try {
        await initDb();
        const session = await getSession();
        if (!session || session.user.role !== 'PLAYER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const rs = await db.execute({
            sql: "SELECT * FROM matches WHERE status = 'ACTIVE' AND type != 'LEAGUE' LIMIT 1",
            args: []
        });

        const battle = rs.rows[0];
        if (!battle) return NextResponse.json({ battle: null });

        // Check if player already submitted
        const scoreRs = await db.execute({
            sql: 'SELECT * FROM scores WHERE match_id = ? AND player_id = ?',
            args: [battle.id, session.user.id]
        });

        return NextResponse.json({
            battle,
            hasSubmitted: scoreRs.rows.length > 0
        });
    } catch (error) {
        console.error('Failed to fetch active battle:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.user.role !== 'PLAYER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { battleId, score, nrrContribution } = await request.json();
        const id = crypto.randomUUID();

        // Check if already submitted
        const existingRs = await db.execute({
            sql: 'SELECT id FROM scores WHERE match_id = ? AND player_id = ?',
            args: [battleId, session.user.id]
        });

        if (existingRs.rows.length > 0) {
            return NextResponse.json({ error: 'Already submitted' }, { status: 400 });
        }

        const playerRs = await db.execute({
            sql: 'SELECT team_id FROM players WHERE id = ?',
            args: [session.user.id]
        });
        const teamId = (playerRs.rows[0] as any)?.team_id || null;

        await db.execute({
            sql: 'INSERT INTO scores (id, match_id, player_id, team_id, score, nrr_contribution) VALUES (?, ?, ?, ?, ?, ?)',
            args: [id, battleId, session.user.id, teamId, score, nrrContribution || (score / 100)]
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to submit battle score:', error);
        return NextResponse.json({ error: 'Failed to submit' }, { status: 500 });
    }
}
