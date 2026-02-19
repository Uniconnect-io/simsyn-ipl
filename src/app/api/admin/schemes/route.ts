import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const rs = await db.execute('SELECT * FROM judgement_schemes ORDER BY created_at DESC');
        return NextResponse.json(rs.rows);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch schemes' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await request.json();
        const id = crypto.randomUUID();

        // If is_default is true, unmark others
        if (data.is_default) {
            await db.execute("UPDATE judgement_schemes SET is_default = 0");
        }

        await db.execute({
            sql: `INSERT INTO judgement_schemes (
                id, name, alignment_weight, feasibility_weight, value_weight, effort_weight, innovation_weight, 
                relevance_threshold, runs_config, is_default
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                id,
                data.name,
                data.alignment_weight || 0.25,
                data.feasibility_weight || 0.20,
                data.value_weight || 0.25,
                data.effort_weight || 0.15,
                data.innovation_weight || 0.15,
                data.relevance_threshold || 0.12,
                data.runs_config ? JSON.stringify(data.runs_config) : null,
                data.is_default ? 1 : 0
            ]
        });

        return NextResponse.json({ success: true, id });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create scheme' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await request.json();
        if (!data.id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

        if (data.is_default) {
            await db.execute("UPDATE judgement_schemes SET is_default = 0");
        }

        // Build dynamic update
        const fields = [];
        const args = [];

        const allowedFields = [
            'name', 'alignment_weight', 'feasibility_weight', 'value_weight',
            'effort_weight', 'innovation_weight', 'relevance_threshold', 'runs_config', 'is_default'
        ];

        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                fields.push(`${field} = ?`);
                args.push(field === 'runs_config' ? JSON.stringify(data[field]) : data[field]);
            }
        }

        if (fields.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

        args.push(data.id);
        await db.execute({
            sql: `UPDATE judgement_schemes SET ${fields.join(', ')} WHERE id = ?`,
            args
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update scheme' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await request.json();
        const rs = await db.execute({ sql: 'SELECT is_default FROM judgement_schemes WHERE id = ?', args: [id] });
        if (rs.rows[0]?.is_default) {
            return NextResponse.json({ error: 'Cannot delete default scheme' }, { status: 400 });
        }

        await db.execute({ sql: 'DELETE FROM judgement_schemes WHERE id = ?', args: [id] });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete scheme' }, { status: 500 });
    }
}
