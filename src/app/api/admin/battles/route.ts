import { NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sendTeamsNotification, createBattleScheduledCard, createBattleCompletedCard } from '@/lib/teams';
import { FEATURE_CARDS, MOSCOW_MAP, TSHIRT_MAP } from '@/lib/roadmapData';

export async function GET() {
    try {
        await initDb();
        // Return all matches, potentially filtered by non-LEAGUE if requested by UI, 
        // but for now, let's keep it consistent with previous logic and return events that replaced individual_battles.
        const res = await db.execute("SELECT * FROM matches WHERE type != 'LEAGUE' ORDER BY created_at DESC");
        return NextResponse.json(res.rows);
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

        const { title, description, mode, type: battle_type, team1_id, team2_id, start_time, question_timer, conductor_id, points_config, is_test } = await request.json();

        const id = crypto.randomUUID();
        await db.execute({
            sql: `INSERT INTO matches 
                  (id, title, description, mode, type, team1_id, team2_id, status, start_time, question_timer, conductor_id, points_config, is_test) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?)`,
            args: [
                id, title, description, mode, battle_type,
                team1_id || null, team2_id || null,
                start_time || null, question_timer || 10,
                conductor_id || null,
                JSON.stringify(points_config || [5, 3, 1]),
                is_test !== undefined ? is_test : true
            ]
        });

        // Send Teams Notification
        await sendTeamsNotification(createBattleScheduledCard({
            title, description, start_time, mode, type: battle_type
        }));

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

        const { id, status, title, description, question_timer, mode, team1_id, team2_id, type: battle_type, start_time, conductor_id, points_config, is_test, team_positions, current_round, team_question_timer } = await request.json();

        const battleCheck = await db.execute({
            sql: 'SELECT type, is_test, current_round, start_time, title, points_config, roadmap_results FROM matches WHERE id = ?',
            args: [id]
        });
        const currentBattle = battleCheck.rows[0] as any;

        if (currentBattle && currentBattle.type === 'ROADMAP') {
            const is_test = currentBattle.is_test;
            let parsedPointsConfig = [25, 15, 10];
            if (points_config) {
                parsedPointsConfig = typeof points_config === 'string'
                    ? points_config.split(',').map((p: string) => Number(p.trim()))
                    : points_config;
            } else if (currentBattle.points_config) {
                parsedPointsConfig = typeof currentBattle.points_config === 'string'
                    ? JSON.parse(currentBattle.points_config)
                    : currentBattle.points_config;
            }

            if (current_round === 2) {
                // Round 1 ended, calculate player scores
                const questionsRs = await db.execute({
                    sql: 'SELECT id FROM battle_questions WHERE battle_id = ?',
                    args: [id]
                });
                let matchFeatures = questionsRs.rows.map((r: any) => r.id);
                if (matchFeatures.length === 0) {
                    matchFeatures = FEATURE_CARDS.map(c => c.id);
                }

                const submissionsRs = await db.execute({
                    sql: 'SELECT player_id, team_id, submissions FROM roadmap_submissions WHERE match_id = ? AND round = 1',
                    args: [id]
                });
                const submissions = submissionsRs.rows as any[];

                const cardTotals: Record<string, { valueSum: number; effortSum: number; count: number }> = {};
                matchFeatures.forEach(fid => {
                    cardTotals[fid] = { valueSum: 0, effortSum: 0, count: 0 };
                });

                submissions.forEach(sub => {
                    const list = typeof sub.submissions === 'string' ? JSON.parse(sub.submissions) : sub.submissions;
                    list.forEach((item: any) => {
                        const cardId = item.cardId;
                        const vVal = MOSCOW_MAP[item.value] || 1;
                        const eVal = TSHIRT_MAP[item.effort] || 1;
                        if (cardTotals[cardId]) {
                            cardTotals[cardId].valueSum += vVal;
                            cardTotals[cardId].effortSum += eVal;
                            cardTotals[cardId].count += 1;
                        }
                    });
                });

                const globalTargetMatrix: Record<string, { avgValue: number; avgEffort: number; avgWsjf: number }> = {};
                matchFeatures.forEach(fid => {
                    const totals = cardTotals[fid];
                    const avgValue = totals.count > 0 ? totals.valueSum / totals.count : 8;
                    const avgEffort = totals.count > 0 ? totals.effortSum / totals.count : 3;
                    globalTargetMatrix[fid] = {
                        avgValue: parseFloat(avgValue.toFixed(2)),
                        avgEffort: parseFloat(avgEffort.toFixed(2)),
                        avgWsjf: parseFloat((avgValue / avgEffort).toFixed(3))
                    };
                });

                const playerScores: any[] = [];
                for (const sub of submissions) {
                    const playerId = sub.player_id;
                    const teamId = sub.team_id;

                    const nameRs = await db.execute({
                        sql: 'SELECT name FROM players WHERE id = ?',
                        args: [playerId]
                    });
                    const playerName = (nameRs.rows[0] as any)?.name || 'Unknown Player';

                    const list = typeof sub.submissions === 'string' ? JSON.parse(sub.submissions) : sub.submissions;
                    let totalScore = 0;
                    const cardChoices: Record<string, any> = {};

                    list.forEach((item: any) => {
                        const cardId = item.cardId;
                        const vVal = MOSCOW_MAP[item.value] || 1;
                        const eVal = TSHIRT_MAP[item.effort] || 1;
                        const wsjf = vVal / eVal;

                        const target = globalTargetMatrix[cardId];
                        if (target) {
                            const deviation = target.avgWsjf > 0
                                ? Math.abs(wsjf - target.avgWsjf) / target.avgWsjf
                                : 0;

                            let cardPoints = 0;
                            if (deviation <= 0.10) {
                                cardPoints = 1.0;
                            } else if (deviation <= 0.25) {
                                cardPoints = 0.5;
                            }

                            totalScore += cardPoints;
                            cardChoices[cardId] = {
                                value: item.value,
                                effort: item.effort,
                                wsjf: parseFloat(wsjf.toFixed(3)),
                                deviation: parseFloat(deviation.toFixed(3)),
                                points: cardPoints
                            };
                        }
                    });

                    const finalPlayerScore = parseFloat(totalScore.toFixed(1));
                    playerScores.push({
                        playerId,
                        playerName,
                        teamId,
                        score: finalPlayerScore,
                        choices: cardChoices
                    });

                    if (!is_test) {
                        await db.execute({
                            sql: 'DELETE FROM scores WHERE match_id = ? AND player_id = ?',
                            args: [id, playerId]
                        });
                        await db.execute({
                            sql: 'INSERT INTO scores (id, match_id, player_id, team_id, score, points, nrr_contribution) VALUES (?, ?, ?, ?, ?, 0, 0)',
                            args: [crypto.randomUUID(), id, playerId, teamId, finalPlayerScore]
                        });
                    }
                }

                playerScores.sort((a, b) => b.score - a.score);

                const currentResults = {
                    round1: {
                        globalTargetMatrix,
                        playerScores
                    }
                };

                await db.execute({
                    sql: 'UPDATE matches SET current_round = 2, roadmap_results = ? WHERE id = ?',
                    args: [JSON.stringify(currentResults), id]
                });

                return NextResponse.json({ success: true });

            } else if (current_round === 3) {
                await db.execute({
                    sql: 'UPDATE matches SET current_round = 3, start_time = CURRENT_TIMESTAMP WHERE id = ?',
                    args: [id]
                });
                return NextResponse.json({ success: true });

            } else if (status === 'COMPLETED' || current_round === 4) {
                const questionsRs = await db.execute({
                    sql: 'SELECT id FROM battle_questions WHERE battle_id = ?',
                    args: [id]
                });
                let matchFeatures = questionsRs.rows.map((r: any) => r.id);
                if (matchFeatures.length === 0) {
                    matchFeatures = FEATURE_CARDS.map(c => c.id);
                }

                const submissionsRs = await db.execute({
                    sql: 'SELECT player_id, team_id, submissions FROM roadmap_submissions WHERE match_id = ? AND round = 2',
                    args: [id]
                });
                const teamSubmissions = submissionsRs.rows as any[];

                const teamsRs = await db.execute('SELECT id, name FROM teams');
                const allTeams = teamsRs.rows as any[];

                const prevResults = currentBattle.roadmap_results
                    ? (typeof currentBattle.roadmap_results === 'string' ? JSON.parse(currentBattle.roadmap_results) : currentBattle.roadmap_results)
                    : { round1: { globalTargetMatrix: {}, playerScores: [] } };

                const cardTotals: Record<string, { valueSum: number; effortSum: number; count: number }> = {};
                matchFeatures.forEach(fid => {
                    cardTotals[fid] = { valueSum: 0, effortSum: 0, count: 0 };
                });

                teamSubmissions.forEach(sub => {
                    const list = typeof sub.submissions === 'string' ? JSON.parse(sub.submissions) : sub.submissions;
                    list.forEach((item: any) => {
                        const cardId = item.cardId;
                        const vVal = MOSCOW_MAP[item.value] || 1;
                        const eVal = TSHIRT_MAP[item.effort] || 1;
                        if (cardTotals[cardId]) {
                            cardTotals[cardId].valueSum += vVal;
                            cardTotals[cardId].effortSum += eVal;
                            cardTotals[cardId].count += 1;
                        }
                    });
                });

                const globalTeamBaseline: Record<string, { avgValue: number; avgEffort: number; avgWsjf: number }> = {};
                matchFeatures.forEach(fid => {
                    const totals = cardTotals[fid];
                    const avgValue = totals.count > 0 ? totals.valueSum / totals.count : 8;
                    const avgEffort = totals.count > 0 ? totals.effortSum / totals.count : 3;
                    globalTeamBaseline[fid] = {
                        avgValue: parseFloat(avgValue.toFixed(2)),
                        avgEffort: parseFloat(avgEffort.toFixed(2)),
                        avgWsjf: parseFloat((avgValue / avgEffort).toFixed(3))
                    };
                });

                const teamScores: any[] = [];
                for (const team of allTeams) {
                    const teamId = team.id;
                    const teamName = team.name;

                    const sub = teamSubmissions.find(s => s.team_id === teamId);
                    if (!sub) {
                        teamScores.push({
                            teamId,
                            teamName,
                            consensusPoints: 0,
                            collaborationBonus: 0,
                            avgMemberDeviation: 0,
                            totalScore: 0,
                            choices: {}
                        });
                        continue;
                    }

                    const list = typeof sub.submissions === 'string' ? JSON.parse(sub.submissions) : sub.submissions;
                    let consensusPoints = 0;
                    const cardChoices: Record<string, any> = {};

                    list.forEach((item: any) => {
                        const cardId = item.cardId;
                        const vVal = MOSCOW_MAP[item.value] || 1;
                        const eVal = TSHIRT_MAP[item.effort] || 1;
                        const wsjf = vVal / eVal;

                        const baseline = globalTeamBaseline[cardId];
                        if (baseline) {
                            const deviation = baseline.avgWsjf > 0
                                ? Math.abs(wsjf - baseline.avgWsjf) / baseline.avgWsjf
                                : 0;

                            let cardPoints = 0;
                            if (deviation <= 0.10) {
                                cardPoints = 5;
                            }

                            consensusPoints += cardPoints;
                            cardChoices[cardId] = {
                                value: item.value,
                                effort: item.effort,
                                wsjf: parseFloat(wsjf.toFixed(3)),
                                deviation: parseFloat(deviation.toFixed(3)),
                                points: cardPoints
                            };
                        }
                    });

                    const membersRs = await db.execute({
                        sql: 'SELECT submissions FROM roadmap_submissions WHERE match_id = ? AND round = 1 AND team_id = ?',
                        args: [id, teamId]
                    });
                    const memberSubs = membersRs.rows as any[];
                    let collaborationBonus = 0;
                    let avgMemberDeviation = 0;

                    if (memberSubs.length === 0) {
                        collaborationBonus = 50;
                        avgMemberDeviation = 0;
                    } else {
                        const cardMemberWSJFs: Record<string, number[]> = {};
                        matchFeatures.forEach(fid => {
                            cardMemberWSJFs[fid] = [];
                        });

                        memberSubs.forEach(ms => {
                            const msList = typeof ms.submissions === 'string' ? JSON.parse(ms.submissions) : ms.submissions;
                            msList.forEach((item: any) => {
                                const cardId = item.cardId;
                                const vVal = MOSCOW_MAP[item.value] || 1;
                                const eVal = TSHIRT_MAP[item.effort] || 1;
                                if (cardMemberWSJFs[cardId]) {
                                    cardMemberWSJFs[cardId].push(vVal / eVal);
                                }
                            });
                        });

                        let totalDevSum = 0;
                        let cardCount = 0;

                        matchFeatures.forEach(fid => {
                            const wsjfs = cardMemberWSJFs[fid] || [];
                            if (wsjfs.length > 0) {
                                const avgMemberWsjf = wsjfs.reduce((a, b) => a + b, 0) / wsjfs.length;
                                const teamChoice = cardChoices[fid];
                                if (teamChoice) {
                                    const dev = avgMemberWsjf > 0
                                        ? Math.abs(teamChoice.wsjf - avgMemberWsjf) / avgMemberWsjf
                                        : 0;
                                    totalDevSum += dev;
                                    cardCount += 1;
                                    teamChoice.memberAvgWsjf = parseFloat(avgMemberWsjf.toFixed(3));
                                    teamChoice.memberDev = parseFloat(dev.toFixed(3));
                                }
                            }
                        });

                        avgMemberDeviation = cardCount > 0 ? totalDevSum / cardCount : 0;
                        if (avgMemberDeviation <= 0.20) {
                            collaborationBonus = 50;
                        }
                    }

                    const rawPoints = consensusPoints + collaborationBonus;
                    teamScores.push({
                        teamId,
                        teamName,
                        consensusPoints,
                        collaborationBonus,
                        avgMemberDeviation: parseFloat(avgMemberDeviation.toFixed(3)),
                        totalScore: rawPoints,
                        choices: cardChoices
                    });
                }

                teamScores.sort((a, b) => b.totalScore - a.totalScore);

                const pointsConfigArr = parsedPointsConfig;
                for (let i = 0; i < teamScores.length; i++) {
                    const tScore = teamScores[i];
                    if (tScore.totalScore === 0) {
                        tScore.awardedPoints = 0;
                        continue;
                    }
                    const firstEqualScoreIndex = teamScores.findIndex(t => t.totalScore === tScore.totalScore);
                    tScore.awardedPoints = Number(pointsConfigArr[firstEqualScoreIndex] || 0);

                    if (!is_test) {
                        await db.execute({
                            sql: 'DELETE FROM scores WHERE match_id = ? AND team_id = ? AND player_id IS NULL',
                            args: [id, tScore.teamId]
                        });
                        await db.execute({
                            sql: 'INSERT INTO scores (id, match_id, player_id, team_id, score, points, nrr_contribution) VALUES (?, ?, NULL, ?, 0, ?, 0)',
                            args: [crypto.randomUUID(), id, tScore.teamId, tScore.awardedPoints]
                        });
                    }
                }

                const finalResults = {
                    ...prevResults,
                    round2: {
                        globalTeamBaseline,
                        teamScores
                    }
                };

                await db.execute({
                    sql: 'UPDATE matches SET status = \'COMPLETED\', current_round = 4, roadmap_results = ?, winner_id = ? WHERE id = ?',
                    args: [JSON.stringify(finalResults), teamScores[0]?.totalScore > 0 ? teamScores[0].teamId : null, id]
                });

                await sendTeamsNotification(createBattleCompletedCard({
                    title: currentBattle.title,
                    team1: teamScores[0]?.teamName || 'N/A',
                    team2: teamScores[1]?.teamName || 'N/A',
                    score1: teamScores[0]?.totalScore || 0,
                    score2: teamScores[1]?.totalScore || 0,
                    winner: teamScores[0]?.totalScore > 0 ? teamScores[0].teamName : 'None'
                }));

                return NextResponse.json({ success: true });

            } else if (status === 'ACTIVE') {
                await db.execute({
                    sql: 'UPDATE matches SET status = ?, current_round = 1, start_time = CURRENT_TIMESTAMP WHERE id = ?',
                    args: [status, id]
                });
                return NextResponse.json({ success: true });
            }
        }

        if (status) {
            // If marking as COMPLETED, calculate team stats
            if (status === 'COMPLETED') {
                const battleRs = await db.execute({
                    sql: 'SELECT type, is_test, conductor_id, points_config FROM matches WHERE id = ?',
                    args: [id]
                });
                const battle = battleRs.rows[0] as any;

                // Skip score updates for TEST sessions
                if (battle?.is_test) {
                    await db.execute({
                        sql: 'UPDATE matches SET status = ? WHERE id = ?',
                        args: [status, id]
                    });
                    return NextResponse.json({ success: true, message: 'Test session completed (no scores affected)' });
                }

                const pointsConfig = battle?.points_config ? (typeof battle.points_config === 'string' ? JSON.parse(battle.points_config) : battle.points_config) : [5, 3, 1];

                if (battle && battle.type === 'TEAM_BUILDING' && Array.isArray(team_positions) && team_positions.length > 0) {
                    const rankedTeamIds = team_positions.filter(Boolean);

                    await db.execute({
                        sql: 'DELETE FROM scores WHERE match_id = ?',
                        args: [id]
                    });

                    for (let i = 0; i < rankedTeamIds.length; i++) {
                        const teamId = rankedTeamIds[i];
                        const awardedPoints = Number(pointsConfig[i] || 0);

                        await db.execute({
                            sql: 'INSERT INTO scores (id, match_id, player_id, team_id, score, points, nrr_contribution) VALUES (?, ?, NULL, ?, ?, ?, 0)',
                            args: [crypto.randomUUID(), id, teamId, awardedPoints, awardedPoints]
                        });
                    }

                    await db.execute({
                        sql: 'UPDATE matches SET winner_id = ? WHERE id = ?',
                        args: [rankedTeamIds[0] || null, id]
                    });
                } else if (battle && battle.type === 'TECH_TALK' && battle.conductor_id) {
                    const conductorRs = await db.execute({
                        sql: 'SELECT team_id FROM players WHERE id = ?',
                        args: [battle.conductor_id]
                    });
                    const conductorTeamId = (conductorRs.rows[0] as any)?.team_id || null;

                    const teamsCountRs = await db.execute('SELECT COUNT(*) as count FROM teams');
                    const teamsCount = (teamsCountRs.rows[0] as any).count;

                    // Tech Talk Awards: 50 runs, 5 points, 0.5 nrr
                    const points = 5;
                    const nrr = 0.5;
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

                    // 2. Get total number of questions to calculate NRR
                    const questionsRs = await db.execute({
                        sql: 'SELECT COUNT(*) as count FROM battle_questions WHERE battle_id = ?',
                        args: [id]
                    });
                    const totalQuestions = (questionsRs.rows[0] as any).count || 1;

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

                    // Sort by score DESC
                    teamList.sort((a, b) => b.totalScore - a.totalScore);

                    const finalStats = teamList.map((team) => {
                        if (team.totalScore === 0) {
                            return { team_id: team.id, total_score: 0, points: 0, targetScoreId: null };
                        }

                        // Get points from config based on rank
                        // Handle ties: teams with same score get same rank points (first occurrence in sorted list)
                        const firstEqualScoreIndex = teamList.findIndex(t => t.totalScore === team.totalScore);
                        const points = pointsConfig[firstEqualScoreIndex] || 0;

                        return {
                            team_id: team.id,
                            total_score: team.totalScore,
                            points,
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
                        if (stat.targetScoreId) {
                            // Merge team points into the top player's record
                            await db.execute({
                                sql: 'UPDATE scores SET points = ? WHERE id = ?',
                                args: [stat.points, stat.targetScoreId]
                            });
                        }
                    }
                }

                // Send Teams Notification for Completion
                const finalMatchRs = await db.execute({
                    sql: `SELECT m.title, m.score1, m.score2, t1.name as team1, t2.name as team2, w.name as winner
                          FROM matches m
                          LEFT JOIN teams t1 ON m.team1_id = t1.id
                          LEFT JOIN teams t2 ON m.team2_id = t2.id
                          LEFT JOIN teams w ON m.winner_id = w.id
                          WHERE m.id = ?`,
                    args: [id]
                });
                const finalMatch = finalMatchRs.rows[0] as any;
                if (finalMatch) {
                    await sendTeamsNotification(createBattleCompletedCard({
                        title: finalMatch.title,
                        team1: finalMatch.team1,
                        team2: finalMatch.team2,
                        score1: finalMatch.score1,
                        score2: finalMatch.score2,
                        winner: finalMatch.winner
                    }));
                }
            }

            if (status === 'ACTIVE') {
                await db.execute({
                    sql: 'UPDATE matches SET status = ?, start_time = CURRENT_TIMESTAMP WHERE id = ?',
                    args: [status, id]
                });
            } else {
                await db.execute({
                    sql: 'UPDATE matches SET status = ? WHERE id = ?',
                    args: [status, id]
                });
            }
        } else {
            // General Update (Edit Battle)
            if (currentBattle.type === 'ROADMAP') {
                await db.execute({
                    sql: `UPDATE matches 
                          SET title = ?, description = ?, question_timer = ?, team_question_timer = ?, mode = ?, 
                              team1_id = ?, team2_id = ?, type = ?, start_time = ?, conductor_id = ?, points_config = ?, is_test = ?
                          WHERE id = ?`,
                    args: [
                        title, description, question_timer, team_question_timer || 15, mode,
                        team1_id || null, team2_id || null, battle_type,
                        start_time || null, conductor_id || null,
                        points_config ? JSON.stringify(typeof points_config === 'string' ? points_config.split(',').map((p: string) => Number(p.trim())) : points_config) : null,
                        is_test !== undefined ? is_test : true,
                        id
                    ]
                });
            } else {
                await db.execute({
                    sql: `UPDATE matches 
                          SET title = ?, description = ?, question_timer = ?, mode = ?, 
                              team1_id = ?, team2_id = ?, type = ?, start_time = ?, conductor_id = ?, points_config = ?, is_test = ?
                          WHERE id = ?`,
                    args: [
                        title, description, question_timer, mode,
                        team1_id || null, team2_id || null, battle_type,
                        start_time || null, conductor_id || null,
                        points_config ? JSON.stringify(typeof points_config === 'string' ? points_config.split(',').map((p: string) => Number(p.trim())) : points_config) : null,
                        is_test !== undefined ? is_test : true,
                        id
                    ]
                });
            }
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
