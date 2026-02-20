import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auctionRs = await db.execute(`
      SELECT 
        p.id as "playerId", 
        p.name as "playerName",
        p.auction_current_bid as "currentBid", 
        p.auction_current_bidder_id as "currentBidderId", 
        p.auction_timer_end as "timerEnd", 
        p.auction_status as status,
        p.rating, 
        p.pool, 
        p.min_bid as "basePrice",
        p.tags,
        t.name as "currentBidderName"
      FROM players p
      LEFT JOIN teams t ON p.auction_current_bidder_id = t.id
      WHERE p.auction_status = 'ACTIVE'
    `);
    const auction = auctionRs.rows[0];

    if (!auction) {
      // Find next players to auction if none active
      const nextPlayersRs = await db.execute("SELECT * FROM players WHERE is_auctioned = 0 AND role = 'PLAYER' ORDER BY pool ASC, name ASC LIMIT 10");
      const nextPlayers = nextPlayersRs.rows;
      return NextResponse.json({ status: 'IDLE', nextPlayers });
    }

    return NextResponse.json(auction);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch auction status' }, { status: 500 });
  }
}
