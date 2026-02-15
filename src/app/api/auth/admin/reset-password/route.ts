import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
    try {
        const { captainId } = await request.json();

        if (!captainId) {
            return NextResponse.json({ error: 'Captain ID is required' }, { status: 400 });
        }

        // Reset password to 'sipl2026' and require reset on next login
        const result = await db.execute({
            sql: `
            UPDATE captains 
            SET password = 'sipl2026', password_reset_required = 1 
            WHERE id = ?
        `,
            args: [captainId]
        });

        if (result.rowsAffected === 0) {
            return NextResponse.json({ error: 'Captain not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Admin password reset error:', error);
        return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
    }
}
