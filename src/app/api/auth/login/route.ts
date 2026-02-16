import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { login } from '@/lib/auth';

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
                const user = { ...admin, role: 'ADMIN' };
                await login(user);
                return NextResponse.json({ success: true, user });
            }
        } else {
            const rs = await db.execute({
                sql: 'SELECT id, name, team_id, role, password_reset_required FROM captains WHERE id = ? AND password = ?',
                args: [id, password]
            });
            const captain = rs.rows[0];

            if (captain) {
                await login(captain);
                return NextResponse.json({ success: true, user: captain });
            }
        }

        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Login failed' }, { status: 500 });
    }
}
