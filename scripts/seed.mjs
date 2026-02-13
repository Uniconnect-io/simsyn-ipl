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
  // Tier 1 - 200,000
  { id: 'p1', name: 'Ashan', min_bid: 200000, tags: 'Code Whisperer, CRM Maestro, Campaign Architect, Industry Veteran', pool: 'A', rating: 10 },
  { id: 'p2', name: 'Asik', min_bid: 200000, tags: 'Code Whisperer, CRM Maestro, Campaign Architect, 3CX Guru, Industry Veteran', pool: 'A', rating: 10 },
  { id: 'p3', name: 'Vithursan', min_bid: 200000, tags: 'Code Whisperer, Report Wrangler, 3CX Guru, Industry Veteran', pool: 'A', rating: 10 },
  { id: 'p4', name: 'Achila', min_bid: 200000, tags: 'DevOps Dynamo, Infra Alchemist, 3CX Guru, Industry Veteran', pool: 'A', rating: 10 },
  { id: 'p5', name: 'Shan', min_bid: 200000, tags: 'Solution Sorcerer, Industry Veteran', pool: 'A', rating: 10 },
  { id: 'p6', name: 'Gimhana', min_bid: 200000, tags: 'Solution Sorcerer, Industry Veteran', pool: 'A', rating: 10 },
  
  // Tier 2 - 175,000
  { id: 'p7', name: 'Buddika', min_bid: 175000, tags: 'Code Whisperer, Campaign Architect', pool: 'B', rating: 8 },
  { id: 'p8', name: 'Isiwara', min_bid: 175000, tags: 'Biz Analyst, Domain Deity', pool: 'B', rating: 8 },
  { id: 'p9', name: 'Inuri', min_bid: 175000, tags: 'Code Whisperer, 3CX Guru, Softphone Savant, AI Apprentice', pool: 'B', rating: 8 },
  { id: 'p10', name: 'Ravindu', min_bid: 175000, tags: 'Code Whisperer, Report Wrangler', pool: 'B', rating: 8 },
  { id: 'p11', name: 'Anjani', min_bid: 175000, tags: 'Code Whisperer, Integration Ninja', pool: 'B', rating: 8 },
  { id: 'p12', name: 'Pasindu', min_bid: 175000, tags: 'Solution Sorcerer, 3CX Guru', pool: 'B', rating: 8 },
  
  // Tier 3 - 150,000
  { id: 'p13', name: 'Lasitha', min_bid: 150000, tags: 'Domain Deity, Customer Whisperer', pool: 'C', rating: 7 },
  { id: 'p14', name: 'Sahiru', min_bid: 150000, tags: 'Domain Deity, Customer Whisperer', pool: 'C', rating: 7 },
  { id: 'p15', name: 'Dinidu', min_bid: 150000, tags: 'Domain Deity, Customer Whisperer', pool: 'C', rating: 7 },
  { id: 'p16', name: 'Dinuka', min_bid: 150000, tags: 'Solution Sorcerer, Customer Whisperer', pool: 'C', rating: 7 },
  { id: 'p17', name: 'Pramuditha', min_bid: 150000, tags: 'Domain Deity, Marketing Magician, UI/UX Virtuoso', pool: 'C', rating: 7 },
  { id: 'p18', name: 'Nimnadi', min_bid: 150000, tags: 'Domain Deity, Customer Whisperer, Product Picasso', pool: 'C', rating: 7 },
  
  // Tier 4 - 125,000
  { id: 'p19', name: 'Sewwandi', min_bid: 125000, tags: 'Quality Conqueror', pool: 'D', rating: 5 },
  { id: 'p20', name: 'Thusiru', min_bid: 125000, tags: 'Project Pathfinder', pool: 'D', rating: 5 },
  { id: 'p21', name: 'Sanduni', min_bid: 125000, tags: 'Project Pathfinder', pool: 'D', rating: 5 },
  { id: 'p22', name: 'Poorni', min_bid: 125000, tags: 'Quality Conqueror', pool: 'D', rating: 5 },
  { id: 'p23', name: 'Shenali', min_bid: 125000, tags: 'Solution Sensei', pool: 'D', rating: 5 },
  { id: 'p24', name: 'Steevan', min_bid: 125000, tags: 'Customer Whisperer', pool: 'D', rating: 5 },
  { id: 'p25', name: 'Mayumi', min_bid: 125000, tags: 'Customer Whisperer', pool: 'D', rating: 5 },
  
  // Tier 5 - 100,000
  { id: 'p26', name: 'Dulmini', min_bid: 100000, tags: 'Customer Whisperer', pool: 'E', rating: 4 },
  { id: 'p27', name: 'Hansalie', min_bid: 100000, tags: 'AI Acumen, Intern Initiate', pool: 'E', rating: 4 },
  { id: 'p28', name: 'Sineth', min_bid: 100000, tags: 'Code Whisperer, Intern Initiate', pool: 'E', rating: 4 },
  { id: 'p29', name: 'Eranda', min_bid: 100000, tags: 'Code Whisperer, Intern Initiate', pool: 'E', rating: 4 },
  { id: 'p30', name: 'Nipun', min_bid: 100000, tags: 'Code Whisperer, Intern Initiate', pool: 'E', rating: 4 },
  { id: 'p31', name: 'Sachith', min_bid: 100000, tags: 'Code Whisperer, Intern Initiate', pool: 'E', rating: 4 },
];

const insertPlayer = db.prepare('INSERT OR IGNORE INTO players (id, name, rating, pool, min_bid, tags) VALUES (?, ?, ?, ?, ?, ?)');
players.forEach(p => insertPlayer.run(p.id, p.name, p.rating, p.pool, p.min_bid, p.tags));

console.log('Seeding complete.');
db.close();
