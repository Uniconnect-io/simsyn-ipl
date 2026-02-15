import { NextResponse } from 'next/server';
import db from '@/lib/db';
import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchId } = await params;

    const matchRs = await db.execute({
      sql: `
      SELECT 
        m.*, 
        t1.name as team1Name, 
        t2.name as team2Name,
        w.name as winnerName
      FROM matches m
      JOIN teams t1 ON m.team1_id = t1.id
      JOIN teams t2 ON m.team2_id = t2.id
      LEFT JOIN teams w ON m.winner_id = w.id
      WHERE m.id = ?
    `,
      args: [matchId]
    });
    const match = matchRs.rows[0] as any;

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Add raw ideas for review
    const [ideas1Rs, ideas2Rs] = await Promise.all([
      db.execute({
        sql: 'SELECT * FROM battle_ideas WHERE match_id = ? AND team_id = ? ORDER BY created_at ASC',
        args: [matchId, match.team1_id]
      }),
      db.execute({
        sql: 'SELECT * FROM battle_ideas WHERE match_id = ? AND team_id = ? ORDER BY created_at ASC',
        args: [matchId, match.team2_id]
      })
    ]);

    const ideas1 = ideas1Rs.rows;
    const ideas2 = ideas2Rs.rows;

    return NextResponse.json({
      ...match,
      ideas1,
      ideas2
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch match' }, { status: 500 });
  }
}

async function generateSummary(teamName: string, ideas: string[]) {
  if (!openai || ideas.length === 0) return "No significant contributions recorded.";

  const prompt = `Summarize the following innovative ideas submitted by Team ${teamName} during a business battle. Highlight the core themes and unique strengths of their approach in 2-3 concise sentences.\n\nIdeas:\n- ${ideas.join('\n- ')}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a professional business consultant summarizing innovation ideas." },
      { role: "user", content: prompt }
    ],
  });

  return response.choices[0].message.content;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchId } = await params;
    const { score1, score2, winnerId, caseDescription, status, team1_summary, team2_summary, team1_bonus, team2_bonus } = await request.json();

    // IMMUTABILITY CHECK
    // IMMUTABILITY CHECK
    const currentMatchRs = await db.execute({
      sql: 'SELECT status FROM matches WHERE id = ?',
      args: [matchId]
    });
    const currentMatch = currentMatchRs.rows[0] as any;

    if (currentMatch?.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Completed matches cannot be edited.' }, { status: 403 });
    }

    let finalTeam1Summary = team1_summary;
    let finalTeam2Summary = team2_summary;

    // Trigger summarization if moving to REVIEW_PENDING or COMPLETED and summaries are missing
    if ((status === 'REVIEW_PENDING' || status === 'COMPLETED') && (!team1_summary || !team2_summary)) {
      const dbMatchRs = await db.execute({
        sql: 'SELECT team1_id, team2_id, team1_summary, team2_summary FROM matches WHERE id = ?',
        args: [matchId]
      });
      const dbMatch = dbMatchRs.rows[0] as any;

      const [team1NameRs, team2NameRs, ideas1Rs, ideas2Rs] = await Promise.all([
        db.execute({ sql: 'SELECT name FROM teams WHERE id = ?', args: [dbMatch.team1_id] }),
        db.execute({ sql: 'SELECT name FROM teams WHERE id = ?', args: [dbMatch.team2_id] }),
        db.execute({ sql: 'SELECT content FROM battle_ideas WHERE match_id = ? AND team_id = ?', args: [matchId, dbMatch.team1_id] }),
        db.execute({ sql: 'SELECT content FROM battle_ideas WHERE match_id = ? AND team_id = ?', args: [matchId, dbMatch.team2_id] })
      ]);

      const team1Name = team1NameRs.rows[0] as any;
      const team2Name = team2NameRs.rows[0] as any;
      const ideas1 = ideas1Rs.rows.map((i: any) => i.content as string);
      const ideas2 = ideas2Rs.rows.map((i: any) => i.content as string);

      if (!finalTeam1Summary && !dbMatch.team1_summary) {
        finalTeam1Summary = await generateSummary(team1Name.name, ideas1);
      } else if (!finalTeam1Summary) {
        finalTeam1Summary = dbMatch.team1_summary;
      }

      if (!finalTeam2Summary && !dbMatch.team2_summary) {
        finalTeam2Summary = await generateSummary(team2Name.name, ideas2);
      } else if (!finalTeam2Summary) {
        finalTeam2Summary = dbMatch.team2_summary;
      }
    }

    await db.execute({
      sql: `
      UPDATE matches 
      SET 
        score1 = ?, 
        score2 = ?, 
        winner_id = ?, 
        case_description = ?, 
        status = ?, 
        team1_summary = ?, 
        team2_summary = ?,
        team1_bonus = ?,
        team2_bonus = ?
      WHERE id = ?
      `,
      args: [
        score1,
        score2,
        winnerId,
        caseDescription,
        status,
        finalTeam1Summary,
        finalTeam2Summary,
        team1_bonus || 0,
        team2_bonus || 0,
        matchId
      ]
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Match update error:', error);
    return NextResponse.json({ error: 'Failed to update match' }, { status: 500 });
  }
}
