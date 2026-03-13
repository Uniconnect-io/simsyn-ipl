import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
    try {
        let force = false;
        let playerId: string | null = null;
        try {
            const body = await request.json();
            force = !!body.force;
            playerId = body.playerId || null;
        } catch (e) {
            // No body or invalid JSON
        }

        // Atomic finalization using a single CTE to prevent race conditions.
        // We use FOR UPDATE SKIP LOCKED to ensure only one request can process a specific player at a time.
        const sql = `
            WITH selected_player AS (
                SELECT id, auction_current_bidder_id, auction_current_bid
                FROM players
                WHERE auction_status = 'ACTIVE' 
                AND (CASE WHEN ? THEN true ELSE auction_timer_end < NOW() END)
                AND (CASE WHEN ?::UUID IS NOT NULL THEN id = ?::UUID ELSE true END)
                LIMIT 1
                FOR UPDATE SKIP LOCKED
            ),
            update_sold AS (
                UPDATE players p
                SET auction_status = 'SOLD',
                    team_id = s.auction_current_bidder_id,
                    sold_price = s.auction_current_bid,
                    is_auctioned = 1
                FROM selected_player s
                WHERE p.id = s.id AND s.auction_current_bidder_id IS NOT NULL
                RETURNING p.id, p.team_id as bidder_id
            ),
            update_unsold AS (
                UPDATE players p
                SET auction_status = 'UNSOLD',
                    is_auctioned = 1
                FROM selected_player s
                WHERE p.id = s.id AND s.auction_current_bidder_id IS NULL
                RETURNING p.id
            ),
            balance_deduction AS (
                UPDATE teams t
                SET balance = balance - s.auction_current_bid
                FROM selected_player s
                JOIN update_sold us ON s.id = us.id
                WHERE t.id = s.auction_current_bidder_id
            ),
            score_update AS (
                UPDATE scores sc
                SET team_id = us.bidder_id
                FROM update_sold us
                WHERE sc.player_id = us.id AND sc.team_id IS NULL
            )
            SELECT 
                s.id, 
                CASE 
                    WHEN us.id IS NOT NULL THEN 'SOLD' 
                    WHEN uu.id IS NOT NULL THEN 'UNSOLD' 
                    ELSE NULL 
                END as status
            FROM selected_player s
            LEFT JOIN update_sold us ON s.id = us.id
            LEFT JOIN update_unsold uu ON s.id = uu.id;
        `;

        const result = await db.execute({ sql, args: [force, playerId, playerId] });
        
        if (!result.rows || result.rows.length === 0) {
            return NextResponse.json({ message: 'No auctions to finalize' });
        }

        const finalized = result.rows[0];
        return NextResponse.json({ 
            success: true, 
            status: finalized.status,
            playerId: finalized.id
        });
    } catch (error) {
        console.error('Finalize auction error:', error);
        return NextResponse.json({ error: 'Failed to finalize auction' }, { status: 500 });
    }
}
