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

        const battleRs = await db.execute({
            sql: `
                SELECT id, type, mode, team1_id, team2_id, score1, score2, roadmap_results
                FROM matches
                WHERE id = ?
            `,
            args: [battleId]
        });
        const battle = (battleRs.rows[0] as any) || null;

        let individuals: any[] = [];
        let teams: any[] = [];
        let feed: any[] = [];
        let sortedFeatures: any[] = [];

        if (battle && battle.type === 'ROADMAP') {
            const results = battle.roadmap_results 
                ? (typeof battle.roadmap_results === 'string' ? JSON.parse(battle.roadmap_results) : battle.roadmap_results) 
                : null;
            
            const teamsRs = await db.execute('SELECT id, name FROM teams');
            const allTeams = teamsRs.rows as any[];

            if (results?.round1?.playerScores) {
                individuals = results.round1.playerScores.map((ps: any) => {
                    const choices = ps.choices || {};
                    const total = Object.keys(choices).length || 1;
                    let agreed = 0;
                    let disagreed = 0;
                    Object.values(choices).forEach((ch: any) => {
                        if (ch.points > 0) {
                            agreed++;
                        } else {
                            disagreed++;
                        }
                    });
                    return {
                        name: ps.playerName,
                        team_name: allTeams.find(t => t.id === ps.teamId)?.name || 'Free Agent',
                        score: ps.score,
                        agree_pct: Math.round((agreed / total) * 100),
                        disagree_pct: Math.round((disagreed / total) * 100)
                    };
                });
            }

            if (results?.round2?.teamScores) {
                teams = results.round2.teamScores.map((ts: any) => ({
                    team_id: ts.teamId,
                    team_name: ts.teamName,
                    total_score: ts.totalScore,
                    total_points: ts.awardedPoints || 0,
                    agree_pct: ts.consensusPoints,
                    disagree_pct: 100 - ts.consensusPoints,
                    avg_deviation: ts.avgMemberDeviation,
                    collaboration_bonus: ts.collaborationBonus
                }));
            } else {
                // If round 2 is not completed yet, calculate intermediate team averages based on round 1 players!
                const teamSums: Record<string, { sum: number; count: number }> = {};
                const teamStats: Record<string, { agreeSum: number; count: number }> = {};
                allTeams.forEach(t => {
                    teamSums[t.id] = { sum: 0, count: 0 };
                    teamStats[t.id] = { agreeSum: 0, count: 0 };
                });

                if (results?.round1?.playerScores) {
                    results.round1.playerScores.forEach((ps: any) => {
                        if (teamSums[ps.teamId]) {
                            teamSums[ps.teamId].sum += ps.score;
                            teamSums[ps.teamId].count += 1;
                        }
                        
                        const choices = ps.choices || {};
                        const total = Object.keys(choices).length || 1;
                        let agreed = 0;
                        Object.values(choices).forEach((ch: any) => {
                            if (ch.points > 0) agreed++;
                        });
                        const agreePct = Math.round((agreed / total) * 100);
                        if (teamStats[ps.teamId]) {
                            teamStats[ps.teamId].agreeSum += agreePct;
                            teamStats[ps.teamId].count += 1;
                        }
                    });
                }

                teams = allTeams.map(t => {
                    const stats = teamSums[t.id];
                    const tStat = teamStats[t.id];
                    const avgAgree = tStat && tStat.count > 0 ? Math.round(tStat.agreeSum / tStat.count) : 0;
                    return {
                        team_id: t.id,
                        team_name: t.name,
                        total_score: stats && stats.count > 0 ? parseFloat((stats.sum / stats.count).toFixed(2)) : 0,
                        total_points: 0,
                        agree_pct: avgAgree,
                        disagree_pct: 100 - avgAgree,
                        avg_deviation: 0,
                        collaboration_bonus: 0
                    };
                }).sort((a, b) => b.total_score - a.total_score);
            }

            // Fetch roadmap submissions to show in the live feed
            const roadFeedRs = await db.execute({
                sql: `
                    SELECT 
                        p.name as player_name,
                        t.name as team_name,
                        rs.round,
                        rs.created_at
                    FROM roadmap_submissions rs
                    JOIN players p ON rs.player_id = p.id
                    LEFT JOIN teams t ON p.team_id = t.id
                    WHERE rs.match_id = ?
                    ORDER BY rs.created_at DESC
                    LIMIT 10
                `,
                args: [battleId]
            });

            feed = roadFeedRs.rows.map((row: any) => ({
                player_name: row.player_name,
                team_name: `${row.team_name || 'Free Agent'} • Rd ${row.round} Ballot`,
                runs_awarded: '✓',
                created_at: row.created_at
            }));

            const matrix = results?.round1?.globalTargetMatrix || {};
            if (Object.keys(matrix).length > 0) {
                const featuresRs = await db.execute({
                    sql: 'SELECT id, question as title, options FROM battle_questions WHERE battle_id = ?',
                    args: [battleId]
                });
                let allFeatures = featuresRs.rows.map((r: any) => ({
                    id: r.id,
                    title: r.title,
                    description: r.options?.[0] || ''
                }));

                if (allFeatures.length === 0) {
                    const { FEATURE_CARDS } = require('@/lib/roadmapData');
                    allFeatures = FEATURE_CARDS.map((c: any) => ({
                        id: c.id,
                        title: c.title,
                        description: c.description
                    }));
                }

                sortedFeatures = allFeatures.map(f => {
                    const stats = matrix[f.id] || { avgValue: 0, avgEffort: 0, avgWsjf: 0 };
                    return {
                        ...f,
                        avgValue: stats.avgValue,
                        avgEffort: stats.avgEffort,
                        avgWsjf: stats.avgWsjf
                    };
                }).sort((a, b) => b.avgWsjf - a.avgWsjf);
            }

        } else {
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
            individuals = individualRs.rows;

            // 2. Fetch team rankings (supports both player-linked and direct team score rows)
            const teamRs = await db.execute({
                sql: `
                    SELECT 
                        t.id as team_id,
                        t.name as team_name,
                        COALESCE(SUM(s.score), 0) as total_score,
                        COALESCE(SUM(s.points), 0) as total_points
                    FROM scores s
                    LEFT JOIN players p ON s.player_id = p.id
                    LEFT JOIN teams t ON t.id = COALESCE(s.team_id, p.team_id)
                    WHERE s.match_id = ?
                      AND t.id IS NOT NULL
                    GROUP BY t.id, t.name
                    ORDER BY total_score DESC, total_points DESC
                `,
                args: [battleId]
            });
            teams = teamRs.rows as any[];

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
            feed = feedRs.rows;

            // Fallback for team-vs-team publish flows where scores are on match row but score rows may be missing.
            if (teams.length === 0 && battle && battle.team1_id && battle.team2_id) {
                const pairRs = await db.execute({
                    sql: `
                        SELECT id, name
                        FROM teams
                        WHERE id IN (?, ?)
                    `,
                    args: [battle.team1_id, battle.team2_id]
                });

                const pair = pairRs.rows as any[];
                const team1 = pair.find(t => t.id === battle.team1_id);
                const team2 = pair.find(t => t.id === battle.team2_id);

                teams = [
                    {
                        team_id: battle.team1_id,
                        team_name: team1?.name || 'Team 1',
                        total_score: Number(battle.score1 || 0),
                        total_points: 0
                    },
                    {
                        team_id: battle.team2_id,
                        team_name: team2?.name || 'Team 2',
                        total_score: Number(battle.score2 || 0),
                        total_points: 0
                    }
                ].sort((a, b) => b.total_score - a.total_score);
            }
        }

        return NextResponse.json({
            battle,
            individuals,
            teams,
            feed,
            sortedFeatures
        });

    } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
