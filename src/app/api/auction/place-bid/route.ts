import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { playerId, teamId, amount } = await request.json();

    if (!playerId || !teamId || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Authorization: User must be an ADMIN or the Captain of the specific teamId
    if (session.user.role !== 'ADMIN') {
      // Always fetch the latest team_id from the database to avoid stale session issues
      const ownerRs = await db.execute({
        sql: "SELECT team_id FROM players WHERE id = ? AND role = 'OWNER'",
        args: [session.user.id]
      });
      const dbTeamId = ownerRs.rows[0]?.team_id;

      if (dbTeamId !== teamId) {
        return NextResponse.json({ error: 'Forbidden: You can only bid for your own team' }, { status: 403 });
      }
    }

    const playerRs = await db.execute({
      sql: "SELECT * FROM players WHERE id = ? AND auction_status = 'ACTIVE'",
      args: [playerId]
    });
    const player = playerRs.rows[0] as any;

    if (!player) {
      return NextResponse.json({ error: 'No active auction for this player' }, { status: 404 });
    }

    // Check timer
    const now = new Date();
    if (player.auction_timer_end && new Date(player.auction_timer_end) < now) {
      return NextResponse.json({ error: 'Auction has ended' }, { status: 400 });
    }

    // Check if bid is valid
    if (player.auction_current_bidder_id) {
      if (amount <= player.auction_current_bid) {
        return NextResponse.json({ error: 'Bid must be higher than current bid' }, { status: 400 });
      }
    } else {
      if (amount < player.auction_current_bid) {
        return NextResponse.json({ error: 'Bid must be at least the base price' }, { status: 400 });
      }
    }

    // Check team balance
    const teamRs = await db.execute({
      sql: 'SELECT * FROM teams WHERE id = ?',
      args: [teamId]
    });
    const team = teamRs.rows[0] as any;

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }
    if (team.balance < amount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // Check team size limit (max 5 players excluding captain/owner)
    const playerCountRs = await db.execute({
      sql: "SELECT COUNT(*) as count FROM players WHERE team_id = ? AND role = 'PLAYER'",
      args: [teamId]
    });
    const playerCount = (playerCountRs.rows[0] as any).count;
    if (playerCount >= 5) {
      return NextResponse.json({ error: 'Team is full (Max 5 players + Captain)' }, { status: 400 });
    }

    // Update player auction status and timer
    await db.batch([
      {
        sql: `UPDATE players SET 
                auction_current_bid = ?, 
                auction_current_bidder_id = ?, 
                auction_timer_end = NOW() + INTERVAL '30 seconds' 
              WHERE id = ?`,
        args: [amount, teamId, playerId]
      },
      {
        sql: `INSERT INTO bids (id, player_id, team_id, amount) VALUES (?, ?, ?, ?)`,
        args: [crypto.randomUUID(), playerId, teamId, amount]
      }
    ], 'write');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Bidding error:', error);
    return NextResponse.json({ error: 'Failed to place bid' }, { status: 500 });
  }
}
