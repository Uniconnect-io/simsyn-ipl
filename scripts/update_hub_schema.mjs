import 'dotenv/config';
import pg from 'pg';
const { Client } = pg;

async function updateHubTable() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        // Add status column if it doesn't exist
        await client.query(`
      ALTER TABLE hub_ideas ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING';
    `);

        // Ensure initial status index or constraints if needed
        // For now just adding the column is enough.

        console.log('Column "status" added to "hub_ideas" table.');
    } catch (error) {
        console.error('Error updating hub_ideas table:', error);
    } finally {
        await client.end();
    }
}

updateHubTable();
