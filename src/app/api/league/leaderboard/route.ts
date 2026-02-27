import { NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';

export async function GET() {
    try {
        await initDb();
        const [teamsRs, matchesRs, teamScoresRs, playerRankingsRs] = await Promise.all([
            db.execute('SELECT id, name FROM teams'),
            db.execute("SELECT * FROM matches WHERE is_published = 1 AND (is_test = false OR is_test IS NULL)"),
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
            `),
            db.execute(`
                SELECT 
                    p.name,
                    p.team_id,
                    SUM(combined.points) as total_points
                FROM (
                    SELECT s.player_id, s.score as points FROM scores s WHERE s.player_id IS NOT NULL
                    UNION ALL
                    SELECT hi.player_id, CASE WHEN hi.admin_score > 0 THEN hi.admin_score ELSE COALESCE(hi.initial_score, 0) END as points FROM hub_ideas hi
                ) combined
                JOIN players p ON combined.player_id = p.id
                GROUP BY p.id, p.name, p.team_id
                ORDER BY total_points DESC
                LIMIT 50
            `)
        ]);

        const teams = teamsRs.rows as any[];
        const matches = matchesRs.rows as any[];
        const teamScores = teamScoresRs.rows as any[];
        const playerRankings = playerRankingsRs.rows as any[];

        const leaderboard = teams.map(team => {
            let played = 0;
            let won = 0;
            let tied = 0;
            let lost = 0;
            let runsScored = 0;
            let oversFaced = 0;
            let runsConceded = 0;
            let oversBowled = 0;

            // Get base data from scores table for points
            const scoreData = teamScores.find(s => s.team_id === team.id);
            const totalPoints = scoreData ? scoreData.total_points : 0;
            const nrrBonus = scoreData ? scoreData.total_nrr_bonus : 0;

            matches.forEach(m => {
                // We only count standard LEAGUE matches for played/won/lost stats in the main table
                if (m.type !== 'LEAGUE') return;

                const isTeam1 = m.team1_id === team.id;
                const isTeam2 = m.team2_id === team.id;

                if (isTeam1 || isTeam2) {
                    played++;
                    if (m.winner_id === team.id) {
                        won++;
                    } else if (m.winner_id === null) {
                        tied++;
                    } else {
                        lost++;
                    }

                    // NRR Calculations for standard matches
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

            return {
                ...team,
                played,
                won,
                tied,
                lost,
                points: totalPoints,
                nrr: parseFloat(nrr.toFixed(3)),
                runsScored,
                runsConceded
            };
        });

        // Sort by Points, then NRR, then Won
        leaderboard.sort((a, b) => b.points - a.points || b.nrr - a.nrr || b.won - a.won);

        return NextResponse.json({
            teams: leaderboard,
            players: playerRankings
        });
    } catch (error) {
        console.error('Leaderboard error:', error);
        return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }
}
