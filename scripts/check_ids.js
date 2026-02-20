require('dotenv').config();
const { createClient } = require('@libsql/client');

async function checkIds() {
    const tursoUrl = process.env.TURSO_DATABASE_URL;
    const tursoToken = process.env.TURSO_AUTH_TOKEN;
    const client = createClient({ url: tursoUrl, authToken: tursoToken });

    try {
        console.log("Checking Teams IDs:");
        const teams = await client.execute("SELECT id FROM teams LIMIT 3");
        console.log(teams.rows);

        console.log("Checking Players IDs:");
        const players = await client.execute("SELECT id FROM players LIMIT 3");
        console.log(players.rows);
    } catch (e) {
        console.error(e);
    }
}
checkIds();
