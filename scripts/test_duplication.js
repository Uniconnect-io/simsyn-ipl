const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'sipl.db');
const db = new Database(dbPath);

async function test() {
    try {
        const match = db.prepare("SELECT id, team1_id, team2_id FROM matches WHERE status = 'IN_PROGRESS' LIMIT 1").get();
        if (!match) {
            console.log("No active match found to test.");
            return;
        }

        const captain = db.prepare("SELECT id FROM captains WHERE team_id = ? LIMIT 1").get(match.team1_id);
        if (!captain) {
            console.log("No captain found for team " + match.team1_id);
            return;
        }

        const testData = {
            matchId: match.id,
            teamId: match.team1_id,
            captainId: captain.id,
            content: "We should focus on implementing a new recycling program to reduce waste."
        };

        console.log("Submitting first idea...");
        const res1 = await fetch('http://localhost:3000/api/battle/submit', {
            method: 'POST',
            body: JSON.stringify(testData),
            headers: { 'Content-Type': 'application/json' }
        });
        const data1 = await res1.json();
        console.log("First submission result:", data1);

        const testData2 = {
            ...testData,
            content: "Our priority should be starting a recycling initiative to cut down on garbage."
        };

        console.log("\nSubmitting semantically similar idea (different words)...");
        const res2 = await fetch('http://localhost:3000/api/battle/submit', {
            method: 'POST',
            body: JSON.stringify(testData2),
            headers: { 'Content-Type': 'application/json' }
        });
        const data2 = await res2.json();
        console.log("Second submission result:", data2);
        
        if (data2.wicket && data2.message.includes('Duplicate concept')) {
            console.log("\nSUCCESS: Semantic duplication detected!");
        } else {
            console.log("\nFAILURE: Semantic duplication NOT detected.");
        }

    } catch (e) {
        console.error("Test failed:", e);
    }
}

test();
