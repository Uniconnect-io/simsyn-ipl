import 'dotenv/config';
import pg from 'pg';
import OpenAI from "openai";
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const { Pool } = pg;

// Configuration
const CSV_PATH = path.resolve('public/assets/ideas_export_1.csv');
const ERROR_CSV_PATH = path.resolve('public/assets/ideas_migration_errors.csv');
const DRY_RUN = process.argv.includes('--dry-run');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// robust enough for this specific CSV
function manualParse(content) {
    const rawRows = content.split(/\n(?=")/);
    const records = [];

    for (const r of rawRows) {
        const fields = [];
        const fieldMatch = r.matchAll(/"((?:[^"]|"")*)"/gs);
        for (const m of fieldMatch) {
            fields.push(m[1].replace(/""/g, '"'));
        }
        if (fields.length >= 3) {
            records.push(fields);
        }
    }
    return records;
}

async function getIdeaScoreAndFeedback(title, content) {
    if (!openai) {
        return {
            score: 1,
            feedback: "AI scoring is currently disabled. Default score assigned."
        };
    }

    const prompt = `
You are an expert innovation judge for UniConnect, a customer engagement and contact center platform.
Evaluate the following idea based on its alignment with the UniConnect roadmap and the contact center domain.

Criteria:
1. Alignment: Does it fit the contact center / customer engagement domain?
2. Uniqueness: Is it a novel idea or something very common?
3. Detail: Is the idea well-explained or just a one-liner?
4. Effort: Is it relatively low effort to implement but high value?

Scoring Rules (Strict):
- 6: Unique, detailed, high-value, and low implemention effort.
- 4: Very good idea, relevant, and well-thought-out.
- 3: Good idea, but might be common or require significant effort.
- 2: Relevant but basic or lacks detail.
- 1: Generic ideas (e.g., "enable audit logs", "add reporting") or "too generic" (e.g., "implement AI", "make it faster").
- 0: Irrelevant to the domain or nonsense.

Idea Title: ${title}
Idea Content: ${content}

Return a JSON object with:
{
  "score": number (0, 1, 2, 3, 4, or 6),
  "feedback": "A concise 2-3 sentence explanation of the score and suggestions for improvement."
}
`;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: "You are a strict innovation judge for a contact center tech platform." },
                { role: "user", content: prompt }
            ],
        });

        const result = JSON.parse(response.choices[0].message.content);
        return result;
    } catch (e) {
        console.error('AI Scoring error:', e);
        return { score: 1, feedback: "Error during AI evaluation. Assigned base score." };
    }
}

async function run() {
    console.log(`Starting migration (Dry Run: ${DRY_RUN})`);

    // 1. Fetch Players for Matching
    const playerRes = await pool.query('SELECT id, name FROM players');
    const playerMap = new Map();
    playerRes.rows.forEach(p => {
        playerMap.set(p.name.toLowerCase().trim(), p.id);
    });

    // 2. Read and Parse CSV
    const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
    const records = manualParse(csvContent);

    const errors = [];
    let successCount = 0;

    for (const [index, row] of records.entries()) {
        const [title, content, authorName] = row;

        if (!title || !content || !authorName) {
            continue;
        }

        const normalizedAuthor = authorName.trim().toLowerCase();
        const playerId = playerMap.get(normalizedAuthor);

        if (!playerId) {
            console.warn(`Row ${index + 1}: Player not found: ${authorName}`);
            errors.push({ title, content, author: authorName, error: 'Player matching failed' });
            continue;
        }

        // Avoid duplicates if title exists for this player
        const existsRes = await pool.query('SELECT id FROM hub_ideas WHERE player_id = $1 AND title = $2', [playerId, title]);
        if (existsRes.rows.length > 0) {
            console.log(`Row ${index + 1}: Idea already exists, skipping: ${title}`);
            successCount++;
            continue;
        }

        console.log(`Row ${index + 1}: Processing idea "${title}" for ${authorName}`);

        try {
            // 3. AI Evaluation
            const { score, feedback } = await getIdeaScoreAndFeedback(title, content);

            if (!DRY_RUN) {
                // 4. Insert into DB
                const id = crypto.randomUUID();
                await pool.query(
                    'INSERT INTO hub_ideas (id, player_id, title, content, initial_score, feedback, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                    [id, playerId, title, content, score, feedback, 'PENDING']
                );
            } else {
                console.log(`[DRY RUN] Would insert idea: ${title} | Score: ${score}`);
            }

            successCount++;
        } catch (err) {
            console.error(`Row ${index + 1}: Failed to process`, err);
            errors.push({ title, content, author: authorName, error: err.message });
        }
    }

    // 5. Write Errors to CSV
    if (errors.length > 0) {
        let errorContent = "Title,Content,Author,Error\n";
        errors.forEach(e => {
            const escape = (val) => `"${(val || "").toString().replace(/"/g, '""')}"`;
            errorContent += `${escape(e.title)},${escape(e.content)},${escape(e.author)},${escape(e.error)}\n`;
        });
        fs.writeFileSync(ERROR_CSV_PATH, errorContent);
        console.log(`Migration finished with ${errors.length} errors. Errors written to ${ERROR_CSV_PATH}`);
    } else {
        console.log('Migration finished successfully with no errors.');
    }

    console.log(`Summary: ${successCount} ideas processed successfully.`);
    await pool.end();
}

run().catch(err => {
    console.error('Migration crashed:', err);
    process.exit(1);
});
