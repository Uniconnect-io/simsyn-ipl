import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { hashPassword } from '@/lib/password';

export async function GET(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const rs = await db.execute({
            sql: 'SELECT id, username, email, role FROM admins ORDER BY username ASC',
            args: []
        });

        return NextResponse.json(rs.rows);
    } catch (error) {
        console.error('Error fetching admins:', error);
        return NextResponse.json({ error: 'Failed to fetch admins' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { username, email, password, role } = await request.json();

        if (!username || !password) {
            return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
        }

        const hashedPassword = await hashPassword(password);
        const finalEmail = email || `${username}@simsyn.com`;
        const finalRole = role || 'ADMIN';

        await db.execute({
            sql: `INSERT INTO admins (username, email, password, role) VALUES (?, ?, ?, ?)`,
            args: [username, finalEmail, hashedPassword, finalRole]
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error creating admin:', error);
        return NextResponse.json({ error: 'Failed to create admin' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id, username, email, password, role } = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'Admin ID is required' }, { status: 400 });
        }

        const updates: string[] = [];
        const args: any[] = [];

        if (username) {
            updates.push('username = ?');
            args.push(username);
        }
        if (email !== undefined) {
            updates.push('email = ?');
            args.push(email);
        }
        if (role) {
            updates.push('role = ?');
            args.push(role);
        }
        if (password) {
            updates.push('password = ?');
            args.push(await hashPassword(password));
        }

        if (updates.length === 0) {
            return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
        }

        args.push(id);

        await db.execute({
            sql: `UPDATE admins SET ${updates.join(', ')} WHERE id = ?`,
            args
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating admin:', error);
        return NextResponse.json({ error: 'Failed to update admin' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        await db.execute({
            sql: 'DELETE FROM admins WHERE id = ?',
            args: [id]
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting admin:', error);
        return NextResponse.json({ error: 'Failed to delete admin' }, { status: 500 });
    }
}
