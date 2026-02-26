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

    // Fetch player points and rank
    const pRankingsRs = await db.execute(`
        SELECT p.id, SUM(combined.points) as total_points
        FROM (
            SELECT s.player_id, s.score as points FROM scores s WHERE s.player_id IS NOT NULL
            UNION ALL
            SELECT hi.player_id, CASE WHEN hi.admin_score > 0 THEN hi.admin_score ELSE COALESCE(hi.initial_score, 0) END as points FROM hub_ideas hi
        ) combined
        JOIN players p ON combined.player_id = p.id
        GROUP BY p.id
        ORDER BY total_points DESC
    `);

    const rankings = pRankingsRs.rows as any[];
    const pIndex = rankings.findIndex((r: any) => r.id === auction.playerId);
    auction.points = pIndex !== -1 ? rankings[pIndex].total_points : 0;
    auction.rank = pIndex !== -1 ? pIndex + 1 : '-';

    return NextResponse.json(auction);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch auction status' }, { status: 500 });
  }
}
