import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
    try {
        let { matchId, caseDescription, durationMins = 20, schemeWeights, relevanceThreshold } = await request.json();

        if (!matchId) {
            return NextResponse.json({ error: 'Match ID is required' }, { status: 400 });
        }

        // Random Selection Logic
        if (!caseDescription) {
            const randomCaseRs = await db.execute('SELECT * FROM case_studies WHERE is_used = 0 ORDER BY RANDOM() LIMIT 1');
            const randomCase = randomCaseRs.rows[0] as any;

            if (!randomCase) {
                return NextResponse.json({ error: 'No unused case studies available in library' }, { status: 400 });
            }
            caseDescription = randomCase.description;
            await db.execute({
                sql: 'UPDATE case_studies SET is_used = 1 WHERE id = ?',
                args: [randomCase.id]
            });
        }

        // Create or Update Judgement Scheme for this match
        let schemeId = null;
        if (schemeWeights) {
            schemeId = crypto.randomUUID();
            await db.execute({
                sql: `INSERT INTO judgement_schemes (
                    id, name, alignment_weight, feasibility_weight, value_weight, effort_weight, innovation_weight, 
                    relevance_threshold, is_default
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                args: [
                    schemeId,
                    `Match ${matchId} Scheme`,
                    schemeWeights.alignment,
                    schemeWeights.feasibility,
                    schemeWeights.value,
                    schemeWeights.effort,
                    schemeWeights.innovation,
                    relevanceThreshold || 0.12,
                    0
                ]
            });
        }

        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + durationMins * 60000);

        await db.execute({
            sql: `
            UPDATE matches 
            SET case_description = ?, 
                start_time = ?, 
                end_time = ?, 
                judgement_scheme_id = ?,
                status = 'IN_PROGRESS',
                score1 = 0,
                score2 = 0,
                wickets1 = 0,
                wickets2 = 0,
                overs1 = 0,
                overs2 = 0
            WHERE id = ?
        `,
            args: [caseDescription, startTime.toISOString(), endTime.toISOString(), schemeId, matchId]
        });

        return NextResponse.json({ success: true, startTime, endTime });
    } catch (error) {
        console.error('Battle start error:', error);
        return NextResponse.json({ error: 'Failed to start battle' }, { status: 500 });
    }
}
