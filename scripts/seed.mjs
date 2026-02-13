import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'sipl.db');
const db = new Database(dbPath);

console.log('Initializing schema and seeding database...');

// Initialize schema
db.exec(`
  DROP TABLE IF EXISTS idea_submissions;
  DROP TABLE IF EXISTS matches;
  DROP TABLE IF EXISTS bids;
  DROP TABLE IF EXISTS auctions;
  DROP TABLE IF EXISTS players;
  DROP TABLE IF EXISTS captains;
  DROP TABLE IF EXISTS teams;
  DROP TABLE IF EXISTS admins;

  CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE,
    balance INTEGER DEFAULT 1000000,
    captain_id TEXT
  );

  CREATE TABLE IF NOT EXISTS captains (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE,
    password TEXT DEFAULT 'sipl2026',
    password_reset_required INTEGER DEFAULT 1,
    role TEXT DEFAULT 'CAPTAIN',
    team_id TEXT
  );

  CREATE TABLE IF NOT EXISTS admins (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    password TEXT
  );

  CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    name TEXT,
    rating INTEGER,
    pool TEXT,
    min_bid INTEGER,
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
    winner_id TEXT,
    score1 INTEGER DEFAULT 0,
    score2 INTEGER DEFAULT 0,
    case_description TEXT,
    status TEXT DEFAULT 'SCHEDULED'
  );

  CREATE TABLE IF NOT EXISTS idea_submissions (
    id TEXT PRIMARY KEY,
    match_id TEXT,
    team_id TEXT,
    captain_id TEXT,
    content TEXT,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Clear existing data
db.exec('DELETE FROM idea_submissions');
db.exec('DELETE FROM matches');
db.exec('DELETE FROM bids');
db.exec('DELETE FROM auctions');
db.exec('DELETE FROM players');
db.exec('DELETE FROM captains');
db.exec('DELETE FROM teams');
db.exec('DELETE FROM admins');

// Pre-configured Teams
const teams = [
  { id: 't1', name: 'AI Mavericks' },
  { id: 't2', name: 'Bot Blasters' },
  { id: 't3', name: 'CX Strikers' },
  { id: 't4', name: 'Data Dragons' },
  { id: 't5', name: 'Neural Ninjas' },
  { id: 't6', name: 'Voice Vipers' },
];

const insertTeam = db.prepare('INSERT OR IGNORE INTO teams (id, name, balance) VALUES (?, ?, ?)');
teams.forEach(t => insertTeam.run(t.id, t.name, 1000000));

// Pre-configured Captains
const captains = [
  { id: 'c1', name: 'Sanjaya' },
  { id: 'c2', name: 'Thilina' },
  { id: 'c3', name: 'Kalana' },
  { id: 'c4', name: 'Chamilka' },
  { id: 'c5', name: 'Maduranga' },
  { id: 'c6', name: 'Tharania' },
];

const insertCaptain = db.prepare('INSERT OR IGNORE INTO captains (id, name, password, role) VALUES (?, ?, ?, ?)');
captains.forEach(c => insertCaptain.run(c.id, c.name, 'sipl2026', 'CAPTAIN'));

// Pre-configured Admin
const admin = { id: 'a1', username: 'admin', password: 'admin123' };
db.prepare('INSERT OR IGNORE INTO admins (id, username, password) VALUES (?, ?, ?)').run(admin.id, admin.username, admin.password);

// Players from public/assets/players.md
const players = [
  // Pool A - Platinum
  { id: 'p1', name: 'Ashan', rating: 10, pool: 'A', min_bid: 250000 },
  { id: 'p2', name: 'Asik', rating: 10, pool: 'A', min_bid: 250000 },
  // Pool B - Gold
  { id: 'p3', name: 'Vithursan', rating: 8, pool: 'B', min_bid: 180000 },
  { id: 'p4', name: 'Buddika', rating: 8, pool: 'B', min_bid: 180000 },
  { id: 'p5', name: 'Achila', rating: 8, pool: 'B', min_bid: 180000 },
  // Pool C - Silver
  { id: 'p6', name: 'Gimhana', rating: 7, pool: 'C', min_bid: 140000 },
  // Pool D - Bronze
  { id: 'p7', name: 'Ravindu', rating: 5, pool: 'D', min_bid: 90000 },
  { id: 'p8', name: 'Inuri', rating: 5, pool: 'D', min_bid: 90000 },
  { id: 'p9', name: 'Anjani', rating: 5, pool: 'D', min_bid: 90000 },
  { id: 'p10', name: 'Shan', rating: 5, pool: 'D', min_bid: 90000 },
  { id: 'p11', name: 'Pasindu', rating: 5, pool: 'D', min_bid: 90000 },
  { id: 'p12', name: 'Isiwara', rating: 5, pool: 'D', min_bid: 90000 },
  { id: 'p13', name: 'Lasitha', rating: 5, pool: 'D', min_bid: 90000 },
  { id: 'p14', name: 'Sahiru', rating: 5, pool: 'D', min_bid: 90000 },
  { id: 'p15', name: 'Dinidu', rating: 5, pool: 'D', min_bid: 90000 },
  { id: 'p16', name: 'Dinuka', rating: 5, pool: 'D', min_bid: 90000 },
  // Pool E - Emerging
  { id: 'p17', name: 'Sewwandi', rating: 4, pool: 'E', min_bid: 60000 },
  { id: 'p18', name: 'Poorni', rating: 4, pool: 'E', min_bid: 60000 },
  { id: 'p19', name: 'Hansalie', rating: 4, pool: 'E', min_bid: 60000 },
  { id: 'p20', name: 'Sachith', rating: 4, pool: 'E', min_bid: 60000 },
  // Pool F - Rookie
  { id: 'p21', name: 'Thusiru', rating: 3, pool: 'F', min_bid: 40000 },
  { id: 'p22', name: 'Pramuditha', rating: 3, pool: 'F', min_bid: 40000 },
  { id: 'p23', name: 'Nimnadi', rating: 3, pool: 'F', min_bid: 40000 },
  { id: 'p24', name: 'Shenali', rating: 3, pool: 'F', min_bid: 40000 },
  { id: 'p25', name: 'Sanduni', rating: 3, pool: 'F', min_bid: 40000 },
  { id: 'p26', name: 'Mayumi', rating: 3, pool: 'F', min_bid: 40000 },
  { id: 'p27', name: 'Sineth', rating: 3, pool: 'F', min_bid: 40000 },
  { id: 'p28', name: 'Nipun', rating: 3, pool: 'F', min_bid: 40000 },
  { id: 'p29', name: 'Dulmini', rating: 3, pool: 'F', min_bid: 40000 },
  { id: 'p30', name: 'Eranda', rating: 3, pool: 'F', min_bid: 40000 },
];

const insertPlayer = db.prepare('INSERT OR IGNORE INTO players (id, name, rating, pool, min_bid) VALUES (?, ?, ?, ?, ?)');
players.forEach(p => insertPlayer.run(p.id, p.name, p.rating, p.pool, p.min_bid));

console.log('Seeding complete.');
db.close();
