import { NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';
import crypto from 'crypto';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await initDb();
        const { name, rating, pool, min_bid, tags } = await request.json();
        console.log('API: Creating player:', { name, rating, pool, min_bid, tags });

        if (!name) {
            console.error('API Error: Name is missing in POST /api/admin/players');
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const id = crypto.randomUUID();

        await db.execute({
            sql: `
            INSERT INTO players (id, name, rating, pool, min_bid, tags, is_auctioned)
            VALUES (?, ?, ?, ?, ?, ?, 0)
        `,
            args: [id, name, rating, pool, min_bid, tags || '']
        });

        return NextResponse.json({ success: true, id });
    } catch (error) {
        console.error('Add player error:', error);
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
        const session = await getSession();
        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await request.json();
        const { id, action } = data;

        if (action === 'release') {
            const { refund } = data;
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
                sql: 'UPDATE players SET team_id = NULL, is_auctioned = 0, sold_price = NULL, auction_status = \'IDLE\', auction_current_bidder_id = NULL, auction_current_bid = 0 WHERE id = ?',
                args: [id]
            });
        } else if (action === 'assign') {
            const { team_id } = data;
            await db.batch([
                {
                    sql: 'UPDATE players SET team_id = ?, is_auctioned = 1, auction_status = \'SOLD\' WHERE id = ?',
                    args: [team_id, id]
                },
                {
                    sql: 'UPDATE scores SET team_id = ? WHERE player_id = ? AND team_id IS NULL',
                    args: [team_id, id]
                }
            ], 'write');
        } else if (action === 'update_details') {
            const { name, rating, pool, min_bid, tags } = data;
            console.log('API: Updating player details:', { id, name, rating, pool, min_bid, tags });

            if (!name) {
                console.error('API Error: Name is missing in PATCH /api/admin/players (update_details)');
                return NextResponse.json({ error: 'Name is required' }, { status: 400 });
            }

            await db.execute({
                sql: 'UPDATE players SET name = ?, rating = ?, pool = ?, min_bid = ?, tags = ? WHERE id = ?',
                args: [name, rating, pool, min_bid, tags, id]
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update player error:', error);
        return NextResponse.json({ error: 'Failed to update player' }, { status: 500 });
    }
}
