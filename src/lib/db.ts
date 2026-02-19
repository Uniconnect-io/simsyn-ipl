import { createClient } from '@libsql/client';
import crypto from 'crypto';

const url = process.env.TURSO_DATABASE_URL || 'file:sipl.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

const db = createClient({
  url,
  authToken,
});



let isInitialized = false;

export const initDb = async () => {
  if (isInitialized) return;

  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE,
      balance INTEGER DEFAULT 1000000,
      owner_id TEXT,
      captain_id TEXT
    );

    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT DEFAULT 'admin'
    );



    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      name TEXT,
      password TEXT DEFAULT 'player2026',
      role TEXT DEFAULT 'PLAYER',
      password_reset_required INTEGER DEFAULT 0,
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
      start_time DATETIME,
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
      judgement_scheme_id TEXT,
      end_time DATETIME,
      is_published INTEGER DEFAULT 0,
      winner_id TEXT,
      title TEXT,
      description TEXT,
      points_weight REAL DEFAULT 1.0,
      question_timer INTEGER DEFAULT 10,
      mode TEXT DEFAULT 'TEAM',
      conductor_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team1_id) REFERENCES teams(id),
      FOREIGN KEY (team2_id) REFERENCES teams(id),
      FOREIGN KEY (judgement_scheme_id) REFERENCES judgement_schemes(id),
      FOREIGN KEY (conductor_id) REFERENCES players(id)
    );

    CREATE TABLE IF NOT EXISTS scores (
      id TEXT PRIMARY KEY,
      match_id TEXT,
      player_id TEXT,
      team_id TEXT,
      score REAL DEFAULT 0,
      points REAL DEFAULT 0,
      nrr_contribution REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (match_id) REFERENCES matches(id),
      FOREIGN KEY (player_id) REFERENCES players(id),
      FOREIGN KEY (team_id) REFERENCES teams(id)
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (match_id) REFERENCES matches(id)
    );

    CREATE TABLE IF NOT EXISTS case_studies (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      is_used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS individual_battle_answers (
      id TEXT PRIMARY KEY,
      battle_id TEXT, -- Pointing to matches(id)
      question_id TEXT,
      player_id TEXT,
      is_correct INTEGER,
      runs_awarded INTEGER,
      answer TEXT,
      response_time REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (battle_id) REFERENCES matches(id),
      FOREIGN KEY (player_id) REFERENCES players(id),
      FOREIGN KEY (question_id) REFERENCES battle_questions(id)
    );

    CREATE TABLE IF NOT EXISTS battle_questions (
      id TEXT PRIMARY KEY,
      battle_id TEXT, -- Pointing to matches(id)
      question TEXT NOT NULL,
      options TEXT NOT NULL, -- JSON string array
      correct_option INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (battle_id) REFERENCES matches(id)
    );

    CREATE TABLE IF NOT EXISTS judgement_schemes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      alignment_weight REAL DEFAULT 0.25,
      feasibility_weight REAL DEFAULT 0.20,
      value_weight REAL DEFAULT 0.25,
      effort_weight REAL DEFAULT 0.15,
      innovation_weight REAL DEFAULT 0.15,
      relevance_threshold REAL DEFAULT 0.12,
      runs_config TEXT, -- JSON mapping
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migration: Add missing columns to players table if they don't exist
  try {
    const tableInfo = await db.execute("PRAGMA table_info(players)");
    const columns = tableInfo.rows.map((r: any) => r.name);

    if (!columns.includes('password')) {
      await db.execute("ALTER TABLE players ADD COLUMN password TEXT DEFAULT 'player2026'");
    }
    if (!columns.includes('role')) {
      await db.execute("ALTER TABLE players ADD COLUMN role TEXT DEFAULT 'PLAYER'");
    }
    if (!columns.includes('password_reset_required')) {
      await db.execute("ALTER TABLE players ADD COLUMN password_reset_required INTEGER DEFAULT 0");
    }

    // Unified Migration for Consolidated Schema
    const matchTableInfo = await db.execute("PRAGMA table_info(matches)");
    const matchColumns = matchTableInfo.rows.map((r: any) => r.name);

    // 1. Add missing columns to matches
    if (!matchColumns.includes('judgement_scheme_id')) {
      await db.execute("ALTER TABLE matches ADD COLUMN judgement_scheme_id TEXT REFERENCES judgement_schemes(id)");
    }
    if (!matchColumns.includes('title')) {
      await db.execute("ALTER TABLE matches ADD COLUMN title TEXT");
    }
    if (!matchColumns.includes('description')) {
      await db.execute("ALTER TABLE matches ADD COLUMN description TEXT");
    }
    if (!matchColumns.includes('points_weight')) {
      await db.execute("ALTER TABLE matches ADD COLUMN points_weight REAL DEFAULT 1.0");
    }
    if (!matchColumns.includes('question_timer')) {
      await db.execute("ALTER TABLE matches ADD COLUMN question_timer INTEGER DEFAULT 10");
    }
    if (!matchColumns.includes('mode')) {
      await db.execute("ALTER TABLE matches ADD COLUMN mode TEXT DEFAULT 'TEAM'");
    }
    if (!matchColumns.includes('conductor_id')) {
      await db.execute("ALTER TABLE matches ADD COLUMN conductor_id TEXT REFERENCES players(id)");
    }
    if (!matchColumns.includes('start_time')) {
      await db.execute("ALTER TABLE matches ADD COLUMN start_time DATETIME");
    }
    if (!matchColumns.includes('created_at')) {
      await db.execute("ALTER TABLE matches ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP");
    }

    // NEW MIGRATION: Backfill start_time from date for legacy matches
    if (matchColumns.includes('date')) {
      await db.execute("UPDATE matches SET start_time = date WHERE start_time IS NULL AND date IS NOT NULL");
    }

    // Optional: Cleanup month/date columns if they exist
    try {
      if (matchColumns.includes('month')) {
        await db.execute("ALTER TABLE matches DROP COLUMN month");
        console.log("Dropped 'month' column from matches.");
      }
      if (matchColumns.includes('date')) {
        await db.execute("ALTER TABLE matches DROP COLUMN date");
        console.log("Dropped 'date' column from matches.");
      }
    } catch (dropErr) {
      console.warn("Could not drop month/date columns (LibSQL version might not support it):", dropErr);
    }

    // Migration for teams table
    const teamsTableInfo = await db.execute("PRAGMA table_info(teams)");
    const teamsColumns = teamsTableInfo.rows.map((r: any) => r.name);
    if (!teamsColumns.includes('owner_id')) {
      await db.execute("ALTER TABLE teams ADD COLUMN owner_id TEXT");
    }
    if (!teamsColumns.includes('captain_id')) {
      await db.execute("ALTER TABLE teams ADD COLUMN captain_id TEXT");
    }

    // Migration: captains/owners -> players
    const ownersTableCheck = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='owners'");
    const captainsTableCheck = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='captains'");

    if (captainsTableCheck.rows.length > 0) {
      console.log("Migrating 'captains' table directly to 'players'...");
      try {
        await db.execute(`
          INSERT INTO players (id, name, password, password_reset_required, role, team_id)
          SELECT id, name, password, password_reset_required, 'OWNER', team_id 
          FROM captains 
          WHERE id NOT IN (SELECT id FROM players)
        `);
        await db.execute("DROP TABLE captains");
        console.log("Migration successful: 'captains' table dropped.");
      } catch (e) {
        console.error("Captains migration failed:", e);
      }
    }

    if (ownersTableCheck.rows.length > 0) {
      console.log("Migrating 'owners' table to 'players'...");
      try {
        await db.execute(`
          INSERT INTO players (id, name, password, password_reset_required, role, team_id)
          SELECT id, name, password, password_reset_required, role, team_id 
          FROM owners 
          WHERE id NOT IN (SELECT id FROM players)
        `);
        // We don't drop 'owners' here yet, it's in the cleanup list
        console.log("Owners migration successful.");
      } catch (e) {
        console.error("Owners migration failed:", e);
      }
    }

    // 2. Migrate individual_battles to matches
    const ibTableCheck = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='individual_battles'");
    if (ibTableCheck.rows.length > 0) {
      console.log("Migrating 'individual_battles' to 'matches'...");
      await db.execute(`
        INSERT INTO matches (id, title, description, points_weight, question_timer, mode, team1_id, team2_id, type, start_time, conductor_id, status, created_at)
        SELECT id, title, description, points_weight, question_timer, mode, team1_id, team2_id, battle_type, start_time, conductor_id, status, created_at
        FROM individual_battles
        WHERE id NOT IN (SELECT id FROM matches)
      `);
      // Update start_time if it was null (unlikely but safe)
      await db.execute("UPDATE matches SET start_time = created_at WHERE start_time IS NULL AND type != 'LEAGUE'");
      console.log("Migrated battles successfully.");
    }

    // 3. Migrate individual_battle_scores to scores
    const ibsTableCheck = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='individual_battle_scores'");
    if (ibsTableCheck.rows.length > 0) {
      console.log("Migrating 'individual_battle_scores' to 'scores'...");
      await db.execute(`
        INSERT INTO scores (id, match_id, player_id, team_id, score, points, nrr_contribution, created_at)
        SELECT id, battle_id, player_id, team_id, score, points, nrr_contribution, created_at
        FROM individual_battle_scores
        WHERE id NOT IN (SELECT id FROM scores)
      `);
      console.log("Migrated scores successfully.");
    }

    // 4. Cleanup old tables individually
    const cleanupTables = [
      'individual_battles',
      'individual_battle_scores',
      'individual_battle_scores_table',
      'individual_battle_team_stats',
      'individual_battle_answers_old',
      'owners'
    ];

    try {
      await db.execute("PRAGMA foreign_keys = OFF");
      for (const tableName of cleanupTables) {
        const tableCheck = await db.execute({
          sql: "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
          args: [tableName]
        });
        if (tableCheck.rows.length > 0) {
          console.log(`Dropping legacy table '${tableName}'...`);
          try {
            await db.execute(`DROP TABLE IF EXISTS ${tableName}`);
            console.log(`Dropped '${tableName}' successfully.`);
          } catch (dropError) {
            console.warn(`Failed to drop '${tableName}':`, dropError);
          }
        }
      }
    } finally {
      await db.execute("PRAGMA foreign_keys = ON");
    }

    // Migration: Fix Foreign Keys for individual_battle_answers and battle_questions
    // These might still point to the dropped 'individual_battles' table, causing "no such table" errors.
    const fkCheckAnswers = await db.execute("PRAGMA foreign_key_list(individual_battle_answers)");
    const fkCheckQuestions = await db.execute("PRAGMA foreign_key_list(battle_questions)");
    const needsFkFix = fkCheckAnswers.rows.some((r: any) => r.table === 'individual_battles') ||
      fkCheckQuestions.rows.some((r: any) => r.table === 'individual_battles');

    if (needsFkFix) {
      console.log("Fixing Foreign Keys for 'individual_battle_answers' and 'battle_questions'...");
      try {
        await db.execute("PRAGMA foreign_keys = OFF");

        // 1. Recreate battle_questions
        await db.execute("DROP TABLE IF EXISTS battle_questions_old");
        await db.execute("ALTER TABLE battle_questions RENAME TO battle_questions_old");
        await db.execute(`
          CREATE TABLE battle_questions (
            id TEXT PRIMARY KEY,
            battle_id TEXT,
            question TEXT NOT NULL,
            options TEXT NOT NULL,
            correct_option INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (battle_id) REFERENCES matches(id)
          )
        `);
        await db.execute(`
          INSERT INTO battle_questions (id, battle_id, question, options, correct_option, created_at)
          SELECT id, battle_id, question, options, correct_option, created_at FROM battle_questions_old
        `);

        // 2. Recreate individual_battle_answers
        // Check columns first as they might have been added in a previous run
        const oldTableInfo = await db.execute("PRAGMA table_info(individual_battle_answers)");
        const hasAnswerCol = oldTableInfo.rows.some((r: any) => r.name === 'answer');
        const hasResponseTimeCol = oldTableInfo.rows.some((r: any) => r.name === 'response_time');

        await db.execute("DROP TABLE IF EXISTS individual_battle_answers_old_recreate");
        await db.execute("ALTER TABLE individual_battle_answers RENAME TO individual_battle_answers_old_recreate");
        await db.execute(`
          CREATE TABLE individual_battle_answers (
            id TEXT PRIMARY KEY,
            battle_id TEXT,
            question_id TEXT,
            player_id TEXT,
            is_correct INTEGER,
            runs_awarded INTEGER,
            answer TEXT,
            response_time REAL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (battle_id) REFERENCES matches(id),
            FOREIGN KEY (player_id) REFERENCES players(id),
            FOREIGN KEY (question_id) REFERENCES battle_questions(id)
          )
        `);

        // Prepare SELECT and INSERT columns based on what exists
        const selectCols = ['id', 'battle_id', 'question_id', 'player_id', 'is_correct', 'runs_awarded', 'created_at'];
        if (hasAnswerCol) selectCols.push('answer');
        if (hasResponseTimeCol) selectCols.push('response_time');

        const insertCols = ['id', 'battle_id', 'question_id', 'player_id', 'is_correct', 'runs_awarded', 'created_at'];
        if (hasAnswerCol) insertCols.push('answer');
        if (hasResponseTimeCol) insertCols.push('response_time');

        await db.execute(`
          INSERT INTO individual_battle_answers (${insertCols.join(', ')})
          SELECT ${selectCols.join(', ')} FROM individual_battle_answers_old_recreate
        `);

        // Cleanup
        await db.execute("DROP TABLE IF EXISTS battle_questions_old");
        await db.execute("DROP TABLE IF EXISTS individual_battle_answers_old_recreate");

        console.log("Foreign Keys fixed successfully.");
      } catch (e) {
        console.error("Failed to fix Foreign Keys:", e);
      } finally {
        await db.execute("PRAGMA foreign_keys = ON");
      }
    } else {
      // If we didn't recreate, we still might need to add columns to the existing table
      // (This covers the case where the FK was already matches(id) but columns were missing)
      const answersTableInfo = await db.execute("PRAGMA table_info(individual_battle_answers)");
      const answersColumns = answersTableInfo.rows.map((r: any) => r.name);
      if (!answersColumns.includes('answer')) {
        await db.execute("ALTER TABLE individual_battle_answers ADD COLUMN answer TEXT");
      }
      if (!answersColumns.includes('response_time')) {
        await db.execute("ALTER TABLE individual_battle_answers ADD COLUMN response_time REAL");
      }
    }

    // Default Judgement Scheme
    const schemeRs = await db.execute("SELECT count(*) as count FROM judgement_schemes");
    if ((schemeRs.rows[0] as any).count === 0) {
      await db.execute({
        sql: `INSERT INTO judgement_schemes (id, name, alignment_weight, feasibility_weight, value_weight, effort_weight, innovation_weight, relevance_threshold, is_default) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [crypto.randomUUID(), 'Standard Innovation', 0.25, 0.20, 0.25, 0.15, 0.15, 0.12, 1]
      });
    }
  } catch (e) {
    console.error("Migration error:", e);
  }
  isInitialized = true;
};

// Auto-initialize if running locally or if needed (optimized for serverless to skip if possible, but keeping simple for now)
// Note: In serverless, top-level await is not always safe for side effects. 
// We export initDb and should call it on server start or in specific routes.
// For backward compatibility during migration, we just export db.

export default db;
