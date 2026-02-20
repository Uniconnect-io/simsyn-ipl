import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        // Always fetch fresh data from DB to avoid stale sessions (e.g. after team assignment)
        if (session.user.role === 'ADMIN') {
            const rs = await db.execute({
                sql: 'SELECT id, username as name, role FROM admins WHERE id = ?',
                args: [session.user.id]
            });
            const admin = rs.rows[0];
            if (!admin) return NextResponse.json({ error: 'User not found' }, { status: 401 });
            return NextResponse.json({ user: { ...admin, role: 'ADMIN' } });
        } else if (session.user.role === 'OWNER') {
            const rs = await db.execute({
                sql: 'SELECT id, name, team_id, role, password_reset_required FROM players WHERE id = ?',
                args: [session.user.id]
            });
            const owner = rs.rows[0];
            if (!owner) return NextResponse.json({ error: 'User not found' }, { status: 401 });
            return NextResponse.json({ user: owner });
        } else if (session.user.role === 'PLAYER') {
            const rs = await db.execute({
                sql: 'SELECT id, name, team_id, role, rating, pool, sold_price, password_reset_required FROM players WHERE id = ?',
                args: [session.user.id]
            });
            const player = rs.rows[0];
            if (!player) return NextResponse.json({ error: 'User not found' }, { status: 401 });
            return NextResponse.json({ user: player });
        } else {
            return NextResponse.json({ error: 'Invalid role' }, { status: 401 });
        }
    } catch (error: any) {
        if (error.code === '22P02') {
            console.warn('Detected invalid UUID (stale session) in /auth/me check, returning 401.');
            return NextResponse.json({ error: 'Invalid session format' }, { status: 401 });
        }
        console.error('Auth check error:', error);
        return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
}
