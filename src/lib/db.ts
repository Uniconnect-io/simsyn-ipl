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
    client.release();
    console.log("🐘 Database pool initialized successfully.");
    isInitialized = true;
  } catch (err) {
    console.error("❌ Database connection failed:", err);
    throw err; // Better to throw so the API fails properly
  }
};

// Helper: Convert LibSQL style '?' params to Postgres '$1, $2'
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
