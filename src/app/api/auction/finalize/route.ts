import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
    try {
        let force = false;
        try {
            const body = await request.json();
            force = body.force;
        } catch (e) {
            // No body or invalid JSON
        }

        // Find active auction in players table
        const sql = force
            ? "SELECT * FROM players WHERE auction_status = 'ACTIVE' LIMIT 1"
            : "SELECT * FROM players WHERE auction_status = 'ACTIVE' AND auction_timer_end < NOW() LIMIT 1";

        const playerRs = await db.execute(sql);
        const player = playerRs.rows[0] as any;

        if (!player) {
            return NextResponse.json({ message: 'No auctions to finalize' });
        }

        const stmts = [];
        if (player.auction_current_bidder_id) {
            // Player SOLD
            stmts.push({
                sql: "UPDATE players SET auction_status = 'SOLD', team_id = ?, sold_price = ?, is_auctioned = 1 WHERE id = ?",
                args: [player.auction_current_bidder_id, player.auction_current_bid, player.id]
            });
            stmts.push({
                sql: 'UPDATE teams SET balance = balance - ? WHERE id = ?',
                args: [player.auction_current_bid, player.auction_current_bidder_id]
            });
            // Update scores table with the team id where player id is the auctioned player and team id is null
            stmts.push({
                sql: 'UPDATE scores SET team_id = ? WHERE player_id = ? AND team_id IS NULL',
                args: [player.auction_current_bidder_id, player.id]
            });
        } else {
            // Player UNSOLD
            stmts.push({
                sql: "UPDATE players SET auction_status = 'UNSOLD', is_auctioned = 1 WHERE id = ?",
                args: [player.id]
            });
        }
        await db.batch(stmts, 'write');

        return NextResponse.json({ success: true, status: player.auction_current_bidder_id ? 'SOLD' : 'UNSOLD' });
    } catch (error) {
        console.error('Finalize auction error:', error);
        return NextResponse.json({ error: 'Failed to finalize auction' }, { status: 500 });
    }
}
