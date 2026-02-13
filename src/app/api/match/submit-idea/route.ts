import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
    try {
        const { matchId, teamId, captainId, content } = await request.json();

        if (!matchId || !teamId || !captainId || !content) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        db.prepare(`
            INSERT INTO idea_submissions (id, match_id, team_id, captain_id, content)
            VALUES (?, ?, ?, ?, ?)
        `).run(randomUUID(), matchId, teamId, captainId, content);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Idea submission failed:', error);
        return NextResponse.json({ error: 'Submission failed' }, { status: 500 });
    }
}
