import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
    try {
        const { playerId, minBid } = await request.json();

        if (!playerId || minBid === undefined) {
            return NextResponse.json({ error: 'Player ID and Minimum Bid are required' }, { status: 400 });
        }

        const update = db.prepare('UPDATE players SET min_bid = ? WHERE id = ?');

        try {
            update.run(minBid, playerId);
            return NextResponse.json({ success: true });
        } catch (dbError) {
            return NextResponse.json({ error: 'Failed to update player' }, { status: 500 });
        }

    } catch (error) {
        console.error('Update player error:', error);
        return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
    }
}
