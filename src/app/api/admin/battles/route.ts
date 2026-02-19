import { NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
    try {
        await initDb();
        // Return all matches, potentially filtered by non-LEAGUE if requested by UI, 
        // but for now, let's keep it consistent with previous logic and return events that replaced individual_battles.
        const rs = await db.execute("SELECT * FROM matches WHERE type != 'LEAGUE' ORDER BY created_at DESC");
        return NextResponse.json(rs.rows);
    } catch (error) {
        console.error('Failed to fetch individual battles:', error);
        return NextResponse.json({ error: 'Failed to fetch battles' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { title, description, question_timer, mode, team1_id, team2_id, battle_type, start_time, conductor_id, points_weight } = await request.json();
        const id = crypto.randomUUID();

        await db.execute({
            sql: `INSERT INTO matches (
                id, title, description, question_timer, mode, team1_id, team2_id, 
                type, start_time, conductor_id, status, date, points_weight
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
            args: [
                id, title, description, question_timer || 10, mode || 'TEAM',
                team1_id || null, team2_id || null, battle_type || 'KAHOOT',
                start_time || null, conductor_id || null, 'PENDING', points_weight || 1.0
            ]
        });

        return NextResponse.json({ success: true, id });
    } catch (error) {
        console.error('Failed to create individual battle:', error);
        return NextResponse.json({ error: 'Failed to create battle' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id, status, title, description, question_timer, mode, team1_id, team2_id, battle_type, start_time, conductor_id, points_weight } = await request.json();

        if (status) {
            // If marking as COMPLETED, calculate team stats
            if (status === 'COMPLETED') {
                const battleRs = await db.execute({
                    sql: 'SELECT type, conductor_id, points_weight FROM matches WHERE id = ?',
                    args: [id]
                });
                const battle = battleRs.rows[0] as any;
                const pointsWeight = battle?.points_weight || 1.0;

                if (battle && battle.type === 'TECH_TALK' && battle.conductor_id) {
                    const conductorRs = await db.execute({
                        sql: 'SELECT team_id FROM players WHERE id = ?',
                        args: [battle.conductor_id]
                    });
                    const conductorTeamId = (conductorRs.rows[0] as any)?.team_id || null;

                    const teamsCountRs = await db.execute('SELECT COUNT(*) as count FROM teams');
                    const teamsCount = (teamsCountRs.rows[0] as any).count;

                    // Tech Talk Awards: 50 runs, (teams-1) points, 0.5 nrr (all weights applied)
                    const points = (teamsCount - 1) * pointsWeight;
                    const nrr = 0.5 * pointsWeight;
                    const runs = 50;

                    // Insert ONE unified record for both player and team stats
                    await db.execute({
                        sql: 'INSERT INTO scores (id, match_id, player_id, team_id, score, points, nrr_contribution) VALUES (?, ?, ?, ?, ?, ?, ?)',
                        args: [crypto.randomUUID(), id, battle.conductor_id, conductorTeamId, runs, points, nrr]
                    });

                    // Also record in answers for history/UI
                    await db.execute({
                        sql: 'INSERT INTO individual_battle_answers (id, battle_id, player_id, runs_awarded, is_correct) VALUES (?, ?, ?, ?, 1)',
                        args: [crypto.randomUUID(), id, battle.conductor_id, runs]
                    });
                } else {
                    // 1. Get all scores for this battle joined with players to get teams
                    const scoresRs = await db.execute({
                        sql: `SELECT s.id, s.score, p.team_id, s.player_id 
                              FROM scores s
                              JOIN players p ON s.player_id = p.id
                              WHERE s.match_id = ? AND p.team_id IS NOT NULL`,
                        args: [id]
                    });

                    const scores = scoresRs.rows as any[];

                    // 2. Get total number of questions to calculate overs
                    const questionsRs = await db.execute({
                        sql: 'SELECT COUNT(*) as count FROM battle_questions WHERE battle_id = ?',
                        args: [id]
                    });
                    const totalQuestions = (questionsRs.rows[0] as any).count;
                    const totalOvers = totalQuestions > 0 ? totalQuestions / 6 : 1;

                    // 3. Group by team
                    const teamStats: Record<string, { totalScore: number, id: string, topPlayerScore: number, topPlayerScoreId: string | null }> = {};
                    const distinctTeamsRs = await db.execute('SELECT id FROM teams');
                    const allTeamIds = distinctTeamsRs.rows.map((r: any) => r.id);

                    allTeamIds.forEach(teamId => {
                        teamStats[teamId as string] = { totalScore: 0, id: teamId as string, topPlayerScore: -1, topPlayerScoreId: null };
                    });

                    scores.forEach(s => {
                        if (teamStats[s.team_id]) {
                            teamStats[s.team_id].totalScore += s.score;
                            // Track the top player to attach team points to
                            if (s.score > teamStats[s.team_id].topPlayerScore) {
                                teamStats[s.team_id].topPlayerScore = s.score;
                                teamStats[s.team_id].topPlayerScoreId = s.id;
                            }
                        }
                    });

                    const teamList = Object.values(teamStats);
                    const numberOfTeams = teamList.length;

                    teamList.sort((a, b) => b.totalScore - a.totalScore);

                    const finalStats = teamList.map((team, index) => {
                        if (team.totalScore === 0) {
                            return { team_id: team.id, total_score: 0, points: 0, nrr: 0, targetScoreId: null };
                        }

                        const firstEqualScoreIndex = teamList.findIndex(t => t.totalScore === team.totalScore);
                        const points = Math.max(0, numberOfTeams - 1 - firstEqualScoreIndex) * pointsWeight;

                        const totalAllScores = teamList.reduce((sum, t) => sum + t.totalScore, 0);
                        const otherTeamsScore = totalAllScores - team.totalScore;

                        const averageOtherScore = numberOfTeams > 1 ? otherTeamsScore / (numberOfTeams - 1) : 0;
                        const rawNrr = totalOvers > 0 ? ((team.totalScore - averageOtherScore) / totalOvers) : 0;
                        const nrr = Math.max(-pointsWeight, Math.min(rawNrr, pointsWeight));

                        return {
                            team_id: team.id,
                            total_score: team.totalScore,
                            points,
                            nrr,
                            targetScoreId: team.topPlayerScoreId
                        };
                    });

                    // 5. Update individual records and remove any legacy NULL player records
                    await db.execute({
                        sql: 'UPDATE scores SET points = 0, nrr_contribution = 0 WHERE match_id = ?',
                        args: [id]
                    });
                    await db.execute({
                        sql: 'DELETE FROM scores WHERE match_id = ? AND player_id IS NULL',
                        args: [id]
                    });

                    for (const stat of finalStats) {
                        if (stat.points === 0 && stat.nrr === 0) continue;

                        if (stat.targetScoreId) {
                            // Merge team points into the top player's record
                            await db.execute({
                                sql: 'UPDATE scores SET points = ?, nrr_contribution = ? WHERE id = ?',
                                args: [stat.points, stat.nrr, stat.targetScoreId]
                            });
                        } else {
                            // Fallback: This team had no participants but somehow earned points (unlikely)
                            await db.execute({
                                sql: `INSERT INTO scores (id, match_id, player_id, team_id, score, points, nrr_contribution)
                                       VALUES (?, ?, NULL, ?, 0, ?, ?)`,
                                args: [crypto.randomUUID(), id, stat.team_id, stat.points, stat.nrr]
                            });
                        }
                    }
                }
            }

            await db.execute({
                sql: 'UPDATE matches SET status = ? WHERE id = ?',
                args: [status, id]
            });
        } else {
            // General Update (Edit Battle)
            // variables are already destructured at the top of the function

            await db.execute({
                sql: `UPDATE matches 
                      SET title = ?, description = ?, question_timer = ?, mode = ?, 
                          team1_id = ?, team2_id = ?, type = ?, start_time = ?, conductor_id = ?, points_weight = ?
                      WHERE id = ?`,
                args: [
                    title, description, question_timer, mode,
                    team1_id || null, team2_id || null, battle_type,
                    start_time || null, conductor_id || null, points_weight || 1.0, id
                ]
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to update individual battle:', error);
        return NextResponse.json({ error: 'Failed to update battle' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await request.json();

        await db.batch([
            {
                sql: 'DELETE FROM individual_battle_answers WHERE battle_id = ?',
                args: [id]
            },
            {
                sql: 'DELETE FROM scores WHERE match_id = ?',
                args: [id]
            },
            {
                sql: 'DELETE FROM battle_questions WHERE battle_id = ?',
                args: [id]
            },
            {
                sql: 'DELETE FROM matches WHERE id = ?',
                args: [id]
            }
        ], 'write');

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete individual battle:', error);
        return NextResponse.json({ error: 'Failed to delete battle' }, { status: 500 });
    }
}
