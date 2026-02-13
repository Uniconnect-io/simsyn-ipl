import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST() {
    try {
        const now = new Date().toISOString();

        // Find active auctions that should have ended
        const auction = db.prepare("SELECT * FROM auctions WHERE status = 'ACTIVE' AND timer_end < ?").get(now) as any;

        if (!auction) {
            return NextResponse.json({ message: 'No auctions to finalize' });
        }

        const transaction = db.transaction(() => {
            if (auction.current_bidder_id) {
                // Player SOLD
                db.prepare("UPDATE auctions SET status = 'SOLD' WHERE id = ?").run(auction.id);
                db.prepare('UPDATE players SET team_id = ?, sold_price = ?, is_auctioned = 1 WHERE id = ?')
                    .run(auction.current_bidder_id, auction.current_bid, auction.player_id);
                db.prepare('UPDATE teams SET balance = balance - ? WHERE id = ?')
                    .run(auction.current_bid, auction.current_bidder_id);
            } else {
                // Player UNSOLD
                db.prepare("UPDATE auctions SET status = 'UNSOLD' WHERE id = ?").run(auction.id);
                db.prepare('UPDATE players SET is_auctioned = 0 WHERE id = ?').run(auction.player_id);
            }
        });

        transaction();

        return NextResponse.json({ success: true, status: auction.current_bidder_id ? 'SOLD' : 'UNSOLD' });
    } catch (error) {
        console.error('Finalize auction error:', error);
        return NextResponse.json({ error: 'Failed to finalize auction' }, { status: 500 });
    }
}
