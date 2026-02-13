import { NextResponse } from 'next/server';
import db from '@/lib/db';
import crypto from 'crypto';

export async function POST(request: Request) {
    try {
        const { name, rating, pool, min_bid } = await request.json();

        const id = 'p' + crypto.randomBytes(4).toString('hex');

        db.prepare(`
            INSERT INTO players (id, name, rating, pool, min_bid, is_auctioned)
            VALUES (?, ?, ?, ?, ?, 0)
        `).run(id, name, rating, pool, min_bid);

        return NextResponse.json({ success: true, id });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to add player' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        // Ensure player isn't already auctioned
        const player = db.prepare('SELECT is_auctioned FROM players WHERE id = ?').get(id) as any;
        if (player?.is_auctioned) {
            return NextResponse.json({ error: 'Cannot delete auctioned player' }, { status: 400 });
        }

        db.prepare('DELETE FROM players WHERE id = ?').run(id);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete player' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const { id, team_id, action, refund } = await request.json();

        if (action === 'release') {
            const player: any = db.prepare('SELECT team_id, sold_price FROM players WHERE id = ?').get(id);

            if (refund && player?.team_id && player?.sold_price) {
                db.prepare('UPDATE teams SET balance = balance + ? WHERE id = ?').run(player.sold_price, player.team_id);
            }

            db.prepare('UPDATE players SET team_id = NULL, is_auctioned = 0, sold_price = NULL WHERE id = ?').run(id);
        } else if (action === 'assign') {
            db.prepare('UPDATE players SET team_id = ?, is_auctioned = 1 WHERE id = ?').run(team_id, id);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update player' }, { status: 500 });
    }
}
