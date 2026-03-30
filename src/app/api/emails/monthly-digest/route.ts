import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sendMail } from '@/lib/email';
import { sendTeamsNotification } from '@/lib/msteams';
import { getMonthlyDigestTemplate } from '@/lib/emailTemplates';
import { GET as getLeaderboard } from '@/app/api/league/leaderboard/route';

export async function POST(request: Request) {
    try {
        const input = await request.json().catch(() => ({}));
        const trialEmail = input.trialEmail;

        const session = await getSession();
        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        // Fetch EXACT overall rankings directly from the existing leaderboard API to ensure parity.
        const lbRes = await getLeaderboard();
        const lbData = await lbRes.json();
        
        // Format them as expected by the template
        const topPlayersOverall = (lbData.players || []).slice(0, 3).map((p: any) => ({
            name: p.name,
            total_runs: p.total_points
        }));
        
        const topTeamsOverall = (lbData.teams || []).slice(0, 3).map((t: any) => ({
            name: t.name,
            total_points: t.points
        }));

        // Fetch Top 3 players THIS MONTH (Using same exact calculation logic but filtered)
        const topPlayersMonthRs = await db.execute(`
            SELECT p.name, COALESCE(SUM(combined.points), 0) as total_runs
            FROM players p
            JOIN (
                SELECT s.player_id, s.score as points 
                FROM scores s JOIN matches m ON s.match_id = m.id 
                WHERE DATE_TRUNC('month', m.start_time) = DATE_TRUNC('month', CURRENT_DATE) AND s.player_id IS NOT NULL AND m.status = 'COMPLETED'
                UNION ALL
                SELECT player_id, CASE WHEN admin_score > 0 THEN admin_score ELSE COALESCE(initial_score, 0) END as points 
                FROM hub_ideas 
                WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
            ) combined ON p.id = combined.player_id
            GROUP BY p.id, p.name
            ORDER BY total_runs DESC
            LIMIT 3
        `);

        // Fetch Top 3 teams THIS MONTH
        const topTeamsMonthRs = await db.execute(`
            SELECT t.name, COALESCE(SUM(s.points), 0) as total_points
            FROM teams t
            JOIN scores s ON s.team_id = t.id
            JOIN matches m ON s.match_id = m.id
            WHERE DATE_TRUNC('month', m.start_time) = DATE_TRUNC('month', CURRENT_DATE) AND m.status = 'COMPLETED'
            GROUP BY t.id, t.name
            ORDER BY total_points DESC
            LIMIT 3
        `);

        // Fetch all valid emails (players + admins)
        const playersRs = await db.execute(`SELECT email FROM players WHERE email IS NOT NULL`);
        const adminsRs = await db.execute(`SELECT email FROM admins WHERE email IS NOT NULL`);
        
        const allEmails = [
            ...playersRs.rows.map((r: any) => r.email),
            ...adminsRs.rows.map((r: any) => r.email)
        ];

        // Deduplicate
        let uniqueEmails = Array.from(new Set(allEmails));

        if (trialEmail) {
            uniqueEmails = [trialEmail];
        }

        if (uniqueEmails.length === 0) {
            return NextResponse.json({ success: true, message: 'No valid emails found.' });
        }

        const subject = `SIPL Monthly Newsletter & Highlights`;
        const html = getMonthlyDigestTemplate(
            topPlayersMonthRs.rows, 
            topTeamsMonthRs.rows,
            topPlayersOverall,
            topTeamsOverall
        );

        // We can send this via bcc or individually
        const emailPromises = uniqueEmails.map(email => sendMail(email, subject, html));
        await Promise.all(emailPromises);

        // Also ping MS Teams globally
        const mdTopPlayers = topPlayersMonthRs.rows.length > 0 
            ? topPlayersMonthRs.rows.map((p: any, i: number) => `${i+1}. **${p.name}** - ${p.total_runs} Runs`).join('\n')
            : 'No player data available.';

        const mdTopTeams = topTeamsMonthRs.rows.length > 0
            ? topTeamsMonthRs.rows.map((t: any, i: number) => `${i+1}. **${t.name}** - ${t.total_points} Points`).join('\n')
            : 'No team data available.';

        const teamsMessage = `What a fantastic month! Here are the top performers for this month.\n\n### 🏆 Top 3 Players (This Month)\n${mdTopPlayers}\n\n### 🛡️ Top 3 Teams (This Month)\n${mdTopTeams}\n\n**Upcoming Events**: Get ready for the next round of live battles and the upcoming mega auction. Stay tuned!`;
        
        if (!trialEmail) {
            await sendTeamsNotification(subject, teamsMessage);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error sending monthly digest:', error);
        return NextResponse.json({ error: 'Failed to send monthly digest' }, { status: 500 });
    }
}
