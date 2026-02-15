import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST() {
    try {
        const now = new Date().toISOString();

        // Find active auctions that should have ended
        // Find active auctions that should have ended
        const auctionRs = await db.execute({
            sql: "SELECT * FROM auctions WHERE status = 'ACTIVE' AND timer_end < ?",
            args: [now]
        });
        const auction = auctionRs.rows[0] as any;

        if (!auction) {
            return NextResponse.json({ message: 'No auctions to finalize' });
        }

        const stmts = [];
        if (auction.current_bidder_id) {
            // Player SOLD
            stmts.push({
                sql: "UPDATE auctions SET status = 'SOLD' WHERE id = ?",
                args: [auction.id]
            });
            stmts.push({
                sql: 'UPDATE players SET team_id = ?, sold_price = ?, is_auctioned = 1 WHERE id = ?',
                args: [auction.current_bidder_id, auction.current_bid, auction.player_id]
            });
            stmts.push({
                sql: 'UPDATE teams SET balance = balance - ? WHERE id = ?',
                args: [auction.current_bid, auction.current_bidder_id]
            });
        } else {
            // Player UNSOLD
            stmts.push({
                sql: "UPDATE auctions SET status = 'UNSOLD' WHERE id = ?",
                args: [auction.id]
            });
            stmts.push({
                sql: 'UPDATE players SET is_auctioned = 0 WHERE id = ?',
                args: [auction.player_id]
            });
        }
        await db.batch(stmts, 'write');

        return NextResponse.json({ success: true, status: auction.current_bidder_id ? 'SOLD' : 'UNSOLD' });
    } catch (error) {
        console.error('Finalize auction error:', error);
        return NextResponse.json({ error: 'Failed to finalize auction' }, { status: 500 });
    }
}
