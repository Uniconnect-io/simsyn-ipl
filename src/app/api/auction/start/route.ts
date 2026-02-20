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
    if (player.is_auctioned && player.team_id) {
      return NextResponse.json({ error: 'Player already sold to a team' }, { status: 400 });
    }

    // Check for any other active auction in the players table
    const activePlayerRs = await db.execute("SELECT * FROM players WHERE auction_status = 'ACTIVE'");
    const activePlayer = activePlayerRs.rows[0] as any;

    if (activePlayer) {
      // Force finalize any active auction
      console.log('Force finalizing active player:', activePlayer.id);

      const stmts = [];
      if (activePlayer.auction_current_bidder_id) {
        // Player SOLD
        stmts.push({
          sql: "UPDATE players SET auction_status = 'SOLD', team_id = ?, sold_price = ?, is_auctioned = 1 WHERE id = ?",
          args: [activePlayer.auction_current_bidder_id, activePlayer.auction_current_bid, activePlayer.id]
        });
        stmts.push({
          sql: 'UPDATE teams SET balance = balance - ? WHERE id = ?',
          args: [activePlayer.auction_current_bid, activePlayer.auction_current_bidder_id]
        });
      } else {
        // Player UNSOLD
        stmts.push({
          sql: "UPDATE players SET auction_status = 'UNSOLD', is_auctioned = 1 WHERE id = ?",
          args: [activePlayer.id]
        });
      }
      await db.batch(stmts, 'write');
    }

    // Start auction for the new player
    await db.execute({
      sql: `UPDATE players SET 
              auction_status = 'ACTIVE', 
              auction_current_bid = ?, 
              auction_current_bidder_id = NULL,
              auction_timer_end = NOW() + INTERVAL '30 seconds',
              is_auctioned = 1
            WHERE id = ?`,
      args: [player.min_bid, playerId]
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Start auction error:', error);
    return NextResponse.json({ error: 'Failed to start auction' }, { status: 500 });
  }
}
