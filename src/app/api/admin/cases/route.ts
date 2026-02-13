import { NextResponse } from 'next/server';
import db from '@/lib/db';
import crypto from 'crypto';

export async function GET() {
    try {
        const cases = db.prepare('SELECT * FROM case_studies ORDER BY created_at DESC').all();
        return NextResponse.json(cases);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch cases' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { title, description } = await request.json();
        if (!title || !description) {
            return NextResponse.json({ error: 'Title and Description are required' }, { status: 400 });
        }

        const id = crypto.randomUUID();
        db.prepare('INSERT INTO case_studies (id, title, description) VALUES (?, ?, ?)').run(id, title, description);

        return NextResponse.json({ success: true, id });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to add case' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { id } = await request.json();
        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        db.prepare('DELETE FROM case_studies WHERE id = ?').run(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete case' }, { status: 500 });
    }
}
