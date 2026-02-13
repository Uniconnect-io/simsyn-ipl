import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'sipl.db');
const db = new Database(dbPath);

console.log('Migrating database for Match Battle system...');

try {
    // Add columns to matches table
    db.exec(`
        ALTER TABLE matches ADD COLUMN wickets1 INTEGER DEFAULT 0;
        ALTER TABLE matches ADD COLUMN wickets2 INTEGER DEFAULT 0;
        ALTER TABLE matches ADD COLUMN start_time DATETIME;
        ALTER TABLE matches ADD COLUMN end_time DATETIME;
        ALTER TABLE matches ADD COLUMN overs1 REAL DEFAULT 0;
        ALTER TABLE matches ADD COLUMN overs2 REAL DEFAULT 0;
    `);
    console.log('Added battle columns to matches table.');
} catch (e) {
    console.log('Battle columns might already exist or error occurred:', e.message);
}

try {
    // Create battle_ideas table (renamed from ideas to avoid conflict and keep it specific)
    db.exec(`
        CREATE TABLE IF NOT EXISTS battle_ideas (
            id TEXT PRIMARY KEY,
            match_id TEXT,
            team_id TEXT,
            captain_id TEXT,
            content TEXT,
            score REAL,
            runs INTEGER,
            is_wicket INTEGER,
            is_duplicate INTEGER DEFAULT 0,
            feedback TEXT,
            embedding TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
    console.log('Created battle_ideas table.');
} catch (e) {
    console.log('Error creating battle_ideas table:', e.message);
}

console.log('Migration complete.');
db.close();
