import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { type } = await request.json();

        switch (type) {
            case 'cases':
                // Reset case study usage
                await db.execute('UPDATE case_studies SET is_used = 0');
                break;

            case 'results':
                // Reset matches
                await db.execute(`
                    UPDATE matches 
                    SET winner_id = NULL, 
                        score1 = 0, 
                        score2 = 0,
                        wickets1 = 0,
                        wickets2 = 0,
                        overs1 = 0,
                        overs2 = 0,
                        balls1 = 0,
                        balls2 = 0,
                        team1_summary = NULL, 
                        team2_summary = NULL, 
                        team1_bonus = 0, 
                        team2_bonus = 0, 
                        status = 'SCHEDULED'
                `);
                // Clear idea submissions (correct table is battle_ideas)
                try {
                    await db.execute('DELETE FROM battle_ideas');
                } catch (e) {
                    console.error('Failed to clear battle_ideas', e);
                }
                break;

            case 'players':
                // Clear team assignments and auction status
                await db.execute(`
                    UPDATE players 
                    SET team_id = NULL, 
                        sold_price = NULL, 
                        is_auctioned = 0,
                        min_bid = CASE pool
                            WHEN 'A' THEN 225000
                            WHEN 'B' THEN 200000
                            WHEN 'C' THEN 175000
                            WHEN 'D' THEN 150000
                            WHEN 'E' THEN 125000
                            ELSE min_bid
                        END
                `);
                // Clear bids and auctions
                await db.execute('DELETE FROM bids');
                await db.execute('DELETE FROM auctions');
                break;

            case 'wallets':
                // Reset team balances
                await db.execute('UPDATE teams SET balance = 1000000');
                break;

            case 'captains':
                // Unlink captains from teams
                await db.execute('UPDATE captains SET team_id = NULL');
                await db.execute('UPDATE teams SET captain_id = NULL');
                break;

            default:
                return NextResponse.json({ error: 'Invalid reset type' }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: `Reset ${type} successful` });
    } catch (error: any) {
        console.error('Reset error:', error);
        return NextResponse.json({ error: error.message || 'Reset failed' }, { status: 500 });
    }
}
