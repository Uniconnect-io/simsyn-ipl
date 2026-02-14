const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'sipl.db');
const db = new Database(dbPath);

console.log('Migrating database...');

try {
  // Add team1_summary if not exists
  try {
    db.prepare('ALTER TABLE matches ADD COLUMN team1_summary TEXT').run();
    console.log('Added team1_summary column');
  } catch (e) {
    if (e.message.includes('duplicate column name')) {
      console.log('team1_summary column already exists');
    } else {
      console.error('Error adding team1_summary:', e);
    }
  }

  // Add team2_summary if not exists
  try {
    db.prepare('ALTER TABLE matches ADD COLUMN team2_summary TEXT').run();
    console.log('Added team2_summary column');
  } catch (e) {
    if (e.message.includes('duplicate column name')) {
      console.log('team2_summary column already exists');
    } else {
      console.error('Error adding team2_summary:', e);
    }
  }

  // Add team1_bonus if not exists
  try {
    db.prepare('ALTER TABLE matches ADD COLUMN team1_bonus INTEGER DEFAULT 0').run();
    console.log('Added team1_bonus column');
  } catch (e) {
    if (e.message.includes('duplicate column name')) {
      console.log('team1_bonus column already exists');
    } else {
      console.error('Error adding team1_bonus:', e);
    }
  }

  // Add team2_bonus if not exists
  try {
    db.prepare('ALTER TABLE matches ADD COLUMN team2_bonus INTEGER DEFAULT 0').run();
    console.log('Added team2_bonus column');
  } catch (e) {
    if (e.message.includes('duplicate column name')) {
      console.log('team2_bonus column already exists');
    } else {
      console.error('Error adding team2_bonus:', e);
    }
  }

  console.log('Migration complete.');
} catch (error) {
  console.error('Migration failed:', error);
}
