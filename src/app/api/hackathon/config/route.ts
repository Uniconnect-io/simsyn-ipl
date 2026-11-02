import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const DEFAULT_CONFIG = {
    id: 'default',
    briefing_date: '2026-10-20T00:00:00Z',
    submission_deadline: '2026-10-30T23:59:59Z',
    review_start_date: '2026-11-03T00:00:00Z',
    review_end_date: '2026-11-07T23:59:59Z',
    finale_date: '2026-11-17T09:00:00Z',
    submission_mode: 'AUTO_BY_DATE',
    teaser_popup_enabled: true,
    results_published: false,
    event_title: 'SIPL × UNICONNECT AI HACKATHON 2026',
    event_subtitle: 'Simsyn Innovation Premier League 2026',
    teaser_headline: 'SOMETHING BIG IS BREWING.',
    teaser_description: 'A revolutionary new challenge is coming to the Simsyn Innovation Premier League in collaboration with Uniconnect AI. Squads will go head-to-head to build, battle, and breakthrough.',
    meeting_url: '',
    tracks: [
        'External Industry Solutions (Customer CX)',
        'Internal Cost & Efficiency (Operations)'
    ],
    rubric: {
        problem_clarity: 20,
        uniconnect_alignment: 25,
        technical_feasibility: 20,
        innovation: 20,
        demo_polish: 15
    },
    max_team_size: 4,
    uniconnect_docs_url: 'https://uniconnect.cx'
};

export async function GET() {
    try {
        const rs = await db.execute(`SELECT * FROM hackathon_config WHERE id = 'default' LIMIT 1`);
        let cfg = rs.rows?.[0] || DEFAULT_CONFIG;

        // Parse JSON fields if stringified by Postgres client
        if (typeof cfg.tracks === 'string') {
            try { cfg.tracks = JSON.parse(cfg.tracks); } catch {}
        }
        if (typeof cfg.rubric === 'string') {
            try { cfg.rubric = JSON.parse(cfg.rubric); } catch {}
        }

        const now = Date.now();
        const briefingTime = new Date(cfg.briefing_date || '2026-10-20T00:00:00Z').getTime();
        const deadlineTime = new Date(cfg.submission_deadline || '2026-10-30T23:59:59Z').getTime();

        let isSubmissionsOpen = false;
        if (cfg.submission_mode === 'FORCE_OPEN') {
            isSubmissionsOpen = true;
        } else if (cfg.submission_mode === 'FORCE_CLOSED') {
            isSubmissionsOpen = false;
        } else {
            // AUTO_BY_DATE: open on/after Oct 20 briefing and before Oct 30 deadline
            isSubmissionsOpen = now >= briefingTime && now <= deadlineTime;
        }

        const isTeaserMode = !isSubmissionsOpen && now < briefingTime;

        return NextResponse.json({
            config: cfg,
            computed: {
                is_submissions_open: isSubmissionsOpen,
                is_teaser_mode: isTeaserMode,
                briefing_timestamp: briefingTime,
                deadline_timestamp: deadlineTime
            }
        });
    } catch (err: any) {
        console.error('Error fetching hackathon config:', err);
        return NextResponse.json({ config: DEFAULT_CONFIG, error: err.message }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userPerms = (session.user.permissions || '').split(',').map((p: string) => p.trim().toLowerCase());
        const isHackathonAdmin = session.user.username === 'admin' || session.user.name === 'admin' || userPerms.includes('all') || userPerms.includes('hackathon');
        if (!isHackathonAdmin) {
            return NextResponse.json({ error: 'Forbidden: Hackathon permission required' }, { status: 403 });
        }

        const body = await request.json();

        // Ensure row exists
        await db.execute(`
            INSERT INTO hackathon_config (id) VALUES ('default') ON CONFLICT (id) DO NOTHING
        `);

        const updateFields: string[] = [];
        const args: any[] = [];
        let i = 1;

        const allowedFields = [
            'briefing_date',
            'submission_deadline',
            'review_start_date',
            'review_end_date',
            'finale_date',
            'submission_mode',
            'teaser_popup_enabled',
            'results_published',
            'event_title',
            'event_subtitle',
            'teaser_headline',
            'teaser_description',
            'meeting_url',
            'tracks',
            'rubric',
            'max_team_size',
            'uniconnect_docs_url'
        ];

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updateFields.push(`${field} = $${i++}`);
                if (field === 'tracks' || field === 'rubric') {
                    args.push(typeof body[field] === 'string' ? body[field] : JSON.stringify(body[field]));
                } else {
                    args.push(body[field]);
                }
            }
        }

        if (updateFields.length === 0) {
            return NextResponse.json({ error: 'No fields provided for update' }, { status: 400 });
        }

        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        args.push('default');

        const sql = `
            UPDATE hackathon_config
            SET ${updateFields.join(', ')}
            WHERE id = $${i}
            RETURNING *
        `;

        const rs = await db.execute({ sql, args });

        return NextResponse.json({
            success: true,
            config: rs.rows?.[0]
        });
    } catch (err: any) {
        console.error('Error updating hackathon config:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
