import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const ideasRs = await db.execute(`
            SELECT hi.*, p.name as player_name 
            FROM hub_ideas hi
            JOIN players p ON hi.player_id = p.id
            ORDER BY hi.created_at DESC
        `);

        return NextResponse.json(ideasRs.rows);

    } catch (error) {
        console.error('Error fetching all ideas:', error);
        return NextResponse.json({ error: 'Failed to fetch ideas' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id, admin_score, is_shortlisted, is_featured, status } = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        const updates = [];
        const args = [];

        if (admin_score !== undefined) {
            updates.push('admin_score = ?');
            args.push(admin_score);
            // If score is assigned, maybe automatically approve? 
            // Or let explicitly handle.
        }
        if (is_shortlisted !== undefined) {
            updates.push('is_shortlisted = ?');
            args.push(is_shortlisted ? 1 : 0);
        }
        if (is_featured !== undefined) {
            updates.push('is_featured = ?');
            args.push(is_featured ? 1 : 0);
        }
        if (status !== undefined) {
            updates.push('status = ?');
            args.push(status);
        }

        if (updates.length === 0) {
            return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
        }

        args.push(id);

        await db.execute({
            sql: `UPDATE hub_ideas SET ${updates.join(', ')} WHERE id = ?`,
            args
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error updating idea:', error);
        return NextResponse.json({ error: 'Failed to update idea' }, { status: 500 });
    }
}
