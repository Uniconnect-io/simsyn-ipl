import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
    try {
        const { teamId, amount } = await request.json();

        if (!teamId || !amount) {
            return NextResponse.json({ error: 'Team ID and amount required' }, { status: 400 });
        }

        await db.execute({
            sql: 'UPDATE teams SET balance = balance + ? WHERE id = ?',
            args: [amount, teamId]
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Wallet topup error:', error);
        return NextResponse.json({ error: 'Failed to topup wallet' }, { status: 500 });
    }
}
