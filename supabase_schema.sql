-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Teams Table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE,
  balance INTEGER DEFAULT 1000000,
  owner_id UUID,
  captain_id UUID
);

-- Players Table
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  password TEXT DEFAULT 'player2026',
  role TEXT DEFAULT 'PLAYER',
  password_reset_required INTEGER DEFAULT 0,
  rating INTEGER,
  pool TEXT,
  min_bid INTEGER,
  tags TEXT,
  team_id UUID REFERENCES teams(id),
  sold_price INTEGER,
  is_auctioned INTEGER DEFAULT 0,
  auction_status TEXT DEFAULT 'IDLE',
  auction_current_bid INTEGER DEFAULT 0,
  auction_current_bidder_id UUID REFERENCES teams(id),
  auction_timer_end TIMESTAMPTZ
);

-- Auctions Table
CREATE TABLE IF NOT EXISTS auctions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID UNIQUE REFERENCES players(id),
  current_bid INTEGER DEFAULT 0,
  current_bidder_id UUID REFERENCES teams(id),
  timer_end TIMESTAMPTZ,
  status TEXT DEFAULT 'PENDING'
);

-- Bids Table
CREATE TABLE IF NOT EXISTS bids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id),
  team_id UUID REFERENCES teams(id),
  amount INTEGER,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Judgement Schemes
CREATE TABLE IF NOT EXISTS judgement_schemes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  alignment_weight REAL DEFAULT 0.25,
  feasibility_weight REAL DEFAULT 0.20,
  value_weight REAL DEFAULT 0.25,
  effort_weight REAL DEFAULT 0.15,
  innovation_weight REAL DEFAULT 0.15,
  relevance_threshold REAL DEFAULT 0.12,
  runs_config JSONB,
  is_default INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Matches Table
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team1_id UUID REFERENCES teams(id),
  team2_id UUID REFERENCES teams(id),
  start_time TIMESTAMPTZ,
  status TEXT DEFAULT 'SCHEDULED',
  type TEXT DEFAULT 'LEAGUE',
  score1 INTEGER DEFAULT 0,
  score2 INTEGER DEFAULT 0,
  wickets1 INTEGER DEFAULT 0,
  wickets2 INTEGER DEFAULT 0,
  balls1 INTEGER DEFAULT 0,
  balls2 INTEGER DEFAULT 0,
  overs1 REAL DEFAULT 0.0,
  overs2 REAL DEFAULT 0.0,
  case_description TEXT,
  judgement_scheme_id UUID REFERENCES judgement_schemes(id),
  end_time TIMESTAMPTZ,
  is_published INTEGER DEFAULT 0,
  winner_id UUID REFERENCES teams(id),
  title TEXT,
  description TEXT,
  points_weight REAL DEFAULT 1.0,
  question_timer INTEGER DEFAULT 10,
  mode TEXT DEFAULT 'TEAM',
  conductor_id UUID REFERENCES players(id),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Scores Table
CREATE TABLE IF NOT EXISTS scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id),
  player_id UUID REFERENCES players(id),
  team_id UUID REFERENCES teams(id),
  score REAL DEFAULT 0,
  points REAL DEFAULT 0,
  nrr_contribution REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Battle Ideas
CREATE TABLE IF NOT EXISTS battle_ideas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id),
  team_id UUID REFERENCES teams(id),
  captain_id UUID REFERENCES players(id),
  content TEXT,
  score REAL,
  runs INTEGER,
  is_wicket INTEGER,
  is_duplicate INTEGER DEFAULT 0,
  feedback TEXT,
  embedding TEXT, -- Vector extension recommmended if using pgvector
  ball_index INTEGER,
  wicket_reason TEXT,
  is_extra INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Case Studies
CREATE TABLE IF NOT EXISTS case_studies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  is_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Battle Questions
CREATE TABLE IF NOT EXISTS battle_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  battle_id UUID REFERENCES matches(id),
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_option INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Individual Battle Answers
CREATE TABLE IF NOT EXISTS individual_battle_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  battle_id UUID REFERENCES matches(id),
  question_id UUID REFERENCES battle_questions(id),
  player_id UUID REFERENCES players(id),
  is_correct INTEGER,
  runs_awarded INTEGER,
  answer TEXT,
  response_time REAL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Admins Table
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE,
  password TEXT,
  role TEXT DEFAULT 'admin'
);

-- Enable Realtime
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table bids;
alter publication supabase_realtime add table teams;
alter publication supabase_realtime add table matches;
alter publication supabase_realtime add table individual_battle_answers;
alter publication supabase_realtime add table scores;
alter publication supabase_realtime add table case_studies;
