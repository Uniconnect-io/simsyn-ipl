
import { NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await initDb();
        const session = await getSession();
        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Fetch detailed report: All answers for this battle
        const rs = await db.execute({
            sql: `
                SELECT 
                    iba.id,
                    p.name as player_name,
                    t.name as team_name,
                    bq.question,
                    iba.is_correct,
                    iba.runs_awarded,
                    iba.answer,
                    iba.response_time,
                    iba.created_at
                FROM individual_battle_answers iba
                JOIN players p ON iba.player_id = p.id
                LEFT JOIN teams t ON p.team_id = t.id
                JOIN battle_questions bq ON iba.question_id = bq.id
                WHERE iba.battle_id = ?
                ORDER BY iba.created_at DESC
            `,
            args: [id]
        });

        // Fetch summary scores
        const scoreRs = await db.execute({
            sql: `
                SELECT 
                    p.name as player_name,
                    t.name as team_name,
                    s.score
                FROM scores s
                JOIN players p ON s.player_id = p.id
                LEFT JOIN teams t ON p.team_id = t.id
                WHERE s.match_id = ? AND s.player_id IS NOT NULL
                ORDER BY s.score DESC
            `,
            args: [id]
        });

        return NextResponse.json({
            answers: rs.rows,
            scores: scoreRs.rows
        });

    } catch (error) {
        console.error('Failed to fetch battle report:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
