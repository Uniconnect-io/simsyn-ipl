import { NextResponse } from 'next/server';
import db from '@/lib/db';
import crypto from 'crypto';

export async function GET() {
    try {
        const check = await db.execute('SELECT * FROM case_studies ORDER BY created_at DESC');
        return NextResponse.json(check.rows);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch cases' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const { id, title, description } = await request.json();
        if (!id || !title || !description) {
            return NextResponse.json({ error: 'ID, Title, and Description are required' }, { status: 400 });
        }

        await db.execute({
            sql: 'UPDATE case_studies SET title = ?, description = ? WHERE id = ?',
            args: [title, description, id]
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update case' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { title, description } = await request.json();
        if (!title || !description) {
            return NextResponse.json({ error: 'Title and Description are required' }, { status: 400 });
        }

        const id = crypto.randomUUID();
        await db.execute({
            sql: 'INSERT INTO case_studies (id, title, description) VALUES (?, ?, ?)',
            args: [id, title, description]
        });

        return NextResponse.json({ success: true, id });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to add case' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { id } = await request.json();
        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        await db.execute({
            sql: 'DELETE FROM case_studies WHERE id = ?',
            args: [id]
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete case' }, { status: 500 });
    }
}
