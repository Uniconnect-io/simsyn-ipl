const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'sipl.db');
const db = new Database(dbPath);

async function startMatch() {
    try {
        const match = db.prepare("SELECT id FROM matches WHERE status = 'SCHEDULED' LIMIT 1").get();
        if (!match) {
            console.log("No scheduled matches found.");
            return;
        }

        console.log("Starting match: " + match.id);
        const res = await fetch('http://localhost:3000/api/battle/start', {
            method: 'POST',
            body: JSON.stringify({ matchId: match.id }),
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        console.log("Match start result:", data);

    } catch (e) {
        console.error("Failed to start match:", e);
    }
}

startMatch();
