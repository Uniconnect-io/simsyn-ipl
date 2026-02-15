import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { playerId } = await request.json();

    if (!playerId) {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 });
    }

    // Check if player is already auctioned or being auctioned
    const playerRs = await db.execute({
      sql: 'SELECT * FROM players WHERE id = ?',
      args: [playerId]
    });
    const player = playerRs.rows[0] as any;

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }
    if (player.is_auctioned) {
      return NextResponse.json({ error: 'Player already auctioned' }, { status: 400 });
    }

    // Check for any other active auction
    const activeAuctionRs = await db.execute("SELECT * FROM auctions WHERE status = 'ACTIVE'");
    const activeAuction = activeAuctionRs.rows[0] as any;

    if (activeAuction) {
      const now = new Date();
      if (activeAuction.timer_end && new Date(activeAuction.timer_end) < now) {
        // Auction is stuck/expired, running cleanup
        console.log('Found stuck auction, finalizing:', activeAuction.id);

        const stmts = [];
        if (activeAuction.current_bidder_id) {
          // Player SOLD
          stmts.push({
            sql: "UPDATE auctions SET status = 'SOLD' WHERE id = ?",
            args: [activeAuction.id]
          });
          stmts.push({
            sql: 'UPDATE players SET team_id = ?, sold_price = ?, is_auctioned = 1 WHERE id = ?',
            args: [activeAuction.current_bidder_id, activeAuction.current_bid, activeAuction.player_id]
          });
          stmts.push({
            sql: 'UPDATE teams SET balance = balance - ? WHERE id = ?',
            args: [activeAuction.current_bid, activeAuction.current_bidder_id]
          });
        } else {
          // Player UNSOLD
          stmts.push({
            sql: "UPDATE auctions SET status = 'UNSOLD' WHERE id = ?",
            args: [activeAuction.id]
          });
          stmts.push({
            sql: 'UPDATE players SET is_auctioned = 0 WHERE id = ?',
            args: [activeAuction.player_id]
          });
        }
        await db.batch(stmts, 'write');
      } else {
        return NextResponse.json({ error: 'Another auction is currently active' }, { status: 400 });
      }
    }

    // Clear any existing auction record for this player (re-auction logic)
    await db.execute({
      sql: 'DELETE FROM auctions WHERE player_id = ?',
      args: [playerId]
    });

    const timerEnd = new Date(Date.now() + 30 * 1000).toISOString();

    await db.batch([
      {
        sql: `INSERT INTO auctions (id, player_id, current_bid, status, timer_end) VALUES (?, ?, ?, 'ACTIVE', ?)`,
        args: [crypto.randomUUID(), playerId, player.min_bid, timerEnd]
      },
      {
        sql: 'UPDATE players SET is_auctioned = 1 WHERE id = ?',
        args: [playerId]
      }
    ], 'write');

    return NextResponse.json({ success: true, timer_end: timerEnd });
  } catch (error) {
    console.error('Start auction error:', error);
    return NextResponse.json({ error: 'Failed to start auction' }, { status: 500 });
  }
}
