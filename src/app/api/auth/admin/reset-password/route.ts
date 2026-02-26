import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { hashPassword } from '@/lib/password';

export async function POST(request: Request) {
    try {
        const { ownerId, resetAllPlayers } = await request.json();
        const defaultHashedPassword = await hashPassword('sipl2026');

        if (resetAllPlayers) {
            // Bulk reset for all PLAYERS
            await db.execute({
                sql: `
                    UPDATE players 
                    SET password = ?, password_reset_required = 1 
                    WHERE role = 'PLAYER'
                `,
                args: [defaultHashedPassword]
            });
            return NextResponse.json({ success: true, message: 'All player passwords reset' });
        }

        if (!ownerId) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        // Reset password to 'sipl2026' and require reset on next login
        const result = await db.execute({
            sql: `
            UPDATE players 
            SET password = ?, password_reset_required = 1 
            WHERE id = ?
        `,
            args: [defaultHashedPassword, ownerId]
        });

        if (result.rowsAffected === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Admin password reset error:', error);
        return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
    }
}
