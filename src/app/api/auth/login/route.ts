import { NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';
import { login } from '@/lib/auth';
import { comparePasswords } from '@/lib/password';

export async function POST(request: Request) {
    try {
        await initDb();
        const { id, password, type } = await request.json();

        if (type === 'admin') {
            const rs = await db.execute({
                sql: 'SELECT id, username as name, role, password FROM admins WHERE username = ?',
                args: [id]
            });
            const admin = rs.rows[0];

            if (admin) {
                const isMatch = await comparePasswords(password, admin.password);
                if (isMatch) {
                    const { password: _, ...adminData } = admin;
                    const user = { ...adminData, role: 'ADMIN' };
                    await login(user);
                    return NextResponse.json({ success: true, user });
                }
            }
        } else if (type === 'owner') {
            const rs = await db.execute({
                sql: "SELECT id, name, team_id, role, password_reset_required, password FROM players WHERE id = ? AND role = 'OWNER'",
                args: [id]
            });
            const owner = rs.rows[0];

            if (owner) {
                const isMatch = await comparePasswords(password, owner.password);
                if (isMatch) {
                    const { password: _, ...ownerData } = owner;
                    await login(ownerData);
                    return NextResponse.json({ success: true, user: ownerData });
                }
            }
        } else if (type === 'player') {
            const rs = await db.execute({
                sql: 'SELECT id, name, team_id, role, password_reset_required, password FROM players WHERE LOWER(name) = LOWER(?)',
                args: [id]
            });
            const player = rs.rows[0];

            if (player) {
                const isMatch = await comparePasswords(password, player.password);
                if (isMatch) {
                    const { password: _, ...playerData } = player;
                    await login(playerData);
                    return NextResponse.json({ success: true, user: playerData });
                }
            }
        }

        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Login failed' }, { status: 500 });
    }
}
