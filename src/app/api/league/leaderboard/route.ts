import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
    try {
        const [teamsRs, matchesRs] = await Promise.all([
            db.execute('SELECT id, name FROM teams'),
            db.execute("SELECT * FROM matches WHERE is_published = 1 OR status = 'IN_PROGRESS'")
        ]);

        const teams = teamsRs.rows as any[];
        const matches = matchesRs.rows as any[];

        const leaderboard = teams.map(team => {
            let played = 0;
            let won = 0;
            let tied = 0;
            let lost = 0;
            let points = 0;
            let runsScored = 0;
            let oversFaced = 0;
            let runsConceded = 0;
            let oversBowled = 0;

            matches.forEach(m => {
                const isTeam1 = m.team1_id === team.id;
                const isTeam2 = m.team2_id === team.id;

                if (isTeam1 || isTeam2) {
                    if (m.status === 'COMPLETED') {
                        played++;
                        if (m.winner_id === team.id) {
                            won++;
                            points += 2;
                        } else if (m.winner_id === null) {
                            tied++;
                            points += 1;
                        } else {
                            lost++;
                        }
                    }

                    // NRR Calculations (Including IN_PROGRESS matches for live updates)
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
            const nrr = runsPerOverScored - runsPerOverConceded;

            return {
                ...team,
                played,
                won,
                tied,
                lost,
                points,
                nrr: parseFloat(nrr.toFixed(3)),
                runsScored,
                runsConceded
            };
        });

        // Sort by Points, then NRR, then Won
        leaderboard.sort((a, b) => b.points - a.points || b.nrr - a.nrr || b.won - a.won);

        return NextResponse.json(leaderboard);
    } catch (error) {
        console.error('Leaderboard error:', error);
        return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }
}
