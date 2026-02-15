import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
    try {
        const { id, password, type } = await request.json();

        if (type === 'admin') {
            const rs = await db.execute({
                sql: 'SELECT id, username as name, role FROM admins WHERE username = ? AND password = ?',
                args: [id, password]
            });
            const admin = rs.rows[0];

            if (admin) {
                return NextResponse.json({ success: true, user: { ...admin, role: 'ADMIN' } });
            }
        } else {
            const rs = await db.execute({
                sql: 'SELECT id, name, team_id, role, password_reset_required FROM captains WHERE id = ? AND password = ?',
                args: [id, password]
            });
            const captain = rs.rows[0];

            if (captain) {
                return NextResponse.json({ success: true, user: captain });
            }
        }

        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Login failed' }, { status: 500 });
    }
}
