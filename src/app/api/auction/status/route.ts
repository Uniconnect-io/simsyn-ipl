import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const auctionRs = await db.execute(`
      SELECT 
        a.id, 
        a.player_id as playerId, 
        a.current_bid as currentBid, 
        a.current_bidder_id as currentBidderId, 
        a.timer_end as timerEnd, 
        a.status,
        p.name as playerName, 
        p.rating, 
        p.pool, 
        p.min_bid as basePrice,
        p.tags,
        t.name as currentBidderName
      FROM auctions a
      JOIN players p ON a.player_id = p.id
      LEFT JOIN teams t ON a.current_bidder_id = t.id
      WHERE a.status = 'ACTIVE'
    `);
    const auction = auctionRs.rows[0];

    if (!auction) {
      // Find next player to auction if none active
      const nextPlayerRs = await db.execute("SELECT * FROM players WHERE is_auctioned = 0 LIMIT 1");
      const nextPlayer = nextPlayerRs.rows[0];
      return NextResponse.json({ status: 'IDLE', nextPlayer });
    }

    return NextResponse.json(auction);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch auction status' }, { status: 500 });
  }
}
