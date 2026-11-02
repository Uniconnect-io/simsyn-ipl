const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
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

      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'hackathon_config' AND policyname = 'Allow all access to hackathon_config'
        ) THEN
          CREATE POLICY "Allow all access to hackathon_config" ON hackathon_config FOR ALL USING (true) WITH CHECK (true);
        END IF;
      END $$;
    `);

    console.log('✅ hackathon_config table created successfully!');
    const res = await client.query('SELECT * FROM hackathon_config WHERE id = $1', ['default']);
    console.log('Current config:', res.rows[0]);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
