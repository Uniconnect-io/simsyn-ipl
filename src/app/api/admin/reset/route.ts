import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
    try {
        const { type } = await request.json();

        switch (type) {
            case 'cases':
                // Reset case study usage
                db.prepare('UPDATE case_studies SET is_used = 0').run();
                break;

            case 'results':
                // Reset matches
                db.prepare(`
                    UPDATE matches 
                    SET winner_id = NULL, 
                        score1 = 0, 
                        score2 = 0, 
                        team1_summary = NULL, 
                        team2_summary = NULL, 
                        team1_bonus = 0, 
                        team2_bonus = 0, 
                        status = 'SCHEDULED'
                `).run();
                // Clear idea submissions (assuming there's a table for them, based on previous analysis of idea_submissions)
                try {
                    db.prepare('DELETE FROM idea_submissions').run();
                } catch (e) {
                    console.error('Failed to clear idea_submissions', e);
                }
                break;

            case 'players':
                // Clear team assignments and auction status
                db.prepare(`
                    UPDATE players 
                    SET team_id = NULL, 
                        sold_price = NULL, 
                        is_auctioned = 0
                `).run();
                // Clear bids and auctions
                db.prepare('DELETE FROM bids').run();
                db.prepare('DELETE FROM auctions').run();
                break;

            case 'wallets':
                // Reset team balances
                db.prepare('UPDATE teams SET balance = 1000000').run();
                break;

            case 'captains':
                // Unlink captains from teams
                db.prepare('UPDATE captains SET team_id = NULL').run();
                db.prepare('UPDATE teams SET captain_id = NULL').run();
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
