import { Pool } from 'pg';

// Use the connection string from Supabase (Transaction Mode usually 6543, Session Mode 5432)
// For serverless environments like Vercel, use the Session Mode or a focused connection pooler if available.
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false } // Required for Supabase
});

let isInitialized = false;
export const initDb = async () => {
  if (isInitialized) return;

  try {
    const client = await pool.connect();
    try {
      // 1. Create table for roadmap submissions
      await client.query(`
        CREATE TABLE IF NOT EXISTS roadmap_submissions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
          player_id UUID REFERENCES players(id) ON DELETE CASCADE,
          team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
          round INTEGER NOT NULL,
          submissions JSONB NOT NULL,
          is_final BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 2. Add roadmap tournament columns to matches table
      await client.query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS current_round INTEGER DEFAULT 1`);
      await client.query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS roadmap_results JSONB`);
      await client.query(`ALTER TABLE roadmap_submissions ADD COLUMN IF NOT EXISTS is_final BOOLEAN DEFAULT FALSE`);

      // 3. Enable RLS on roadmap_submissions
      await client.query(`ALTER TABLE roadmap_submissions ENABLE ROW LEVEL SECURITY`);
      await client.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'roadmap_submissions' AND policyname = 'Allow all access to roadmap_submissions'
          ) THEN
            CREATE POLICY "Allow all access to roadmap_submissions" ON roadmap_submissions FOR ALL USING (true) WITH CHECK (true);
          END IF;
        END $$;
      `);

      // 4. Create table for Hackathon proposals
      await client.query(`
        CREATE TABLE IF NOT EXISTS hackathon_proposals (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
          owner_id UUID REFERENCES players(id) ON DELETE SET NULL,
          team_name TEXT,
          owner_name TEXT,
          contact_email TEXT,
          title TEXT NOT NULL,
          track TEXT NOT NULL,
          problem_statement TEXT NOT NULL,
          proposed_solution TEXT NOT NULL,
          uniconnect_usage TEXT NOT NULL,
          impact_value TEXT,
          tech_stack TEXT,
          repo_or_demo_url TEXT,
          team_members JSONB DEFAULT '[]'::jsonb,
          status TEXT DEFAULT 'SUBMITTED',
          score REAL DEFAULT 0,
          score_breakdown JSONB DEFAULT '{}'::jsonb,
          admin_feedback TEXT,
          reviewed_by TEXT,
          reviewed_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_hackathon_proposals_team ON hackathon_proposals(team_id);
        CREATE INDEX IF NOT EXISTS idx_hackathon_proposals_status ON hackathon_proposals(status);
        ALTER TABLE hackathon_proposals ENABLE ROW LEVEL SECURITY;
      `);
      await client.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'hackathon_proposals' AND policyname = 'Allow all access to hackathon_proposals'
          ) THEN
            CREATE POLICY "Allow all access to hackathon_proposals" ON hackathon_proposals FOR ALL USING (true) WITH CHECK (true);
          END IF;
        END $$;
      `);

      // 5. Create table for Hackathon config
      await client.query(`
        CREATE TABLE IF NOT EXISTS hackathon_config (
          id TEXT PRIMARY KEY DEFAULT 'default',
          briefing_date TIMESTAMPTZ DEFAULT '2026-10-20T00:00:00Z',
          submission_deadline TIMESTAMPTZ DEFAULT '2026-10-30T23:59:59Z',
          review_start_date TIMESTAMPTZ DEFAULT '2026-11-03T00:00:00Z',
          review_end_date TIMESTAMPTZ DEFAULT '2026-11-07T23:59:59Z',
          finale_date TIMESTAMPTZ DEFAULT '2026-11-17T09:00:00Z',
          submission_mode TEXT DEFAULT 'AUTO_BY_DATE',
          teaser_popup_enabled BOOLEAN DEFAULT TRUE,
          results_published BOOLEAN DEFAULT FALSE,
          event_title TEXT DEFAULT 'SIPL x UNICONNECT AI HACKATHON 2026',
          event_subtitle TEXT DEFAULT 'Simsyn Innovation Premier League 2026',
          teaser_headline TEXT DEFAULT 'SOMETHING BIG IS BREWING.',
          teaser_description TEXT DEFAULT 'A revolutionary new challenge is coming to the Simsyn Innovation Premier League in collaboration with Uniconnect AI. Squads will go head-to-head to build, battle, and breakthrough.',
          meeting_url TEXT DEFAULT '',
          tracks JSONB DEFAULT '["Customer Engagement AI", "Contact Center Innovation", "AI Voice & Autonomous Agents", "CX Analytics & Real-Time Insights", "Workflow Automation & MCP", "Next-Gen CRM Enhancements"]'::jsonb,
          rubric JSONB DEFAULT '{"problem_clarity": 20, "uniconnect_alignment": 25, "technical_feasibility": 20, "innovation": 20, "demo_polish": 15}'::jsonb,
          max_team_size INTEGER DEFAULT 4,
          uniconnect_docs_url TEXT DEFAULT 'https://uniconnect.cx',
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO hackathon_config (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;
        ALTER TABLE hackathon_config ENABLE ROW LEVEL SECURITY;
      `);
      await client.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'hackathon_config' AND policyname = 'Allow all access to hackathon_config'
          ) THEN
            CREATE POLICY "Allow all access to hackathon_config" ON hackathon_config FOR ALL USING (true) WITH CHECK (true);
          END IF;
        END $$;
      `);
    } finally {
      client.release();
    }
    console.log("🐘 Database pool initialized successfully and migrations ran.");
    isInitialized = true;
  } catch (err) {
    console.error("❌ Database connection or migration failed:", err);
    throw err;
  }
};

// Helper: Convert '?' params to Postgres '$1, $2' for app-wide compatibility
const convertSql = (sql: string): string => {
  let i = 1;
  return sql.replace(/\?/g, () => `$${i++}`);
};

const execute = async (query: string | { sql: string; args: any[] }) => {
  let sql = '';
  let args: any[] = [];

  if (typeof query === 'string') {
    sql = query;
  } else {
    sql = query.sql;
    args = query.args || [];
  }

  const pgSql = convertSql(sql);

  const client = await pool.connect();
  try {
    const res = await client.query(pgSql, args);
    return {
      rows: res.rows,
      columns: res.fields.map((f: any) => f.name), // Start of minimal compatibility
      rowsAffected: res.rowCount
    };
  } finally {
    client.release();
  }
};

const batch = async (queries: Array<string | { sql: string; args: any[] }>, mode?: 'read' | 'write') => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const results = [];
    for (const query of queries) {
      let sql = '';
      let args: any[] = [];

      if (typeof query === 'string') {
        sql = query;
      } else {
        sql = query.sql;
        args = query.args || [];
      }

      const pgSql = convertSql(sql);
      const res = await client.query(pgSql, args);
      results.push({
        rows: res.rows,
        rowsAffected: res.rowCount
      });
    }

    await client.query('COMMIT');
    return results;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const db = {
  execute,
  batch,
};

export default db;
