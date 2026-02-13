import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'sipl.db');
const db = new Database(dbPath);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE,
    balance INTEGER DEFAULT 1000000,
    captain_id TEXT
  );

  CREATE TABLE IF NOT EXISTS captains (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE,
    role TEXT DEFAULT 'CAPTAIN',
    team_id TEXT
  );

  CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    name TEXT,
    rating INTEGER,
    pool TEXT,
    min_bid INTEGER,
    tags TEXT,
    team_id TEXT,
    sold_price INTEGER,
    is_auctioned INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS auctions (
    id TEXT PRIMARY KEY,
    player_id TEXT UNIQUE,
    current_bid INTEGER DEFAULT 0,
    current_bidder_id TEXT,
    timer_end DATETIME,
    status TEXT DEFAULT 'PENDING'
  );

  CREATE TABLE IF NOT EXISTS bids (
    id TEXT PRIMARY KEY,
    player_id TEXT,
    team_id TEXT,
    amount INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    team1_id TEXT,
    team2_id TEXT,
    month INTEGER,
    date TEXT,
    type TEXT DEFAULT 'LEAGUE',
    winner_id TEXT,
    score1 INTEGER DEFAULT 0,
    score2 INTEGER DEFAULT 0,
    case_description TEXT,
    team1_summary TEXT,
    team2_summary TEXT,
    team1_bonus INTEGER DEFAULT 0,
    team2_bonus INTEGER DEFAULT 0,
    status TEXT DEFAULT 'SCHEDULED'
  );
`);

export default db;
