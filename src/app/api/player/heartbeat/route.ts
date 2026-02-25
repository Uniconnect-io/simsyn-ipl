import { NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
    try {
        await initDb();
        const session = await getSession();
        if (!session || (session.user.role !== 'PLAYER' && session.user.role !== 'OWNER')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');

        const playerId = session.user.id;

        // LIGHTWEIGHT MODE: Just check for active battle and player status
        if (action === 'status_check') {
            const [battleRs, playerBasicRs] = await Promise.all([
                db.execute({
                    sql: "SELECT *, is_test FROM matches WHERE status = 'ACTIVE' AND type != 'LEAGUE' ORDER BY created_at DESC LIMIT 1",
                    args: []
                }),
                db.execute({
                    sql: 'SELECT id, name, team_id, rating FROM players WHERE id = ?',
                    args: [playerId]
                })
            ]);

            const battle = battleRs.rows[0] as any;
            const playerBasic = playerBasicRs.rows[0] as any;
            let answeredQuestionIds: string[] = [];
            let hasSubmitted = false;

            if (battle) {
                const [answerCheckRs, totalQuestionsRs] = await Promise.all([
                    db.execute({
                        sql: 'SELECT question_id FROM individual_battle_answers WHERE battle_id = ? AND player_id = ?',
                        args: [battle.id, playerId]
                    }),
                    db.execute({
                        sql: 'SELECT COUNT(*) as count FROM battle_questions WHERE battle_id = ?',
                        args: [battle.id]
                    })
                ]);

                answeredQuestionIds = answerCheckRs.rows.map((r: any) => r.question_id);
                const totalQuestions = (totalQuestionsRs.rows[0] as any)?.count || 0;

                if (totalQuestions > 0 && answeredQuestionIds.length >= totalQuestions) {
                    hasSubmitted = true;
                }

                // Add metadata to battle object
                battle.total_questions = totalQuestions;
            }

            return NextResponse.json({
                player: playerBasic,
                battle,
                answeredQuestionIds,
                hasSubmitted,
                isPartial: true
            });
        }

        // FULL LOAD MODE (Original Logic)
        // Fetch everything in parallel
        const [playerRs, battleRs, leaderboardRs, historyRs] = await Promise.all([
            db.execute({
                sql: 'SELECT id, name, team_id, rating, pool, sold_price FROM players WHERE id = ?',
                args: [playerId]
            }),
            db.execute({
                sql: "SELECT *, is_test FROM matches WHERE status = 'ACTIVE' AND type != 'LEAGUE' ORDER BY created_at DESC LIMIT 1",
                args: []
            }),
            db.execute(`
                SELECT player_id, SUM(points) as total 
                FROM (
                    SELECT player_id, score as points FROM scores WHERE player_id IS NOT NULL
                    UNION ALL
                    SELECT player_id, CASE WHEN admin_score > 0 THEN admin_score ELSE COALESCE(initial_score, 0) END as points FROM hub_ideas
                ) combined
                GROUP BY player_id 
                ORDER BY total DESC
            `),
            db.execute({
                sql: `
                    SELECT * FROM (
                        SELECT m.title, s.score, s.points, m.type, m.created_at
                        FROM scores s
                        JOIN matches m ON s.match_id = m.id
                        WHERE s.player_id = ? AND m.type != 'LEAGUE'
                        
                        UNION ALL
                        
                        SELECT hi.title, (CASE WHEN hi.admin_score > 0 THEN hi.admin_score ELSE COALESCE(hi.initial_score, 0) END) as score, 0 as points, 'HUB' as type, hi.created_at
                        FROM hub_ideas hi
                        WHERE hi.player_id = ?
                    ) history
                    ORDER BY created_at DESC
                    LIMIT 5
                `,
                args: [playerId, playerId]
            })
        ]);

        const player = playerRs.rows[0] as any;
        if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

        const battle = battleRs.rows[0] as any;
        const battleHistory = historyRs.rows || [];

        // Check for answered questions in active battle
        let answeredQuestionIds: string[] = [];
        let hasSubmitted = false;
        if (battle) {
            const [answerCheckRs, totalQuestionsRs] = await Promise.all([
                db.execute({
                    sql: 'SELECT question_id FROM individual_battle_answers WHERE battle_id = ? AND player_id = ?',
                    args: [battle.id, playerId]
                }),
                db.execute({
                    sql: 'SELECT COUNT(*) as count FROM battle_questions WHERE battle_id = ?',
                    args: [battle.id]
                })
            ]);

            answeredQuestionIds = answerCheckRs.rows.map((r: any) => r.question_id);
            const totalQuestions = (totalQuestionsRs.rows[0] as any)?.count || 0;

            if (totalQuestions > 0 && answeredQuestionIds.length >= totalQuestions) {
                hasSubmitted = true;
            }

            // Add metadata to battle object
            battle.total_questions = totalQuestions;
        }

        // Stats calculation
        const playerRankData = leaderboardRs.rows as any[];
        const totalRuns = playerRankData.find(r => r.player_id === playerId)?.total || 0;
        const rankIndex = playerRankData.findIndex(r => r.player_id === playerId);
        const rank = rankIndex === -1 ? playerRankData.length + 1 : rankIndex + 1;

        // Team stats
        let teamStats = null;
        if (player.team_id) {
            const [teamsRs, matchesRs, teamScoresRs] = await Promise.all([
                db.execute('SELECT id, name FROM teams'),
                db.execute("SELECT * FROM matches WHERE is_published = 1"),
                db.execute(`
                    SELECT 
                        team_id, 
                        SUM(match_points) as total_points, 
                        SUM(combined_nrr) as total_nrr_bonus
                    FROM (
                        SELECT team_id, points as match_points, nrr_contribution as combined_nrr FROM scores
                        UNION ALL
                        SELECT p.team_id, 0 as match_points, (CASE WHEN hi.admin_score > 0 THEN hi.admin_score ELSE COALESCE(hi.initial_score, 0) END) / 100.0 as combined_nrr
                        FROM hub_ideas hi
                        JOIN players p ON hi.player_id = p.id
                        WHERE p.team_id IS NOT NULL
                    ) combined
                    GROUP BY team_id
                `)
            ]);

            const targetTeam = teamsRs.rows.find((t: any) => t.id === player.team_id);
            if (targetTeam) {
                let played = 0;
                let won = 0;
                let runsScored = 0;
                let oversFaced = 0;
                let runsConceded = 0;
                let oversBowled = 0;

                const scoreData = teamScoresRs.rows.find((s: any) => s.team_id === targetTeam.id);
                const totalPoints = scoreData ? (scoreData as any).total_points : 0;
                const nrrBonus = scoreData ? (scoreData as any).total_nrr_bonus : 0;

                matchesRs.rows.forEach((m: any) => {
                    if (m.type !== 'LEAGUE') return;
                    const isTeam1 = m.team1_id === targetTeam.id;
                    const isTeam2 = m.team2_id === targetTeam.id;

                    if (isTeam1 || isTeam2) {
                        played++;
                        if (m.winner_id === targetTeam.id) won++;

                        if (isTeam1) {
                            runsScored += m.score1;
                            oversFaced += m.wickets1 >= 10 ? 20 : (m.overs1 || 0);
                            runsConceded += m.score2;
                            oversBowled += m.wickets2 >= 10 ? 20 : (m.overs2 || 0);
                        } else {
                            runsScored += m.score2;
                            oversFaced += m.wickets2 >= 10 ? 20 : (m.overs2 || 0);
                            runsConceded += m.score1;
                            oversBowled += m.wickets1 >= 10 ? 20 : (m.overs1 || 0);
                        }
                    }
                });

                const runsPerOverScored = oversFaced > 0 ? runsScored / oversFaced : 0;
                const runsPerOverConceded = oversBowled > 0 ? runsConceded / oversBowled : 0;
                let nrr = (runsPerOverScored - runsPerOverConceded) + nrrBonus;

                teamStats = {
                    points: totalPoints,
                    nrr: parseFloat(nrr.toFixed(3))
                };
            }
        }

        return NextResponse.json({
            player,
            stats: {
                totalPoints: totalRuns,
                rank,
                totalPlayers: playerRankData.length || 1
            },
            teamStats,
            battle,
            battleHistory,
            answeredQuestionIds,
            hasSubmitted
        });

    } catch (error: any) {
        // Handle invalid UUID syntax (likely stale session with legacy ID)
        if (error.code === '22P02') {
            console.warn('Detected invalid UUID in session (likely legacy cookie), forcing logout.');
            return NextResponse.json({ error: 'Invalid session format' }, { status: 401 });
        }

        console.error('Player Heartbeat error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
