import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import OpenAI from "openai";
import crypto from 'crypto';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

async function getIdeaScoreAndFeedback(title: string, content: string) {
    if (!openai) {
        // Mock scoring logic for testing if no API key
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

        const result = JSON.parse(response.choices[0].message.content!);
        return result;
    } catch (e) {
        console.error('AI Scoring error:', e);
        return { score: 1, feedback: "Error during AI evaluation. Assigned base score." };
    }
}

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id, title, content } = await request.json();

        if (!title || !content) {
            return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
        }

        if (content.length < 20) {
            return NextResponse.json({ error: 'Idea content is too short (min 20 characters)' }, { status: 400 });
        }

        const playerId = session.user.id;

        // If editing/resubmitting
        if (id) {
            const existingRs = await db.execute({
                sql: 'SELECT status, admin_score FROM hub_ideas WHERE id = ? AND player_id = ?',
                args: [id, playerId]
            });

            if (existingRs.rows.length === 0) {
                return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
            }

            const existing = existingRs.rows[0];
            if (existing.status === 'APPROVED' || existing.status === 'REJECTED' || (existing.admin_score && existing.admin_score > 0)) {
                return NextResponse.json({ error: 'This idea is frozen and cannot be edited.' }, { status: 403 });
            }
        }

        // AI Evaluation
        const { score, feedback } = await getIdeaScoreAndFeedback(title, content);

        if (id) {
            // Update existing
            await db.execute({
                sql: `
                    UPDATE hub_ideas 
                    SET title = ?, content = ?, initial_score = ?, feedback = ?, status = 'PENDING', created_at = NOW()
                    WHERE id = ? AND player_id = ?
                `,
                args: [title, content, score, feedback, id, playerId]
            });

            return NextResponse.json({
                success: true,
                ideaId: id,
                score,
                feedback,
                isUpdate: true
            });
        } else {
            // Insert new
            const ideaId = crypto.randomUUID();
            await db.execute({
                sql: `
                    INSERT INTO hub_ideas (id, player_id, title, content, initial_score, feedback, status)
                    VALUES (?, ?, ?, ?, ?, ?, 'PENDING')
                `,
                args: [ideaId, playerId, title, content, score, feedback]
            });

            return NextResponse.json({
                success: true,
                ideaId,
                score,
                feedback
            });
        }

    } catch (error) {
        console.error('Idea submission error:', error);
        return NextResponse.json({ error: 'Failed to submit idea' }, { status: 500 });
    }
}
