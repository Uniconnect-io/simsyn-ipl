import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
    try {
        const { ownerId, resetAllPlayers } = await request.json();

        if (resetAllPlayers) {
            // Bulk reset for all PLAYERS
            await db.execute({
                sql: `
                    UPDATE players 
                    SET password = 'sipl2026', password_reset_required = 1 
                    WHERE role = 'PLAYER'
                `,
                args: []
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
            SET password = 'sipl2026', password_reset_required = 1 
            WHERE id = ?
        `,
            args: [ownerId]
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
