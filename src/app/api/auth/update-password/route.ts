import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
    try {
        const { id, newPassword } = await request.json();

        if (!id || !newPassword) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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
