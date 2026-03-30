import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query("ALTER TABLE players ADD COLUMN IF NOT EXISTS email TEXT");
    console.log("Added email to players");
    await client.query("ALTER TABLE admins ADD COLUMN IF NOT EXISTS email TEXT");
    console.log("Added email to admins");

    // Replace spaces with dots and set default email
    await client.query("UPDATE players SET email = REPLACE(LOWER(name), ' ', '.') || '@simsyn.com' WHERE email IS NULL OR email = ''");
    console.log("Updated default player emails");
    
    await client.query("UPDATE admins SET email = LOWER(username) || '@simsyn.com' WHERE email IS NULL OR email = ''");
    console.log("Updated default admin emails");

  } catch (e) {
    console.error(e);
  } finally {
    client.release();
    pool.end();
  }
}

run();
