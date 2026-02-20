import { NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import crypto from 'crypto';

export async function GET(request: Request) {
    try {
        await initDb();
        const { searchParams } = new URL(request.url);
        const battleId = searchParams.get('battleId');

        if (!battleId) {
            return NextResponse.json({ error: 'Missing battleId' }, { status: 400 });
        }

        const rs = await db.execute({
            sql: 'SELECT * FROM battle_questions WHERE battle_id = ? ORDER BY created_at ASC',
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

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        if (Array.isArray(body)) {
            // Bulk Import
            const queries = body.map(q => ({
                sql: 'INSERT INTO battle_questions (id, battle_id, question, options, correct_option) VALUES (?, ?, ?, ?, ?)',
                args: [
                    crypto.randomUUID(),
                    q.battle_id,
                    q.question,
                    JSON.stringify(q.options),
                    q.correct_option
                ]
            }));
            await db.batch(queries, 'write');
        } else {
            // Single Add
            await db.execute({
                sql: 'INSERT INTO battle_questions (id, battle_id, question, options, correct_option) VALUES (?, ?, ?, ?, ?)',
                args: [
                    crypto.randomUUID(),
                    body.battle_id,
                    body.question,
                    JSON.stringify(body.options),
                    body.correct_option
                ]
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to save question:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id, question, options, correct_option } = await request.json();

        await db.execute({
            sql: 'UPDATE battle_questions SET question = ?, options = ?, correct_option = ? WHERE id = ?',
            args: [question, JSON.stringify(options), correct_option, id]
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to update question:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await request.json();

        await db.execute({
            sql: 'DELETE FROM battle_questions WHERE id = ?',
            args: [id]
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete question:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
