import { NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import crypto from 'crypto';

export async function POST(request: Request) {
    try {
        await initDb();
        const session = await getSession();
        if (!session || session.user.role !== 'PLAYER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { battleId, questionId, selectedOption, answer, startTime, endTime } = await request.json();

        // Check if battle is still active
        const battleRs = await db.execute({
            sql: 'SELECT status FROM matches WHERE id = ?',
            args: [battleId]
        });

        if (battleRs.rows.length === 0 || (battleRs.rows[0] as any).status !== 'ACTIVE') {
            return NextResponse.json({ error: 'Battle is no longer active' }, { status: 403 });
        }

        // 0. Check if already answered (Idempotency)
        const existingRs = await db.execute({
            sql: 'SELECT id FROM individual_battle_answers WHERE battle_id = ? AND question_id = ? AND player_id = ?',
            args: [battleId, questionId, session.user.id]
        });

        if (existingRs.rows.length > 0) {
            return NextResponse.json({ success: true, message: 'Already answered' });
        }

        // Calculate responseTime from timestamps
        const responseTime = endTime && startTime ? (endTime - startTime) / 1000 : 0;

        // 1. Fetch the question to check correctness
        const qRs = await db.execute({
            sql: 'SELECT correct_option FROM battle_questions WHERE id = ?',
            args: [questionId]
        });

        if (qRs.rows.length === 0) {
            return NextResponse.json({ error: 'Question not found' }, { status: 404 });
        }

        const isCorrect = parseInt(selectedOption) === (qRs.rows[0] as any).correct_option;
        let runsAwarded = 0;

        if (isCorrect) {
            // Get match timer to calculate score based on speed
            const matchRs = await db.execute({
                sql: 'SELECT question_timer FROM matches WHERE id = ?',
                args: [battleId]
            });

            const totalTime = (matchRs.rows[0] as any)?.question_timer || 10;
            const timeLeft = Math.max(0, totalTime - responseTime);
            const percentageLeft = (timeLeft / totalTime) * 100;

            if (percentageLeft >= 80) runsAwarded = 6;
            else if (percentageLeft >= 60) runsAwarded = 4;
            else if (percentageLeft >= 40) runsAwarded = 3;
            else if (percentageLeft >= 20) runsAwarded = 2;
            else runsAwarded = 1;
        }

        const id = crypto.randomUUID();
        const safeAnswer = answer !== undefined && answer !== null ? String(answer) : '';
        const safeResponseTime = responseTime || 0;

        // 3. Record answer
        await db.execute({
            sql: `INSERT INTO individual_battle_answers 
                  (id, battle_id, question_id, player_id, is_correct, runs_awarded, answer, response_time) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [id, battleId, questionId, session.user.id, isCorrect ? 1 : 0, runsAwarded, safeAnswer, safeResponseTime]
        });

        // 4. Update cumulative score in scores table
        // Get team_id for the player
        const playerRs = await db.execute({
            sql: 'SELECT team_id FROM players WHERE id = ?',
            args: [session.user.id]
        });
        const teamId = (playerRs.rows[0] as any)?.team_id || null;

        // First check if score record exists
        const scoreRs = await db.execute({
            sql: 'SELECT id, score FROM scores WHERE match_id = ? AND player_id = ?',
            args: [battleId, session.user.id]
        });

        if (scoreRs.rows.length === 0) {
            await db.execute({
                sql: 'INSERT INTO scores (id, match_id, player_id, team_id, score, nrr_contribution) VALUES (?, ?, ?, ?, ?, ?)',
                args: [crypto.randomUUID(), battleId, session.user.id, teamId, runsAwarded, runsAwarded / 1000]
            });
        } else {
            const currentScore = (scoreRs.rows[0] as any).score;
            const newScore = currentScore + runsAwarded;
            await db.execute({
                sql: 'UPDATE scores SET score = ?, nrr_contribution = ?, team_id = ? WHERE match_id = ? AND player_id = ?',
                args: [newScore, newScore / 1000, teamId, battleId, session.user.id]
            });
        }

        return NextResponse.json({
            success: true,
            isCorrect,
            runsAwarded,
            rank: isCorrect ? (runsAwarded === 6 ? 1 : runsAwarded === 4 ? 2 : runsAwarded === 3 ? 3 : runsAwarded === 2 ? 4 : '5+') : null,
            correctOption: (qRs.rows[0] as any).correct_option
        });

    } catch (error) {
        console.error('Failed to submit answer:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
