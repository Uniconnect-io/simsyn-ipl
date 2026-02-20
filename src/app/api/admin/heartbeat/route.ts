import { NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
    try {
        await initDb();
        const session = await getSession();
        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const [
            playersRs,
            teamsRs,
            ownersRs,
            matchesRs,
            auctionRs,
            casesRs
        ] = await Promise.all([
            // 1. Players
            db.execute(`
                SELECT p.*, t.name as "teamName" 
                FROM players p
                LEFT JOIN teams t ON p.team_id = t.id
                WHERE p.role = 'PLAYER'
            `),
            // 2. Teams
            db.execute('SELECT * FROM teams'),
            // 3. Owners
            db.execute(`
                SELECT c.*, t.name as "teamName", t.balance
                FROM players c
                LEFT JOIN teams t ON c.team_id = t.id
                WHERE c.role = 'OWNER'
            `),
            // 4. Matches
            db.execute(`
                SELECT 
                    m.*, 
                    t1.name as "team1Name", 
                    t2.name as "team2Name",
                    w.name as "winnerName",
                    p.name as "conductorName"
                FROM matches m
                LEFT JOIN teams t1 ON m.team1_id = t1.id
                LEFT JOIN teams t2 ON m.team2_id = t2.id
                LEFT JOIN teams w ON m.winner_id = w.id
                LEFT JOIN players p ON m.conductor_id = p.id
                ORDER BY m.start_time DESC, m.created_at DESC, m.id DESC
            `),
            // 5. Auction Status
            db.execute(`
                SELECT
                    p.id as "playerId", 
                    p.auction_current_bid as "currentBid",
                    p.auction_current_bidder_id as "currentBidderId", 
                    p.auction_timer_end as "timerEnd",
                    p.auction_status as status, 
                    p.name as "playerName", 
                    p.rating, 
                    p.pool,
                    p.min_bid as "basePrice", 
                    p.tags, 
                    t.name as "currentBidderName"
                FROM players p
                LEFT JOIN teams t ON p.auction_current_bidder_id = t.id
                WHERE p.auction_status = 'ACTIVE'
                LIMIT 1
            `),
            // 6. Case Studies
            db.execute('SELECT * FROM case_studies ORDER BY created_at DESC')
        ]);

        // Process teams to include captain and players info as expected by frontend
        const teams = teamsRs.rows as any[];
        const players = playersRs.rows as any[];
        const owners = ownersRs.rows as any[];
        const allMatches = matchesRs.rows as any[];

        // Split allMatches into standard matches and individual battles for frontend compatibility
        const matches = allMatches.filter(m => m.type === 'LEAGUE');
        const individualBattles = allMatches.filter(m => m.type !== 'LEAGUE');

        const teamsWithMeta = teams.map(team => ({
            ...team,
            captain: owners.find(o => o.team_id === team.id),
            players: players.filter(p => p.team_id === team.id)
        }));

        // Handle case where no auction is active
        let auction: any = auctionRs.rows[0];
        if (!auction) {
            const nextPlayerRs = await db.execute("SELECT * FROM players WHERE is_auctioned = 0 LIMIT 1");
            auction = { status: 'IDLE', nextPlayer: nextPlayerRs.rows[0] as any };
        }

        return NextResponse.json({
            players: playersRs.rows,
            teams: teamsWithMeta,
            owners: ownersRs.rows,
            matches,
            auction,
            caseStudies: casesRs.rows,
            individualBattles
        });
    } catch (error) {
        console.error('Heartbeat error:', error);
        return NextResponse.json({ error: 'Failed to fetch heartbeat' }, { status: 500 });
    }
}
