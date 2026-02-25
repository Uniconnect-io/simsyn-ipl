import 'dotenv/config';
import pg from 'pg';
const { Client } = pg;

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();
        const res = await client.query('SELECT count(*) FROM hub_ideas WHERE is_featured = 1');
        console.log('Featured ideas count:', res.rows[0].count);

        const all = await client.query('SELECT * FROM hub_ideas');
        console.log('Total ideas:', all.rows.length);
        console.log('Ideas:', JSON.stringify(all.rows, null, 2));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
