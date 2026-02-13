import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { playerId, teamId, amount } = await request.json();

    if (!playerId || !teamId || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const auction = db.prepare("SELECT * FROM auctions WHERE player_id = ? AND status = 'ACTIVE'").get(playerId) as any;
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
    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId) as any;
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }
    if (team.balance < amount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // Update auction and timer
    const timerEnd = new Date(Date.now() + 30 * 1000).toISOString();

    const updateAuction = db.prepare(`
      UPDATE auctions 
      SET current_bid = ?, current_bidder_id = ?, timer_end = ? 
      WHERE id = ?
    `);

    const insertBid = db.prepare(`
      INSERT INTO bids (id, player_id, team_id, amount) 
      VALUES (?, ?, ?, ?)
    `);

    const transaction = db.transaction(() => {
      updateAuction.run(amount, teamId, timerEnd, auction.id);
      insertBid.run(crypto.randomUUID(), playerId, teamId, amount);
    });

    transaction();

    return NextResponse.json({ success: true, timer_end: timerEnd });
  } catch (error) {
    console.error('Bidding error:', error);
    return NextResponse.json({ error: 'Failed to place bid' }, { status: 500 });
  }
}
