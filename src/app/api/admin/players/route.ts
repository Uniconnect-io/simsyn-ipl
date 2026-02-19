import { NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';
import crypto from 'crypto';

export async function POST(request: Request) {
    try {
        await initDb();
        const { name, rating, pool, min_bid } = await request.json();

        const id = 'p' + crypto.randomBytes(4).toString('hex');

        await db.execute({
            sql: `
            INSERT INTO players (id, name, rating, pool, min_bid, is_auctioned)
            VALUES (?, ?, ?, ?, ?, 0)
        `,
            args: [id, name, rating, pool, min_bid]
        });

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
        const playerRs = await db.execute({
            sql: 'SELECT is_auctioned FROM players WHERE id = ?',
            args: [id]
        });
        const player = playerRs.rows[0] as any;

        if (player?.is_auctioned) {
            return NextResponse.json({ error: 'Cannot delete auctioned player' }, { status: 400 });
        }

        await db.execute({
            sql: 'DELETE FROM players WHERE id = ?',
            args: [id]
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete player' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const { id, team_id, action, refund } = await request.json();

        if (action === 'release') {
            const playerRs = await db.execute({
                sql: 'SELECT team_id, sold_price FROM players WHERE id = ?',
                args: [id]
            });
            const player = playerRs.rows[0] as any;

            if (refund && player?.team_id && player?.sold_price) {
                await db.execute({
                    sql: 'UPDATE teams SET balance = balance + ? WHERE id = ?',
                    args: [player.sold_price, player.team_id]
                });
            }

            await db.execute({
                sql: 'UPDATE players SET team_id = NULL, is_auctioned = 0, sold_price = NULL WHERE id = ?',
                args: [id]
            });
        } else if (action === 'assign') {
            await db.batch([
                {
                    sql: 'UPDATE players SET team_id = ?, is_auctioned = 1 WHERE id = ?',
                    args: [team_id, id]
                },
                {
                    sql: 'UPDATE scores SET team_id = ? WHERE player_id = ? AND team_id IS NULL',
                    args: [team_id, id]
                }
            ], 'write');
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update player' }, { status: 500 });
    }
}
