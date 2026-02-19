import { NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        await initDb();
        const session = await getSession();
        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await context.params;

        // Reset Logic:
        // 1. Delete all answers
        await db.execute({
            sql: `DELETE FROM individual_battle_answers WHERE battle_id = ?`,
            args: [id]
        });

        // 2. Delete all scores (leaderboard)
        await db.execute({
            sql: `DELETE FROM scores WHERE match_id = ?`,
            args: [id]
        });

        // 3. Reset Match Status to PENDING
        await db.execute({
            sql: `UPDATE matches SET status = 'PENDING' WHERE id = ?`,
            args: [id]
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Failed to reset battle', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
