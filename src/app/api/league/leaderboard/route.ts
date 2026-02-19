import { NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';

export async function GET() {
    try {
        await initDb();
        const [teamsRs, matchesRs, teamScoresRs, playerRankingsRs] = await Promise.all([
            db.execute('SELECT id, name FROM teams'),
            db.execute("SELECT * FROM matches WHERE is_published = 1"),
            db.execute(`
                SELECT 
                    team_id, 
                    SUM(points) as total_points, 
                    SUM(nrr_contribution) as total_nrr_bonus
                FROM scores
                GROUP BY team_id
            `),
            db.execute(`
                SELECT 
                    p.name,
                    p.team_id,
                    SUM(s.score) as total_points
                FROM scores s
                JOIN players p ON s.player_id = p.id
                WHERE s.player_id IS NOT NULL
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
