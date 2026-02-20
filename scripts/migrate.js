require('dotenv').config();
const { createClient } = require('@libsql/client');
const { Pool } = require('pg');
const { randomUUID } = require('crypto');

async function migrate() {
    console.log("🚀 Starting Data Migration: Turso -> Supabase (with ID Remapping)");

    const tursoUrl = process.env.TURSO_DATABASE_URL;
    const tursoToken = process.env.TURSO_AUTH_TOKEN;
    const supabaseUrl = process.env.DATABASE_URL;

    if (!tursoUrl || !tursoToken || !supabaseUrl) {
        throw new Error("Missing credentials");
    }

    const turso = createClient({ url: tursoUrl, authToken: tursoToken });
    const pool = new Pool({ connectionString: supabaseUrl, ssl: { rejectUnauthorized: false } });
    const pg = await pool.connect();

    // Mapping: Old ID -> New UUID
    const idMap = {
        teams: new Map(),
        players: new Map(),
        auctions: new Map(),
        matches: new Map(),
        questions: new Map()
    };

    try {
        console.log("Cleaning up existing Supabase data...");
        await pg.query('TRUNCATE table teams, players, auctions, bids, matches, battle_ideas, scores, case_studies RESTART IDENTITY CASCADE');

        // --- 1. TEAMS ---
        console.log("Migrating Teams...");
        const teamsRs = await turso.execute("SELECT * FROM teams");
        for (const t of teamsRs.rows) {
            const newId = randomUUID();
            idMap.teams.set(t.id, newId);

            // Insert with NULL captain/owner initially
            await pg.query(`
                INSERT INTO teams (id, name, balance, owner_id)
                VALUES ($1, $2, $3, NULL)
            `, [newId, t.name, t.balance]);
        }

        // --- 2. PLAYERS ---
        console.log("Migrating Players...");
        const playersRs = await turso.execute("SELECT * FROM players");
        for (const p of playersRs.rows) {
            const newId = randomUUID();
            idMap.players.set(p.id, newId);

            const teamId = idMap.teams.get(p.team_id) || null; // Resolve Team ID

            await pg.query(`
                INSERT INTO players (id, name, role, min_bid, sold_price, team_id, is_auctioned, pool, password, rating, tags)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            `, [
                newId, p.name, p.role || 'PLAYER', p.base_price || p.min_bid || 0, p.sold_price,
                teamId, p.is_auctioned ? 1 : 0, p.pool,
                'player2026',
                p.rating, p.tags
            ]);
        }

        // --- 3. UPDATE TEAMS (Captain) ---
        console.log("Linking Captains...");
        for (const t of teamsRs.rows) {
            if (t.captain_id) {
                const newTeamId = idMap.teams.get(t.id);
                const newCaptainId = idMap.players.get(t.captain_id);
                if (newTeamId && newCaptainId) {
                    await pg.query('UPDATE teams SET captain_id = $1 WHERE id = $2', [newCaptainId, newTeamId]);
                }
            }
        }

        // --- 4. AUCTIONS ---
        console.log("Migrating Auctions...");
        try {
            const auctionsRs = await turso.execute("SELECT * FROM auctions");
            for (const a of auctionsRs.rows) {
                const newId = randomUUID();
                idMap.auctions.set(a.id, newId);

                const playerId = idMap.players.get(a.player_id);
                const bidderId = idMap.teams.get(a.current_bidder_id); // Assuming bidder is team

                if (!playerId) continue; // Skip if player missing

                await pg.query(`
                    INSERT INTO auctions (id, player_id, current_bid, current_bidder_id, status, timer_end, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [
                    newId, playerId, a.current_bid, bidderId || null,
                    a.status, a.end_time ? new Date(a.end_time) : null, new Date()
                ]);
            }
        } catch (e) { console.log("Auctions error:", e.message); }

        // --- 5. BIDS ---
        console.log("Migrating Bids...");
        try {
            const bidsRs = await turso.execute("SELECT * FROM bids");
            for (const b of bidsRs.rows) {
                // Bids often don't need ID preservation, just new UUID
                const auctionId = idMap.auctions.get(b.auction_id);
                const playerId = idMap.players.get(b.player_id);
                const teamId = idMap.teams.get(b.bidder_id) || idMap.teams.get(b.team_id); // Handle schema variations

                if (auctionId && teamId) {
                    await pg.query(`
                        INSERT INTO bids (id, auction_id, player_id, team_id, amount, created_at)
                        VALUES ($1, $2, $3, $4, $5, $6)
                    `, [randomUUID(), auctionId, playerId || null, teamId, b.amount, b.created_at ? new Date(b.created_at) : new Date()]);
                }
            }
        } catch (e) { console.log("Bids error:", e.message); }

        // --- 6. MATCHES ---
        console.log("Migrating Matches...");
        try {
            const matchesRs = await turso.execute("SELECT * FROM matches");
            for (const m of matchesRs.rows) {
                const newId = randomUUID();
                idMap.matches.set(m.id, newId);

                const t1 = idMap.teams.get(m.team1_id);
                const t2 = idMap.teams.get(m.team2_id);
                const winner = idMap.teams.get(m.winner_id);

                if (t1 && t2) {
                    await pg.query(`
                        INSERT INTO matches (id, team1_id, team2_id, month, score1, score2, wickets1, wickets2, overs1, overs2, status, winner_id, case_description, team1_summary, team2_summary)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                    `, [
                        newId, t1, t2, m.month,
                        m.score1, m.score2, m.wickets1, m.wickets2, m.overs1, m.overs2,
                        m.status, winner || null, m.case_description,
                        m.team1_summary, m.team2_summary
                    ]);
                }
            }
        } catch (e) { console.log("Matches error:", e.message); }

        // --- 7. BATTLE IDEAS ---
        console.log("Migrating Battle Ideas...");
        try {
            const ideasRs = await turso.execute("SELECT * FROM battle_ideas");
            for (const i of ideasRs.rows) {
                const matchId = idMap.matches.get(i.match_id);
                const teamId = idMap.teams.get(i.team_id);
                const captainId = idMap.players.get(i.captain_id); // Assuming captain linked

                if (matchId) {
                    await pg.query(`
                         INSERT INTO battle_ideas (id, match_id, team_id, captain_id, content, score, runs, is_wicket, is_extra, created_at)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                     `, [
                        randomUUID(), matchId, teamId || null, captainId || null, i.content,
                        i.score, i.runs, i.is_wicket ? 1 : 0, i.is_extra ? 1 : 0,
                        i.created_at ? new Date(i.created_at) : new Date()
                    ]);
                }
            }
        } catch (e) { console.log("Ideas error:", e.message); }

        console.log("✅ MIGRATION COMPLETE!");

    } catch (err) {
        console.error("Migration Failed:", err);
    } finally {
        await pg.release();
        await pool.end();
        console.log("Disconnected.");
    }
}

migrate();
