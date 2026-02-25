import 'dotenv/config';
import pg from 'pg';
const { Client } = pg;

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        const playerRes = await client.query('SELECT id FROM players LIMIT 1');
        if (playerRes.rows.length === 0) {
            console.log('No players found to assign idea to.');
            return;
        }
        const playerId = playerRes.rows[0].id;

        await client.query(`
      INSERT INTO hub_ideas (player_id, title, content, initial_score, admin_score, is_featured, is_shortlisted)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
            playerId,
            'AI-Powered Sentiment Response',
            'Automatically generate suggested responses based on the caller sentiment detected in real-time.',
            6,
            100,
            1,
            1
        ]);

        console.log('Seed idea inserted and featured.');
    } catch (err) {
        console.error('Error seeding idea:', err);
    } finally {
        await client.end();
    }
}

run();
