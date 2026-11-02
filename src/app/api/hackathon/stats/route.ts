import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
    try {
        const statsRs = await db.execute(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'SUBMITTED' THEN 1 END) as submitted,
                COUNT(CASE WHEN status = 'UNDER_REVIEW' THEN 1 END) as under_review,
                COUNT(CASE WHEN status = 'SHORTLISTED' THEN 1 END) as shortlisted,
                COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected
            FROM hackathon_proposals
        `);

        let cfgRs;
        try {
            cfgRs = await db.execute(`SELECT * FROM hackathon_config WHERE id = 'default' LIMIT 1`);
        } catch {}
        const cfg = cfgRs?.rows?.[0] || {};

        const briefingDate = cfg.briefing_date || '2026-10-20T00:00:00Z';
        const deadlineDate = cfg.submission_deadline || '2026-10-30T23:59:59Z';
        const reviewStart = cfg.review_start_date || '2026-11-03T00:00:00Z';
        const reviewEnd = cfg.review_end_date || '2026-11-07T23:59:59Z';
        const finaleDate = cfg.finale_date || '2026-11-17T09:00:00Z';

        const formatDateLabel = (iso: string) => {
            try {
                const d = new Date(iso);
                return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            } catch {
                return iso;
            }
        };

        const timeline = [
            {
                date: briefingDate,
                label: formatDateLabel(briefingDate),
                title: 'Event Briefing & Kickoff',
                description: 'Official introduction to the hackathon themes, Uniconnect architecture, problem scope, and rules.',
                status: 'UPCOMING',
                isMilestone: true
            },
            {
                date: deadlineDate,
                label: formatDateLabel(deadlineDate),
                title: 'Proposal Submission Deadline',
                description: 'All teams must submit problem statement, proposed solution, and Uniconnect integration plan.',
                status: cfg.submission_mode === 'FORCE_OPEN' ? 'OPEN' : 'UPCOMING',
                isMilestone: true,
                isNextTarget: true
            },
            {
                date: reviewStart,
                endDate: reviewEnd,
                label: `${formatDateLabel(reviewStart)} – ${formatDateLabel(reviewEnd)}`,
                title: 'Proposal Review & Shortlisting',
                description: 'Admin and Technical Council review all proposals against criteria and announce finalists.',
                status: 'PENDING',
                isMilestone: true
            },
            {
                date: finaleDate,
                label: formatDateLabel(finaleDate),
                title: 'Grand Finale: Build & Demo Day',
                description: 'Shortlisted teams install Uniconnect on premise/cloud, build their functional prototypes, and pitch live demos to leadership.',
                status: 'PENDING',
                isMilestone: true
            }
        ];

        return NextResponse.json({
            stats: statsRs.rows[0] || { total: 0, submitted: 0, under_review: 0, shortlisted: 0, rejected: 0 },
            timeline,
            event: {
                name: cfg.event_title || 'SIPL Hackathon 2026',
                subtitle: cfg.event_subtitle || 'Simsyn Innovation Premier League × Uniconnect AI',
                tagline: 'Solving Real Business Problems. Powered by Uniconnect.',
                currentPhase: cfg.submission_mode === 'FORCE_OPEN' ? 'Proposal Submission Open (Unlocked)' : 'Teaser Phase (Briefing Oct 20)',
                submissionDeadline: deadlineDate,
                submissionMode: cfg.submission_mode || 'AUTO_BY_DATE',
                meetingUrl: cfg.meeting_url || ''
            }
        });
    } catch (error: any) {
        console.error('Error fetching hackathon stats:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch stats' }, { status: 500 });
    }
}
