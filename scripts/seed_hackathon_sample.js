require('dotenv').config();
const { Pool } = require('pg');

async function seed() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();
  try {
    const teamsRs = await client.query('SELECT id, name FROM teams LIMIT 3');
    const teams = teamsRs.rows;

    const sample1 = {
      team_id: teams[0]?.id || null,
      team_name: teams[0]?.name || 'Neural Ninjas',
      owner_name: 'Alex Mercer',
      contact_email: 'alex.mercer@simsyn.com',
      title: 'OmniVoice AI: Real-Time Self-Healing IVR & Voice Agent Gateway',
      track: 'AI Voice & Autonomous Agents',
      problem_statement: 'Call centers suffer from rigid IVR trees with 45% abandonment rates and severe caller frustration. Callers spend minutes waiting through irrelevant keypad options, and abrupt transfers drop context, forcing customers to repeat themselves to live agents.',
      proposed_solution: 'An autonomous, conversational voice routing and triage engine that understands intent within 3 seconds, speaks naturally with low-latency TTS/STT, and resolves queries autonomously or context-transfers directly to the optimal human agent with full transcript summary.',
      uniconnect_usage: 'We will install Uniconnect locally and leverage the AI Voice Agent Execution API (af07d8d8) to trigger voice pipelines, Uniconnect Call Segments (36b86b1c) to capture live conversational metadata, and Real-Time Transcription (af76b847) to feed ongoing intent analysis.',
      impact_value: 'Expected 50% drop in call queue wait times, 35% first-call resolution increase, and $240K annual operational savings across customer support lines.',
      tech_stack: 'Uniconnect Voice Agent SDK, Next.js 16, Python FastAPI, WebRTC, OpenAI GPT-4o Realtime Audio, PostgreSQL',
      repo_or_demo_url: 'https://github.com/simsyn-ipl/omnivoice-demo',
      team_members: JSON.stringify(['Alex Mercer', 'Devon Vance', 'Priya Sharma', 'Kavitha R']),
      status: 'SHORTLISTED',
      score: 92,
      score_breakdown: JSON.stringify({
        problem_clarity: 19,
        uniconnect_alignment: 24,
        technical_feasibility: 18,
        innovation: 18,
        demo_polish: 13
      }),
      admin_feedback: 'Outstanding architecture and deep Uniconnect telephony integration. Recommended for live demonstration on Nov 17.'
    };

    const sample2 = {
      team_id: teams[1]?.id || null,
      team_name: teams[1]?.name || 'CX Strikers',
      owner_name: 'Marcus Chen',
      contact_email: 'marcus.chen@simsyn.com',
      title: 'CopilotPulse: Real-Time Agent Whisper & Automated Wrap-Up Bot',
      track: 'Contact Center Innovation',
      problem_statement: 'Support agents take 3-5 minutes after each call typing notes, selecting disposition tags, and creating CRM tickets. This post-call work (ACW) leads to longer queues, agent burnout, and inconsistent CRM ticket categorization.',
      proposed_solution: 'A silent AI co-pilot that listens to the live conversation, suggests instant KB articles and compliance checks during the call, and generates structured disposition tags and CRM summary tickets the moment the customer hangs up.',
      uniconnect_usage: 'Integrates with Uniconnect CRM test records (697965fc), Call Status & Segments (37c5613b), and automated Ticket creation (cb11590e) to sync call logs and tickets into the Uniconnect backend.',
      impact_value: 'Reduces After-Call Work (ACW) from 4 minutes to 15 seconds; enables 22% higher call throughput per agent per shift.',
      tech_stack: 'Uniconnect REST APIs, React 19, Node.js, LangChain, Supabase Realtime',
      repo_or_demo_url: 'https://github.com/simsyn-ipl/copilot-pulse',
      team_members: JSON.stringify(['Marcus Chen', 'Sara Connor', 'Naveen Patel']),
      status: 'SUBMITTED',
      score: 86,
      score_breakdown: JSON.stringify({
        problem_clarity: 18,
        uniconnect_alignment: 22,
        technical_feasibility: 18,
        innovation: 16,
        demo_polish: 12
      }),
      admin_feedback: 'Solid problem statement and clear business ROI. Ensure ticket automation handles edge case drop calls cleanly.'
    };

    // Check if table already has items
    const checkRs = await client.query('SELECT count(*) FROM hackathon_proposals');
    if (parseInt(checkRs.rows[0].count, 10) === 0) {
      for (const s of [sample1, sample2]) {
        await client.query(`
          INSERT INTO hackathon_proposals (
            team_id, team_name, owner_name, contact_email, title, track,
            problem_statement, proposed_solution, uniconnect_usage, impact_value,
            tech_stack, repo_or_demo_url, team_members, status, score, score_breakdown, admin_feedback
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14, $15, $16::jsonb, $17)
        `, [
          s.team_id, s.team_name, s.owner_name, s.contact_email, s.title, s.track,
          s.problem_statement, s.proposed_solution, s.uniconnect_usage, s.impact_value,
          s.tech_stack, s.repo_or_demo_url, s.team_members, s.status, s.score, s.score_breakdown, s.admin_feedback
        ]);
      }
      console.log('✅ Seeded 2 sample hackathon proposals successfully.');
    } else {
      console.log('ℹ️ hackathon_proposals table already has data.');
    }

  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(console.error);
