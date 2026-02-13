import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const matches = db.prepare(`
      SELECT 
        m.*, 
        t1.name as team1Name, 
        t2.name as team2Name,
        w.name as winnerName
      FROM matches m
      LEFT JOIN teams t1 ON m.team1_id = t1.id
      LEFT JOIN teams t2 ON m.team2_id = t2.id
      LEFT JOIN teams w ON m.winner_id = w.id
      ORDER BY m.date ASC, m.id ASC
    `).all();

    return NextResponse.json(matches);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 });
  }
}
