require('dotenv').config();
const { Pool } = require('pg');

async function run() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();
  try {
    console.log("Connecting to Postgres...");
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
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_hackathon_proposals_team ON hackathon_proposals(team_id);
      CREATE INDEX IF NOT EXISTS idx_hackathon_proposals_status ON hackathon_proposals(status);
    `);

    // Enable RLS
    await client.query(`ALTER TABLE hackathon_proposals ENABLE ROW LEVEL SECURITY;`);
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

    // Enable Realtime
    try {
      await client.query(`ALTER PUBLICATION supabase_realtime ADD TABLE hackathon_proposals;`);
    } catch (pubErr) {
      console.log("Realtime publication notice (likely already exists):", pubErr.message);
    }

    console.log("✅ Hackathon proposals table successfully created / verified!");
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((e) => {
  console.error("Migration error:", e);
  process.exit(1);
});
