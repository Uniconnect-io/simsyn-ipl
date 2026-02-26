import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

import { getIdeaScoreAndFeedback } from '@/lib/ai';

export async function GET(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const offset = (page - 1) * limit;

        const search = searchParams.get('search') || '';
        const status = searchParams.get('status') || '';
        const playerId = searchParams.get('playerId') || '';

        let whereClause = 'WHERE 1=1';
        const args: any[] = [];

        if (search) {
            whereClause += ' AND (hi.title LIKE ? OR hi.content LIKE ? OR p.name LIKE ?)';
            args.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        if (status) {
            whereClause += ' AND hi.status = ?';
            args.push(status);
        }
        if (playerId) {
            whereClause += ' AND hi.player_id = ?';
            args.push(playerId);
        }

        const countRs = await db.execute({
            sql: `SELECT COUNT(*) as total FROM hub_ideas hi JOIN players p ON hi.player_id = p.id ${whereClause}`,
            args
        });
        const totalCount = (countRs.rows[0] as any).total;

        const ideasRs = await db.execute({
            sql: `
                SELECT hi.*, p.name as player_name 
                FROM hub_ideas hi
                JOIN players p ON hi.player_id = p.id
                ${whereClause}
                ORDER BY hi.created_at DESC
                LIMIT ? OFFSET ?
            `,
            args: [...args, limit, offset]
        });

        return NextResponse.json({
            ideas: ideasRs.rows,
            pagination: {
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
                currentPage: page,
                limit
            }
        });

    } catch (error) {
        console.error('Error fetching ideas:', error);
        return NextResponse.json({ error: 'Failed to fetch ideas' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await request.json();
        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        // Fetch the idea
        const ideaRs = await db.execute({
            sql: 'SELECT title, content FROM hub_ideas WHERE id = ?',
            args: [id]
        });

        if (ideaRs.rows.length === 0) {
            return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
        }

        const idea = ideaRs.rows[0] as { title: string, content: string };

        // Re-evaluate
        const { score, feedback } = await getIdeaScoreAndFeedback(idea.title, idea.content);

        // Update the idea
        await db.execute({
            sql: 'UPDATE hub_ideas SET initial_score = ?, feedback = ? WHERE id = ?',
            args: [score, feedback, id]
        });

        return NextResponse.json({ success: true, score, feedback });

    } catch (error) {
        console.error('Error resubmitting idea for AI review:', error);
        return NextResponse.json({ error: 'Failed to resubmit idea' }, { status: 500 });
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

export async function DELETE(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        await db.execute({
            sql: 'DELETE FROM hub_ideas WHERE id = ?',
            args: [id]
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error deleting idea:', error);
        return NextResponse.json({ error: 'Failed to delete idea' }, { status: 500 });
    }
}
