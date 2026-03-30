import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sendMail } from '@/lib/email';
import { getWeeklyDigestTemplate } from '@/lib/emailTemplates';
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
        const leaderboardPlayers = lbData.players || [];
        const leaderboardTeams = lbData.teams || [];

        // Fetch time-filtered points (This week and this month)
        const timeFilteredRs = await db.execute(`
            SELECT 
                p.id as player_id,
                p.name,
                p.email,
                t.name as team_name,
                COALESCE(SUM(combined.points) FILTER (WHERE DATE_TRUNC('week', combined.event_time) = DATE_TRUNC('week', CURRENT_DATE)), 0) as points_this_week,
                COALESCE(SUM(combined.points) FILTER (WHERE DATE_TRUNC('month', combined.event_time) = DATE_TRUNC('month', CURRENT_DATE)), 0) as points_this_month
            FROM players p
            LEFT JOIN teams t ON p.team_id = t.id
            LEFT JOIN (
                SELECT s.player_id, s.score as points, m.start_time as event_time 
                FROM scores s JOIN matches m ON s.match_id = m.id 
                WHERE s.player_id IS NOT NULL AND m.status = 'COMPLETED'
                UNION ALL
                SELECT player_id, CASE WHEN admin_score > 0 THEN admin_score ELSE COALESCE(initial_score, 0) END as points, created_at as event_time 
                FROM hub_ideas 
            ) combined ON p.id = combined.player_id
            WHERE p.email IS NOT NULL
            GROUP BY p.id, p.name, p.email, t.name
        `);

        // Map over the time filtered players and attach their leaderboard ranks
        let players = timeFilteredRs.rows.map((pStat: any) => {
            // Global Rank
            const overallIndex = leaderboardPlayers.findIndex((lp: any) => lp.name === pStat.name);
            const overall_rank = overallIndex >= 0 ? overallIndex + 1 : '-';
            
            const lbPlayer = overallIndex >= 0 ? leaderboardPlayers[overallIndex] : null;
            // The standings API calls player runs "total_points" internally
            const total_runs = lbPlayer ? lbPlayer.total_points : 0; 

            // Rank in team
            let rank_in_team: number | string = '-';
            if (lbPlayer && lbPlayer.team_id) {
                // The leaderboardPlayers is already sorted by total_points DESC
                const teamMates = leaderboardPlayers.filter((lp: any) => lp.team_id === lbPlayer.team_id);
                const teamMateIndex = teamMates.findIndex((lp: any) => lp.name === pStat.name);
                rank_in_team = teamMateIndex >= 0 ? teamMateIndex + 1 : '-';
            }

            // Team Standing
            const teamIndex = leaderboardTeams.findIndex((lt: any) => lt.name === pStat.team_name);
            const team_standing = teamIndex >= 0 ? teamIndex + 1 : '-';
            const lbTeam = teamIndex >= 0 ? leaderboardTeams[teamIndex] : null;
            const total_points = lbTeam ? lbTeam.points : 0;

            return {
                ...pStat,
                overall_rank,
                rank_in_team,
                team_standing,
                total_runs,
                total_points
            };
        });

        if (players.length === 0) {
            return NextResponse.json({ success: true, message: 'No players with emails found.' });
        }

        if (trialEmail) {
            // For a safe trial, sample up to 3 players but send all templates to the trialEmail address
            players = players.slice(0, 3);
            players.forEach((p: any) => p.email = trialEmail);
        }

        // Send a personalized email to each player
        const emailPromises = players.map(async (player: any) => {
            const subject = `Weekly SIPL Digest: Your Stats & Rankings`;
            const html = getWeeklyDigestTemplate(player);

            return sendMail(player.email, subject, html);
        });

        await Promise.all(emailPromises);

        return NextResponse.json({ success: true, count: players.length });
    } catch (error) {
        console.error('Error sending weekly digest:', error);
        return NextResponse.json({ error: 'Failed to send weekly digest' }, { status: 500 });
    }
}
