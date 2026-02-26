import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getIdeaScoreAndFeedback } from '@/lib/ai';

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
