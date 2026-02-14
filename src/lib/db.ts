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
    wickets1 INTEGER DEFAULT 0,
    wickets2 INTEGER DEFAULT 0,
    overs1 REAL DEFAULT 0,
    overs2 REAL DEFAULT 0,
    balls1 INTEGER DEFAULT 0,
    balls2 INTEGER DEFAULT 0,
    case_description TEXT,
    start_time DATETIME,
    end_time DATETIME,
    team1_summary TEXT,
    team2_summary TEXT,
    team1_bonus INTEGER DEFAULT 0,
    team2_bonus INTEGER DEFAULT 0,
    status TEXT DEFAULT 'SCHEDULED',
    is_published BOOLEAN DEFAULT 0
  );

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
    ball_index INTEGER,
    wicket_reason TEXT,
    is_extra INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS case_studies (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    is_used INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export default db;
