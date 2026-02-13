import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'sipl.db');
const db = new Database(dbPath);

console.log('Migrating matches table schema...');

try {
  // Add columns if they don't exist
  // SQLite doesn't support IF NOT EXISTS for ADD COLUMN, so we catch errors
  try {
    db.prepare('ALTER TABLE matches ADD COLUMN date DATETIME').run();
    console.log('Added date column.');
  } catch (e) {
    if (!e.message.includes('duplicate column name')) console.error(e.message);
  }

  try {
    db.prepare('ALTER TABLE matches ADD COLUMN type TEXT DEFAULT "LEAGUE"').run();
    console.log('Added type column.');
  } catch (e) {
    if (!e.message.includes('duplicate column name')) console.error(e.message);
  }

  console.log('Migration complete.');
} catch (error) {
  console.error('Migration failed:', error);
} finally {
  db.close();
}
