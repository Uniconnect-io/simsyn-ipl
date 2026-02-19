import { NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';

export async function GET(request: Request) {
    try {
        await initDb();
        const { searchParams } = new URL(request.url);
        const battleId = searchParams.get('battleId');

        if (!battleId) {
            return NextResponse.json({ error: 'Missing battleId' }, { status: 400 });
        }

        // 1. Fetch individual rankings
        const individualRs = await db.execute({
            sql: `
                SELECT 
                    p.name, 
                    t.name as team_name, 
                    s.score
                FROM scores s
                JOIN players p ON s.player_id = p.id
                LEFT JOIN teams t ON p.team_id = t.id
                WHERE s.match_id = ? AND s.player_id IS NOT NULL
                ORDER BY s.score DESC
                LIMIT 50
            `,
            args: [battleId]
        });

        // 2. Fetch team rankings
        const teamRs = await db.execute({
            sql: `
                SELECT 
                    t.name as team_name, 
                    SUM(s.score) as total_score
                FROM scores s
                JOIN players p ON s.player_id = p.id
                JOIN teams t ON p.team_id = t.id
                WHERE s.match_id = ? AND s.player_id IS NOT NULL
                GROUP BY t.id
                ORDER BY total_score DESC
            `,
            args: [battleId]
        });

        // 3. Fetch recent feed (last 10 answers)
        const feedRs = await db.execute({
            sql: `
                SELECT 
                    p.name as player_name,
                    t.name as team_name,
                    iba.runs_awarded,
                    iba.is_correct,
                    iba.created_at
                FROM individual_battle_answers iba
                JOIN players p ON iba.player_id = p.id
                LEFT JOIN teams t ON p.team_id = t.id
                WHERE iba.battle_id = ? AND iba.runs_awarded > 0
                ORDER BY iba.created_at DESC
                LIMIT 10
            `,
            args: [battleId]
        });

        return NextResponse.json({
            individuals: individualRs.rows,
            teams: teamRs.rows,
            feed: feedRs.rows
        });

    } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
