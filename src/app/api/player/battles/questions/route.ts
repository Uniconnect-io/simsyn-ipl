import { NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
    try {
        await initDb();
        const session = await getSession();
        if (!session || (session.user.role !== 'PLAYER' && session.user.role !== 'ADMIN')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const battleId = searchParams.get('battleId');

        if (!battleId) {
            return NextResponse.json({ error: 'Missing battleId' }, { status: 400 });
        }

        const rs = await db.execute({
            sql: 'SELECT id, question, options FROM battle_questions WHERE battle_id = ? ORDER BY created_at ASC',
            args: [battleId]
        });

        // Return questions - options are automatically parsed by pg driver
        const questions = rs.rows.map((row: any) => ({
            ...row,
            options: typeof row.options === 'string' ? JSON.parse(row.options) : row.options
        }));

        return NextResponse.json(questions);
    } catch (error) {
        console.error('Failed to fetch questions:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
