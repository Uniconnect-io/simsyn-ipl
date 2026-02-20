require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function setupSchema() {
    console.log("🚀 Setting up Database Schema on Supabase...");

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error("Missing DATABASE_URL in .env");
    }

    const pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const client = await pool.connect();
        try {
            const schemaPath = path.join(__dirname, '../supabase_schema.sql');
            const sql = fs.readFileSync(schemaPath, 'utf8');

            console.log("Executing SQL...");
            // Execute the whole file
            await client.query(sql);

            console.log("✅ Schema created successfully!");
        } finally {
            client.release();
        }
    } catch (err) {
        console.error("❌ Schema Setup Failed:", err);
    } finally {
        await pool.end();
    }
}

setupSchema();
