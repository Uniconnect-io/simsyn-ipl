import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
    try {
        const session = await getSession();
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const ideasRs = await db.execute({
            sql: 'SELECT * FROM hub_ideas WHERE player_id = ? ORDER BY created_at DESC',
            args: [session.user.id]
        });

        return NextResponse.json(ideasRs.rows);

    } catch (error) {
        console.error('Error fetching ideas:', error);
        return NextResponse.json({ error: 'Failed to fetch ideas' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const session = await getSession();
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        // Check if the idea belongs to the user and is PENDING
        const ideaRs = await db.execute({
            sql: 'SELECT status FROM hub_ideas WHERE id = ? AND player_id = ?',
            args: [id, session.user.id]
        });

        if (ideaRs.rows.length === 0) {
            return NextResponse.json({ error: 'Idea not found or unauthorized' }, { status: 404 });
        }

        const idea = ideaRs.rows[0] as { status: string };
        if (idea.status !== 'PENDING') {
            return NextResponse.json({ error: 'Only pending ideas can be deleted' }, { status: 400 });
        }

        await db.execute({
            sql: 'DELETE FROM hub_ideas WHERE id = ? AND player_id = ?',
            args: [id, session.user.id]
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error deleting idea:', error);
        return NextResponse.json({ error: 'Failed to delete idea' }, { status: 500 });
    }
}
