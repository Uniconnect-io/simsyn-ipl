const fs = require('fs');
require('dotenv').config();
const { Pool } = require('pg');

async function run() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    const client = await pool.connect();

    console.log("--- TotalEvents ---");
    const rs1 = await client.query("SELECT COUNT(id) as total_events FROM matches WHERE is_published = 1 AND (is_test = false OR is_test IS NULL) AND status = 'COMPLETED'");
    console.log(rs1.rows);

    console.log("--- LeagueAvg ---");
    const rs2 = await client.query("SELECT COALESCE(SUM(score) * 1.0 / NULLIF(COUNT(DISTINCT player_id), 0), 0) as avg_score FROM scores WHERE score > 0 AND team_id IS NOT NULL");
    console.log(rs2.rows);

    console.log("--- PlayerStats ---");
    const rs3 = await client.query("SELECT player_id, team_id, SUM(score) as total_player_score FROM scores WHERE player_id IS NOT NULL AND team_id IS NOT NULL GROUP BY player_id, team_id");
    console.log(rs3.rows);

    console.log("--- PlayerNRR ---");
    const rs4 = await client.query(`
        WITH LeagueAvg AS (
            SELECT COALESCE(SUM(score) * 1.0 / NULLIF(COUNT(DISTINCT player_id), 0), 0) as avg_score
            FROM scores
            WHERE score > 0 AND team_id IS NOT NULL
        ),
        TotalEvents AS (
            SELECT COUNT(id) as total_events
            FROM matches
            WHERE is_published = 1 AND (is_test = false OR is_test IS NULL) AND status = 'COMPLETED'
        ),
        PlayerStats AS (
            SELECT 
                player_id,
                SUM(score) as total_player_score
            FROM scores
            WHERE player_id IS NOT NULL AND team_id IS NOT NULL
            GROUP BY player_id
        )
        SELECT 
            ps.player_id,
            (ps.total_player_score - la.avg_score) * 1.0 / NULLIF(te.total_events, 0) as dynamic_nrr
        FROM PlayerStats ps
        CROSS JOIN LeagueAvg la
        CROSS JOIN TotalEvents te
    `);
    console.log(rs4.rows);

    client.release();
    pool.end();
}

run().catch(console.error);
