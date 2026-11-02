import { NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { MOSCOW_MAP, TSHIRT_MAP, FEATURE_CARDS } from '@/lib/roadmapData';

export async function POST(request: Request) {
    try {
        await initDb();
        const session = await getSession();
        if (!session || (session.user.role !== 'PLAYER' && session.user.role !== 'OWNER')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { matchId, round, submissions, isFinal } = await request.json();
        if (!matchId || !round || !submissions || !Array.isArray(submissions)) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        const isFinalBool = isFinal !== undefined ? !!isFinal : false;

        const playerId = session.user.id;

        // Fetch match and player's team
        const [matchRs, playerRs] = await Promise.all([
            db.execute({
                sql: 'SELECT * FROM matches WHERE id = ?',
                args: [matchId]
            }),
            db.execute({
                sql: 'SELECT team_id FROM players WHERE id = ?',
                args: [playerId]
            })
        ]);

        const match = matchRs.rows[0] as any;
        if (!match) {
            return NextResponse.json({ error: 'Match not found' }, { status: 404 });
        }
        if (match.status !== 'ACTIVE') {
            return NextResponse.json({ error: 'Match is not active' }, { status: 400 });
        }

        const teamId = (playerRs.rows[0] as any)?.team_id || null;

        // Verify round constraints
        if (round === 2) {
            if (session.user.role !== 'OWNER') {
                return NextResponse.json({ error: 'Only Team Owners can submit team strategies' }, { status: 403 });
            }
            if (match.current_round !== 3) {
                return NextResponse.json({ error: 'Team Round is not currently active' }, { status: 400 });
            }
        } else if (round === 1) {
            if (match.current_round !== 1) {
                return NextResponse.json({ error: 'Solo Round is already closed' }, { status: 400 });
            }
        } else {
            return NextResponse.json({ error: 'Invalid round' }, { status: 400 });
        }

        // Save submission (insert or update)
        const checkExisting = await db.execute({
            sql: 'SELECT id FROM roadmap_submissions WHERE match_id = ? AND player_id = ? AND round = ?',
            args: [matchId, playerId, round]
        });

        if (checkExisting.rows.length > 0) {
            await db.execute({
                sql: 'UPDATE roadmap_submissions SET submissions = ?, is_final = ?, created_at = CURRENT_TIMESTAMP WHERE match_id = ? AND player_id = ? AND round = ?',
                args: [JSON.stringify(submissions), isFinalBool, matchId, playerId, round]
            });
        } else {
            await db.execute({
                sql: 'INSERT INTO roadmap_submissions (id, match_id, player_id, team_id, round, submissions, is_final) VALUES (?, ?, ?, ?, ?, ?, ?)',
                args: [crypto.randomUUID(), matchId, playerId, teamId, round, JSON.stringify(submissions), isFinalBool]
            });
        }

        // If Round 1: Trigger real-time leaderboard recalculation
        if (round === 1) {
            // Get all feature cards for this match (if uploaded in battle_questions)
            const questionsRs = await db.execute({
                sql: 'SELECT id FROM battle_questions WHERE battle_id = ?',
                args: [matchId]
            });
            let matchFeatures = questionsRs.rows.map((r: any) => r.id);
            if (matchFeatures.length === 0) {
                matchFeatures = FEATURE_CARDS.map(c => c.id);
            }

            // Fetch all Round 1 submissions for this match
            const allSubmissionsRs = await db.execute({
                sql: 'SELECT player_id, team_id, submissions FROM roadmap_submissions WHERE match_id = ? AND round = 1',
                args: [matchId]
            });
            const allSubmissions = allSubmissionsRs.rows as any[];

            // 1. Calculate current Median Value & Effort for each card
            const cardValues: Record<string, number[]> = {};
            const cardEfforts: Record<string, number[]> = {};
            matchFeatures.forEach(fid => {
                cardValues[fid] = [];
                cardEfforts[fid] = [];
            });

            allSubmissions.forEach(sub => {
                const list = typeof sub.submissions === 'string' ? JSON.parse(sub.submissions) : sub.submissions;
                list.forEach((item: any) => {
                    const cardId = item.cardId;
                    if (cardValues[cardId]) {
                        const vVal = MOSCOW_MAP[item.value] || 1;
                        const eVal = TSHIRT_MAP[item.effort] || 1;
                        cardValues[cardId].push(vVal);
                        cardEfforts[cardId].push(eVal);
                    }
                });
            });

            const getMedian = (values: number[]): number => {
                if (values.length === 0) return 0;
                const sorted = [...values].sort((a, b) => a - b);
                const half = Math.floor(sorted.length / 2);
                if (sorted.length % 2 !== 0) {
                    return sorted[half];
                }
                return (sorted[half - 1] + sorted[half]) / 2.0;
            };

            const globalTargetMatrix: Record<string, { avgValue: number; avgEffort: number; avgWsjf: number }> = {};
            matchFeatures.forEach(fid => {
                const vals = cardValues[fid];
                const effs = cardEfforts[fid];
                const avgValue = vals.length > 0 ? getMedian(vals) : 8;
                const avgEffort = effs.length > 0 ? getMedian(effs) : 3;
                globalTargetMatrix[fid] = {
                    avgValue: parseFloat(avgValue.toFixed(2)),
                    avgEffort: parseFloat(avgEffort.toFixed(2)),
                    avgWsjf: parseFloat((avgValue / avgEffort).toFixed(3))
                };
            });

            // 2. Score each player based on current averages
            const playerScores: any[] = [];
            for (const sub of allSubmissions) {
                const subPlayerId = sub.player_id;
                const subTeamId = sub.team_id;

                const nameRs = await db.execute({
                    sql: 'SELECT name FROM players WHERE id = ?',
                    args: [subPlayerId]
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

                // Round score to 1 decimal place
                const finalPlayerScore = parseFloat(totalScore.toFixed(1));

                playerScores.push({
                    playerId: subPlayerId,
                    playerName,
                    teamId: subTeamId,
                    score: finalPlayerScore,
                    choices: cardChoices
                });
            }

            // Sort player scores DESC
            playerScores.sort((a, b) => b.score - a.score);

            // Fetch previous results to merge
            const prevResults = match.roadmap_results
                ? (typeof match.roadmap_results === 'string' ? JSON.parse(match.roadmap_results) : match.roadmap_results)
                : {};

            const updatedResults = {
                ...prevResults,
                round1: {
                    globalTargetMatrix,
                    playerScores
                }
            };

            await db.execute({
                sql: 'UPDATE matches SET roadmap_results = ? WHERE id = ?',
                args: [JSON.stringify(updatedResults), matchId]
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Roadmap submit API error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
