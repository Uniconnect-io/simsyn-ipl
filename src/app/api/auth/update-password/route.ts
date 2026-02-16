import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id, newPassword } = await request.json();

        if (!id || !newPassword) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Ensure user is updating their own password unless they are ADMIN
        if (session.user.role !== 'ADMIN' && session.user.id !== id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const result = await db.execute({
            sql: `
            UPDATE captains 
            SET password = ?, password_reset_required = 0 
            WHERE id = ?
        `,
            args: [newPassword, id]
        });

        if (result.rowsAffected === 0) {
            return NextResponse.json({ error: 'Captain not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Password update error:', error);
        return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
    }
}
