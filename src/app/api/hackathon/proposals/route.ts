import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

function hasHackathonPermission(session: any): boolean {
    if (!session?.user || session.user.role !== 'ADMIN') return false;
    const user = session.user;
    if (user.username === 'admin' || user.name === 'admin') return true;
    const perms = (user.permissions || '').split(',').map((p: string) => p.trim().toLowerCase());
    return perms.includes('all') || perms.includes('hackathon');
}

export async function GET(request: Request) {
    try {
        const session = await getSession();
        const { searchParams } = new URL(request.url);
        
        const search = searchParams.get('search') || '';
        const status = searchParams.get('status') || '';
        const track = searchParams.get('track') || '';
        const teamId = searchParams.get('teamId') || '';
        const scope = searchParams.get('scope') || ''; // 'my' | 'shortlisted' | 'all'
        const id = searchParams.get('id') || '';

        // If querying single proposal by ID
        if (id) {
            const rs = await db.execute({
                sql: `SELECT hp.*, t.name as team_name_ref, p.name as owner_name_ref
                      FROM hackathon_proposals hp
                      LEFT JOIN teams t ON hp.team_id = t.id
                      LEFT JOIN players p ON hp.owner_id = p.id
                      WHERE hp.id = ?`,
                args: [id]
            });
            if (rs.rows.length === 0) {
                return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
            }
            return NextResponse.json({ proposal: rs.rows[0] });
        }

        let whereClause = 'WHERE 1=1';
        const args: any[] = [];

        const isHackathonAdmin = hasHackathonPermission(session);

        // Visibility rules
        if (scope === 'shortlisted') {
            whereClause += " AND hp.status = 'SHORTLISTED'";
        } else if (scope === 'my') {
            if (!session) {
                return NextResponse.json({ error: 'Authentication required for scope=my' }, { status: 401 });
            }
            if (session.user.team_id) {
                whereClause += ' AND (hp.team_id = ? OR hp.owner_id = ?)';
                args.push(session.user.team_id, session.user.id);
            } else {
                whereClause += ' AND hp.owner_id = ?';
                args.push(session.user.id);
            }
        } else if (scope === 'all') {
            if (!isHackathonAdmin) {
                return NextResponse.json({ error: 'Unauthorized: Hackathon permission required' }, { status: 403 });
            }
        } else if (!isHackathonAdmin) {
            // Non-admin or admin without hackathon permission requesting default:
            // If logged in owner/player, return their own proposals OR any shortlisted
            if (session?.user?.team_id) {
                whereClause += " AND (hp.team_id = ? OR hp.owner_id = ? OR hp.status = 'SHORTLISTED')";
                args.push(session.user.team_id, session.user.id);
            } else if (session?.user?.id) {
                whereClause += " AND (hp.owner_id = ? OR hp.status = 'SHORTLISTED')";
                args.push(session.user.id);
            } else {
                // Public visitors only see shortlisted proposals
                whereClause += " AND hp.status = 'SHORTLISTED'";
            }
        }

        if (status && status !== 'ALL') {
            whereClause += ' AND hp.status = ?';
            args.push(status);
        }

        if (track && track !== 'ALL') {
            whereClause += ' AND hp.track = ?';
            args.push(track);
        }

        if (teamId) {
            whereClause += ' AND hp.team_id = ?';
            args.push(teamId);
        }

        if (search) {
            whereClause += ' AND (hp.title ILIKE ? OR hp.problem_statement ILIKE ? OR hp.proposed_solution ILIKE ? OR hp.team_name ILIKE ? OR hp.owner_name ILIKE ?)';
            args.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }

        const proposalsRs = await db.execute({
            sql: `
                SELECT 
                    hp.*, 
                    t.name as current_team_name,
                    p.name as current_owner_name
                FROM hackathon_proposals hp
                LEFT JOIN teams t ON hp.team_id = t.id
                LEFT JOIN players p ON hp.owner_id = p.id
                ${whereClause}
                ORDER BY 
                    CASE 
                        WHEN hp.status = 'SHORTLISTED' THEN 1 
                        WHEN hp.status = 'SUBMITTED' THEN 2
                        WHEN hp.status = 'UNDER_REVIEW' THEN 3
                        ELSE 4 
                    END,
                    hp.score DESC,
                    hp.created_at DESC
            `,
            args
        });

        // Get aggregate statistics
        const statsRs = await db.execute(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'SUBMITTED' THEN 1 END) as submitted,
                COUNT(CASE WHEN status = 'UNDER_REVIEW' THEN 1 END) as under_review,
                COUNT(CASE WHEN status = 'SHORTLISTED' THEN 1 END) as shortlisted,
                COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected
            FROM hackathon_proposals
        `);

        return NextResponse.json({
            proposals: proposalsRs.rows,
            stats: statsRs.rows[0] || { total: 0, submitted: 0, under_review: 0, shortlisted: 0, rejected: 0 }
        });

    } catch (error: any) {
        console.error('Error fetching hackathon proposals:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch proposals' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getSession();
        const body = await request.json();

        const {
            title,
            track,
            problem_statement,
            proposed_solution,
            uniconnect_usage,
            impact_value = '',
            tech_stack = '',
            repo_or_demo_url = '',
            team_members = [],
            contact_email = ''
        } = body;

        const effectiveTrack = track || 'Uniconnect AI Innovation';

        if (!title || !problem_statement || !proposed_solution || !uniconnect_usage || !impact_value) {
            return NextResponse.json({
                error: 'Please complete all required fields: Proposal Title, Problem Statement, Proposed Solution, Uniconnect Usage, and Expected Value / Impact.'
            }, { status: 400 });
        }

        // Determine team and owner information
        let teamId = body.team_id || (session?.user?.team_id || null);
        let ownerId = body.owner_id || (session?.user?.id || null);
        let teamName = body.team_name || '';
        let ownerName = body.owner_name || (session?.user?.name || 'Anonymous Lead');

        // Look up team name if teamId exists but teamName is empty
        if (teamId && !teamName) {
            const teamRs = await db.execute({
                sql: 'SELECT name FROM teams WHERE id = ?',
                args: [teamId]
            });
            if (teamRs.rows.length > 0) {
                teamName = (teamRs.rows[0] as any).name;
            }
        }

        // If logged in owner/player didn't specify contact_email, try to find it
        let email = contact_email;
        if (!email && ownerId) {
            const playerRs = await db.execute({
                sql: 'SELECT email, name FROM players WHERE id = ?',
                args: [ownerId]
            });
            if (playerRs.rows.length > 0) {
                email = (playerRs.rows[0] as any).email || '';
                if (!ownerName) ownerName = (playerRs.rows[0] as any).name;
            }
        }

        const insertRs = await db.execute({
            sql: `
                INSERT INTO hackathon_proposals (
                    team_id,
                    owner_id,
                    team_name,
                    owner_name,
                    contact_email,
                    title,
                    track,
                    problem_statement,
                    proposed_solution,
                    uniconnect_usage,
                    impact_value,
                    tech_stack,
                    repo_or_demo_url,
                    team_members,
                    status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, 'SUBMITTED')
                RETURNING *
            `,
            args: [
                teamId,
                ownerId,
                teamName || 'Unassigned Team',
                ownerName || 'Team Lead',
                email || '',
                title.trim(),
                effectiveTrack.trim(),
                problem_statement.trim(),
                proposed_solution.trim(),
                uniconnect_usage.trim(),
                impact_value.trim(),
                tech_stack.trim(),
                repo_or_demo_url.trim(),
                JSON.stringify(Array.isArray(team_members) ? team_members : [])
            ]
        });

        const created = insertRs.rows[0];
        return NextResponse.json({
            message: 'Proposal successfully submitted for SIPL Hackathon 2026!',
            proposal: created
        }, { status: 201 });

    } catch (error: any) {
        console.error('Error creating hackathon proposal:', error);
        return NextResponse.json({ error: error.message || 'Failed to submit proposal' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const session = await getSession();
        const body = await request.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json({ error: 'Proposal ID is required' }, { status: 400 });
        }

        // Verify existing proposal
        const existingRs = await db.execute({
            sql: 'SELECT * FROM hackathon_proposals WHERE id = ?',
            args: [id]
        });
        if (existingRs.rows.length === 0) {
            return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
        }
        const existing = existingRs.rows[0] as any;

        const isHackathonAdmin = hasHackathonPermission(session);
        const isOwner = session?.user?.id === existing.owner_id || (session?.user?.team_id && session?.user?.team_id === existing.team_id);

        if (!isHackathonAdmin && !isOwner) {
            return NextResponse.json({ error: 'Unauthorized to update this proposal' }, { status: 403 });
        }

        // Admin evaluation fields
        if (isHackathonAdmin && (body.status !== undefined || body.score !== undefined || body.admin_feedback !== undefined || body.score_breakdown !== undefined)) {
            const status = body.status !== undefined ? body.status : existing.status;
            const score = body.score !== undefined ? Number(body.score) : existing.score;
            const adminFeedback = body.admin_feedback !== undefined ? body.admin_feedback : existing.admin_feedback;
            const scoreBreakdown = body.score_breakdown !== undefined ? JSON.stringify(body.score_breakdown) : JSON.stringify(existing.score_breakdown || {});
            const reviewer = session.user.name || session.user.username || 'Admin';

            const updateRs = await db.execute({
                sql: `
                    UPDATE hackathon_proposals
                    SET status = ?,
                        score = ?,
                        admin_feedback = ?,
                        score_breakdown = ?::jsonb,
                        reviewed_by = ?,
                        reviewed_at = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    RETURNING *
                `,
                args: [status, score, adminFeedback, scoreBreakdown, reviewer, id]
            });

            return NextResponse.json({
                message: 'Review saved successfully',
                proposal: updateRs.rows[0]
            });
        }

        // Team Owner editing proposal content
        if (isOwner) {
            const title = body.title !== undefined ? body.title : existing.title;
            const track = body.track !== undefined ? body.track : existing.track;
            const problemStatement = body.problem_statement !== undefined ? body.problem_statement : existing.problem_statement;
            const proposedSolution = body.proposed_solution !== undefined ? body.proposed_solution : existing.proposed_solution;
            const uniconnectUsage = body.uniconnect_usage !== undefined ? body.uniconnect_usage : existing.uniconnect_usage;
            const impactValue = body.impact_value !== undefined ? body.impact_value : existing.impact_value;
            const techStack = body.tech_stack !== undefined ? body.tech_stack : existing.tech_stack;
            const repoOrDemoUrl = body.repo_or_demo_url !== undefined ? body.repo_or_demo_url : existing.repo_or_demo_url;
            const teamMembers = body.team_members !== undefined ? JSON.stringify(body.team_members) : JSON.stringify(existing.team_members || []);
            const contactEmail = body.contact_email !== undefined ? body.contact_email : existing.contact_email;

            const updateRs = await db.execute({
                sql: `
                    UPDATE hackathon_proposals
                    SET title = ?,
                        track = ?,
                        problem_statement = ?,
                        proposed_solution = ?,
                        uniconnect_usage = ?,
                        impact_value = ?,
                        tech_stack = ?,
                        repo_or_demo_url = ?,
                        team_members = ?::jsonb,
                        contact_email = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    RETURNING *
                `,
                args: [
                    title,
                    track,
                    problemStatement,
                    proposedSolution,
                    uniconnectUsage,
                    impactValue,
                    techStack,
                    repoOrDemoUrl,
                    teamMembers,
                    contactEmail,
                    id
                ]
            });

            return NextResponse.json({
                message: 'Proposal updated successfully',
                proposal: updateRs.rows[0]
            });
        }

        return NextResponse.json({ error: 'No permitted updates provided' }, { status: 400 });

    } catch (error: any) {
        console.error('Error updating hackathon proposal:', error);
        return NextResponse.json({ error: error.message || 'Failed to update proposal' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Proposal ID is required' }, { status: 400 });
        }

        const existingRs = await db.execute({
            sql: 'SELECT * FROM hackathon_proposals WHERE id = ?',
            args: [id]
        });
        if (existingRs.rows.length === 0) {
            return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
        }
        const existing = existingRs.rows[0] as any;

        const isHackathonAdmin = hasHackathonPermission(session);
        const isOwner = session.user.id === existing.owner_id;

        if (!isHackathonAdmin && !isOwner) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await db.execute({
            sql: 'DELETE FROM hackathon_proposals WHERE id = ?',
            args: [id]
        });

        return NextResponse.json({ message: 'Proposal deleted successfully' });

    } catch (error: any) {
        console.error('Error deleting proposal:', error);
        return NextResponse.json({ error: error.message || 'Failed to delete proposal' }, { status: 500 });
    }
}
