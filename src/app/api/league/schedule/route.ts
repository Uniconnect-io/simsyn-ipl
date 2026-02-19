import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const rs = await db.execute(`
      SELECT 
        m.id, m.date, m.start_time, m.status, m.type, m.score1, m.score2,
        t1.name as team1Name, 
        t2.name as team2Name,
        w.name as winnerName,
        m.title, m.description, m.type as battle_type, p.name as conductorName
      FROM matches m
      LEFT JOIN teams t1 ON m.team1_id = t1.id
      LEFT JOIN teams t2 ON m.team2_id = t2.id
      LEFT JOIN teams w ON m.winner_id = w.id
      LEFT JOIN players p ON m.conductor_id = p.id
      ORDER BY m.date ASC, m.id ASC
    `);

    const matches = rs.rows;

    return NextResponse.json(matches);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 });
  }
}
