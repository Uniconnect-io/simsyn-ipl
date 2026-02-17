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
        } else {
            const rs = await db.execute({
                sql: 'SELECT id, name, team_id, role, password_reset_required FROM captains WHERE id = ?',
                args: [session.user.id]
            });
            const captain = rs.rows[0];
            if (!captain) return NextResponse.json({ error: 'User not found' }, { status: 401 });
            return NextResponse.json({ user: captain });
        }
    } catch (error) {
        console.error('Auth check error:', error);
        return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
}
