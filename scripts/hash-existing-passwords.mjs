import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const SALT_ROUNDS = 10;

async function hashPassword(password) {
    // Check if it's already hashed (bcrypt hashes start with $2a$ or $2b$)
    if (password.startsWith('$2a$') || password.startsWith('$2b$')) {
        return password;
    }
    return await bcrypt.hash(password, SALT_ROUNDS);
}

async function migrate() {
    console.log("🚀 Starting password migration...");
    const client = await pool.connect();

    try {
        // 1. Migrate Admins
        console.log("Migrating admin passwords...");
        const adminsRs = await client.query('SELECT id, password FROM admins');
        for (const admin of adminsRs.rows) {
            if (admin.password) {
                const hashed = await hashPassword(admin.password);
                if (hashed !== admin.password) {
                    await client.query('UPDATE admins SET password = $1 WHERE id = $2', [hashed, admin.id]);
                }
            }
        }

        // 2. Migrate Players (including Owners)
        console.log("Migrating player/owner passwords...");
        const playersRs = await client.query('SELECT id, password FROM players');
        for (const player of playersRs.rows) {
            if (player.password) {
                const hashed = await hashPassword(player.password);
                if (hashed !== player.password) {
                    await client.query('UPDATE players SET password = $1 WHERE id = $2', [hashed, player.id]);
                }
            }
        }

        console.log("✅ Password migration complete!");
    } catch (err) {
        console.error("❌ Migration failed:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
