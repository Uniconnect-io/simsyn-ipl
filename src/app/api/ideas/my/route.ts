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
