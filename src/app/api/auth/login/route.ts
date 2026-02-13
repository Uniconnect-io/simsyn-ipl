import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
    try {
        const { id, password, type } = await request.json();

        if (type === 'admin') {
            const admin = db.prepare('SELECT id, username as name FROM admins WHERE username = ? AND password = ?').get(id, password) as any;
            if (admin) {
                return NextResponse.json({ success: true, user: { ...admin, role: 'ADMIN' } });
            }
        } else {
            const captain = db.prepare('SELECT id, name, team_id, role, password_reset_required FROM captains WHERE id = ? AND password = ?').get(id, password) as any;
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
