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

    const auctionRs = await db.execute({
      sql: "SELECT * FROM auctions WHERE player_id = ? AND status = 'ACTIVE'",
      args: [playerId]
    });
    const auction = auctionRs.rows[0] as any;

    if (!auction) {
      return NextResponse.json({ error: 'No active auction for this player' }, { status: 404 });
    }

    // Check timer
    const now = new Date();
    if (auction.timer_end && new Date(auction.timer_end) < now) {
      return NextResponse.json({ error: 'Auction has ended' }, { status: 400 });
    }

    // Check if bid is higher
    // Check if bid is valid
    // If no bidder yet, bid must be >= current_bid (which is min_bid)
    // If bidder exists, bid must be > current_bid
    if (auction.current_bidder_id) {
      if (amount <= auction.current_bid) {
        return NextResponse.json({ error: 'Bid must be higher than current bid' }, { status: 400 });
      }
    } else {
      if (amount < auction.current_bid) {
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

    // Update auction and timer
    const timerEnd = new Date(Date.now() + 30 * 1000).toISOString();

    await db.batch([
      {
        sql: `UPDATE auctions SET current_bid = ?, current_bidder_id = ?, timer_end = ? WHERE id = ?`,
        args: [amount, teamId, timerEnd, auction.id]
      },
      {
        sql: `INSERT INTO bids (id, player_id, team_id, amount) VALUES (?, ?, ?, ?)`,
        args: [crypto.randomUUID(), playerId, teamId, amount]
      }
    ], 'write');

    return NextResponse.json({ success: true, timer_end: timerEnd });
  } catch (error) {
    console.error('Bidding error:', error);
    return NextResponse.json({ error: 'Failed to place bid' }, { status: 500 });
  }
}
