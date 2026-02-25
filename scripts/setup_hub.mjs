import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("DATABASE_URL not found in .env");
    process.exit(1);
}

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function setup() {
    try {
        await client.connect();
        console.log("Connected to database.");

        await client.query(`
      CREATE TABLE IF NOT EXISTS hub_ideas (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        player_id UUID REFERENCES players(id),
        title TEXT,
        content TEXT,
        initial_score INTEGER DEFAULT 0,
        admin_score INTEGER DEFAULT 0,
        feedback TEXT,
        is_shortlisted INTEGER DEFAULT 0,
        is_featured INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);
        console.log("Table 'hub_ideas' created successfully.");

        process.exit(0);
    } catch (err) {
        console.error("Error setting up database:", err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

setup();
