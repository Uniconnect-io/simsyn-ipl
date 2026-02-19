import { NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';
import { login } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        await initDb();
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
        } else if (type === 'owner') {
            const rs = await db.execute({
                sql: "SELECT id, name, team_id, role, password_reset_required FROM players WHERE id = ? AND password = ? AND role = 'OWNER'",
                args: [id, password]
            });
            const owner = rs.rows[0];

            if (owner) {
                await login(owner);
                return NextResponse.json({ success: true, user: owner });
            }
        } else if (type === 'player') {
            const rs = await db.execute({
                sql: 'SELECT id, name, team_id, role, password_reset_required FROM players WHERE LOWER(name) = LOWER(?) AND password = ?',
                args: [id, password]
            });
            const player = rs.rows[0];

            if (player) {
                await login(player);
                return NextResponse.json({ success: true, user: player });
            }
        }

        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Login failed' }, { status: 500 });
    }
}
