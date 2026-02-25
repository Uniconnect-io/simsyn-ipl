import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
    try {
        const ideasRs = await db.execute(`
            SELECT hi.id, hi.title, hi.content, hi.created_at, hi.admin_score, hi.initial_score, p.name as player_name 
            FROM hub_ideas hi
            JOIN players p ON hi.player_id = p.id
            WHERE hi.is_featured = 1
            ORDER BY hi.created_at DESC
        `);

        return NextResponse.json(ideasRs.rows);

    } catch (error) {
        console.error('Error fetching featured ideas:', error);
        return NextResponse.json({ error: 'Failed to fetch featured ideas' }, { status: 500 });
    }
}
