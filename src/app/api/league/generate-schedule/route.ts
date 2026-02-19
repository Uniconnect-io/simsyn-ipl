import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST() {
  try {
    const teamsRs = await db.execute('SELECT id FROM teams');
    const teams = teamsRs.rows as unknown as { id: string }[];
    if (teams.length < 2) { // Allow testing with fewer teams, though 6 is ideal
      // But keeping it robust
    }

    // Check if we have enough teams for a proper league
    if (teams.length < 4) {
      // minimal logic just in case
    }

    const teamIds = teams.map(t => t.id);

    // Clear existing matches
    await db.execute('DELETE FROM matches');

    // Round Robin (Circle Algorithm)
    const n = teamIds.length;
    // If odd number of teams, add a dummy
    const isOdd = n % 2 === 1;
    const finalTeams = isOdd ? [...teamIds, 'BYE'] : [...teamIds];
    const numTeams = finalTeams.length;
    const rounds = numTeams - 1;
    const matchesPerRound = numTeams / 2;

    const currentTeams = [...finalTeams];
    const leagueMatches: { team1: string; team2: string; round: number }[] = [];

    for (let round = 1; round <= rounds; round++) {
      for (let i = 0; i < matchesPerRound; i++) {
        const t1 = currentTeams[i];
        const t2 = currentTeams[numTeams - 1 - i];

        if (t1 !== 'BYE' && t2 !== 'BYE') {
          leagueMatches.push({ team1: t1, team2: t2, round });
        }
      }
      // Rotate teams (keep first team fixed)
      const last = currentTeams.pop();
      currentTeams.splice(1, 0, last!);
    }

    // Assign Dates - All matches in a round happen on the same day
    // Specific dates provided by user

    interface MatchData {
      id: string;
      team1_id: string | null;
      team2_id: string | null;
      date: string;
      type: string;
      month: number;
      case_description?: string;
    }

    const finalMatches: MatchData[] = [];

    // Define specific match dates for each round
    const roundDates = [
      new Date('2026-03-24T14:00:00'), // Round 1 - March 24
      new Date('2026-04-28T14:00:00'), // Round 2 - April 28
      new Date('2026-05-26T14:00:00'), // Round 3 - May 26
      new Date('2026-06-23T14:00:00'), // Round 4 - June 23
      new Date('2026-07-21T14:00:00'), // Round 5 - July 21
    ];

    for (let round = 1; round <= rounds; round++) {
      const roundMatches = leagueMatches.filter(m => m.round === round);
      const matchDate = roundDates[round - 1];

      // All matches in this round happen on the same day, just different times
      roundMatches.forEach((m, index) => {
        // Space matches by 2 hours: 2 PM, 4 PM, 6 PM
        const matchTime = new Date(matchDate);
        matchTime.setHours(matchDate.getHours() + (index * 2));

        finalMatches.push({
          id: crypto.randomUUID(),
          team1_id: m.team1,
          team2_id: m.team2,
          date: matchTime.toISOString(),
          type: 'LEAGUE',
          month: matchDate.getMonth() + 1
        });
      });
    }

    // Playoffs - Specific dates
    const playoffs = [
      { name: 'Qualifier 1', type: 'QUALIFIER1', date: '2026-08-18T14:00:00', desc: 'Rank 1 vs Rank 2' },
      { name: 'Eliminator', type: 'ELIMINATOR', date: '2026-08-18T18:00:00', desc: 'Rank 3 vs Rank 4' },
      { name: 'Qualifier 2', type: 'QUALIFIER2', date: '2026-09-22T18:00:00', desc: 'Loser Q1 vs Winner Eliminator' },
      { name: 'Final', type: 'FINAL', date: '2026-11-17T18:00:00', desc: 'Winner Q1 vs Winner Q2' }
    ];

    for (const p of playoffs) {
      finalMatches.push({
        id: crypto.randomUUID(),
        team1_id: null,
        team2_id: null,
        date: new Date(p.date).toISOString(),
        type: p.type,
        month: new Date(p.date).getMonth() + 1,
        case_description: p.desc
      });
    }

    const stmts = finalMatches.map(m => ({
      sql: `INSERT INTO matches (id, team1_id, team2_id, status, start_time, type, case_description) VALUES (?, ?, ?, 'SCHEDULED', ?, ?, ?)`,
      args: [
        m.id,
        m.team1_id,
        m.team2_id,
        m.date, // m.date is already ISO string/start_time
        m.type,
        m.case_description || null
      ]
    }));

    if (stmts.length > 0) {
      await db.batch(stmts, 'write');
    }

    return NextResponse.json({ success: true, count: finalMatches.length });
  } catch (error) {
    console.error('Schedule generation error:', error);
    return NextResponse.json({ error: 'Failed to generate schedule' }, { status: 500 });
  }
}
