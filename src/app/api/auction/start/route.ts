import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { playerId } = await request.json();

    if (!playerId) {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 });
    }

    // Check if player is already auctioned or being auctioned
    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId) as any;
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }
    if (player.is_auctioned) {
      return NextResponse.json({ error: 'Player already auctioned' }, { status: 400 });
    }

    // Check for any other active auction
    const activeAuction = db.prepare("SELECT * FROM auctions WHERE status = 'ACTIVE'").get() as any;
    if (activeAuction) {
      const now = new Date();
      if (activeAuction.timer_end && new Date(activeAuction.timer_end) < now) {
        // Auction is stuck/expired, running cleanup
        console.log('Found stuck auction, finalizing:', activeAuction.id);

        // Finalize logic inline to ensure atomicity before starting new one
        const transaction = db.transaction(() => {
          if (activeAuction.current_bidder_id) {
            // Player SOLD
            db.prepare("UPDATE auctions SET status = 'SOLD' WHERE id = ?").run(activeAuction.id);
            db.prepare('UPDATE players SET team_id = ?, sold_price = ?, is_auctioned = 1 WHERE id = ?')
              .run(activeAuction.current_bidder_id, activeAuction.current_bid, activeAuction.player_id);
            db.prepare('UPDATE teams SET balance = balance - ? WHERE id = ?')
              .run(activeAuction.current_bid, activeAuction.current_bidder_id);
          } else {
            // Player UNSOLD
            db.prepare("UPDATE auctions SET status = 'UNSOLD' WHERE id = ?").run(activeAuction.id);
            db.prepare('UPDATE players SET is_auctioned = 0 WHERE id = ?').run(activeAuction.player_id);
          }
        });
        transaction();
      } else {
        return NextResponse.json({ error: 'Another auction is currently active' }, { status: 400 });
      }
    }

    // Clear any existing auction record for this player (re-auction logic)
    db.prepare('DELETE FROM auctions WHERE player_id = ?').run(playerId);

    const timerEnd = new Date(Date.now() + 30 * 1000).toISOString();

    const insertAuction = db.prepare(`
      INSERT INTO auctions (id, player_id, current_bid, status, timer_end) 
      VALUES (?, ?, ?, 'ACTIVE', ?)
    `);

    const markSelected = db.prepare('UPDATE players SET is_auctioned = 1 WHERE id = ?');

    const transaction = db.transaction(() => {
      insertAuction.run(crypto.randomUUID(), playerId, player.min_bid, timerEnd);
      markSelected.run(playerId);
    });

    transaction();

    return NextResponse.json({ success: true, timer_end: timerEnd });
  } catch (error) {
    console.error('Start auction error:', error);
    return NextResponse.json({ error: 'Failed to start auction' }, { status: 500 });
  }
}
