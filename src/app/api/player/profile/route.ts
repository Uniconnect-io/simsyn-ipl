import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.user.role !== 'PLAYER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const playerId = session.user.id;

        // 1. Get Player Data & Team ID
        const playerRs = await db.execute({
            sql: 'SELECT id, name, team_id, rating, pool, sold_price FROM players WHERE id = ?',
            args: [playerId]
        });
        const player = playerRs.rows[0] as any;
        if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

        // 2. Get Total Points from Battle Scores (Runs)
        const scoreRs = await db.execute({
            sql: 'SELECT SUM(score) as total_runs FROM scores WHERE player_id = ?',
            args: [playerId]
        });
        const totalRuns = (scoreRs.rows[0] as any)?.total_runs || 0;

        // 3. Calculate Rank
        const allScoresRs = await db.execute(`
            SELECT player_id, SUM(score) as total 
            FROM scores 
            WHERE player_id IS NOT NULL
            GROUP BY player_id 
            ORDER BY total DESC
        `);
        const rankIndex = allScoresRs.rows.findIndex((r: any) => r.player_id === playerId);
        const rank = rankIndex === -1 ? allScoresRs.rows.length + 1 : rankIndex + 1;

        // 4. Get Team Stats (Points and NRR) if assigned
        let teamStats = null;
        if (player.team_id) {
            const [teamsRs, matchesRs, teamScoresRs] = await Promise.all([
                db.execute('SELECT id, name FROM teams'),
                db.execute("SELECT * FROM matches WHERE is_published = 1"),
                db.execute(`
                    WITH LeagueAvg AS (
                        SELECT COALESCE(SUM(score) * 1.0 / NULLIF((SELECT COUNT(*) FROM players WHERE team_id IS NOT NULL), 0), 0) as avg_score
                        FROM scores
                        WHERE team_id IS NOT NULL
                    ),
                    TotalEvents AS (
                        SELECT COUNT(id) as total_events
                        FROM matches
                        WHERE is_published = 1 AND (is_test = false OR is_test IS NULL) AND status = 'COMPLETED'
                    ),
                    RosterMetrics AS (
                         SELECT 
                            COUNT(*)::float as total_players,
                            COUNT(DISTINCT team_id)::float as total_teams
                         FROM players 
                         WHERE team_id IS NOT NULL
                    ),
                    PlayerStats AS (
                        SELECT 
                            p.id as player_id,
                            p.team_id,
                            COALESCE(SUM(s.score), 0) as total_player_score
                        FROM players p
                        LEFT JOIN scores s ON p.id = s.player_id
                        WHERE p.team_id IS NOT NULL
                        GROUP BY p.id, p.team_id
                    ),
                    PlayerNRR AS (
                        SELECT 
                            ps.player_id,
                            ps.team_id,
                            COALESCE((ps.total_player_score - la.avg_score) * 1.0 / NULLIF(te.total_events, 0), 0) as dynamic_nrr
                        FROM PlayerStats ps
                        CROSS JOIN LeagueAvg la
                        CROSS JOIN TotalEvents te
                    ),
                    TeamPoints AS (
                        SELECT 
                            team_id,
                            SUM(points) as total_points
                        FROM scores
                        WHERE team_id IS NOT NULL
                        GROUP BY team_id
                    )
                    SELECT 
                        t.id as team_id,
                        COALESCE(tp.total_points, 0) as total_points,
                        COALESCE(SUM(pn.dynamic_nrr) / (NULLIF(rm.total_players / rm.total_teams, 0)), 0) as total_nrr_bonus
                    FROM teams t
                    CROSS JOIN RosterMetrics rm
                    LEFT JOIN TeamPoints tp ON t.id = tp.team_id
                    LEFT JOIN PlayerNRR pn ON t.id = pn.team_id
                    GROUP BY t.id, tp.total_points, rm.total_players, rm.total_teams
                `)
            ]);

            const targetTeam = teamsRs.rows.find((t: any) => t.id === player.team_id);
            if (targetTeam) {
                let played = 0;
                let won = 0;
                let points = 0;
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
                totalPlayers: allScoresRs.rows.length || 1
            },
            teamStats
        });

    } catch (error) {
        console.error('Failed to fetch player profile:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
