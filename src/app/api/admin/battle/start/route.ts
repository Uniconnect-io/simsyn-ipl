import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
    try {
        let { matchId, caseDescription, durationMins = 20 } = await request.json();

        if (!matchId) {
            return NextResponse.json({ error: 'Match ID is required' }, { status: 400 });
        }

        // Random Selection Logic
        if (!caseDescription) {
            const randomCase = db.prepare('SELECT * FROM case_studies WHERE is_used = 0 ORDER BY RANDOM() LIMIT 1').get() as any;
            if (!randomCase) {
                return NextResponse.json({ error: 'No unused case studies available in library' }, { status: 400 });
            }
            caseDescription = randomCase.description;
            db.prepare('UPDATE case_studies SET is_used = 1 WHERE id = ?').run(randomCase.id);
        }

        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + durationMins * 60000);

        db.prepare(`
            UPDATE matches 
            SET case_description = ?, 
                start_time = ?, 
                end_time = ?, 
                status = 'IN_PROGRESS',
                score1 = 0,
                score2 = 0,
                wickets1 = 0,
                wickets2 = 0,
                overs1 = 0,
                overs2 = 0
            WHERE id = ?
        `).run(caseDescription, startTime.toISOString(), endTime.toISOString(), matchId);

        return NextResponse.json({ success: true, startTime, endTime });
    } catch (error) {
        console.error('Battle start error:', error);
        return NextResponse.json({ error: 'Failed to start battle' }, { status: 500 });
    }
}
