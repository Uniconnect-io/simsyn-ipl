import fs from 'fs';
import path from 'path';

const ROOT_URL = 'https://sipl.uniconnect.io';
const SIPL_LOGO = `${ROOT_URL}/assets/logo.png`;

const getAvatarUrl = (name: string) => {
    if (!name) return `https://api.dicebear.com/9.x/bottts/png?seed=NA&backgroundColor=e53e3e`;
    const firstName = name.split(' ')[0].toLowerCase().trim();
    
    try {
        const localPath = path.join(process.cwd(), 'public', 'assets', 'employee', `${firstName}.png`);
        if (fs.existsSync(localPath)) {
            return `${ROOT_URL}/assets/employee/${firstName}.png`;
        }
    } catch (e) {
        // Fail silently and use DiceBear
    }

    // Replace spaces with + for URL query safety
    return `https://api.dicebear.com/9.x/bottts/png?seed=${encodeURIComponent(name)}&backgroundColor=e53e3e`;
};

const getTeamLogoUrl = (teamName: string) => {
    if (!teamName || teamName === 'Free Agent') return `https://api.dicebear.com/9.x/initials/png?seed=FA&backgroundColor=2b6cb0`;
    const formatted = teamName.toLowerCase().replace(/\s+/g, '_').trim();
    
    try {
        const localPath = path.join(process.cwd(), 'public', 'assets', 'teamlogos', `${formatted}.png`);
        if (fs.existsSync(localPath)) {
            return `${ROOT_URL}/assets/teamlogos/${formatted}.png`;
        }
    } catch (e) {
        // Fail silently and use DiceBear
    }

    return `https://api.dicebear.com/9.x/initials/png?seed=${encodeURIComponent(teamName)}&backgroundColor=2b6cb0`;
};

// Raw HTML templates to avoid NextJS Edge Runtime crashes with MJML/Uglify-JS fs dependencies.
// These templates include robust inline styles suitable for dark-mode game leaderboards.
export const getWeeklyDigestTemplate = (player: any) => {
    const avatar = getAvatarUrl(player.name);
    const teamLogo = getTeamLogoUrl(player.team_name);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SIPL Weekly Digest</title>
</head>
<body style="margin: 0; padding: 20px; font-family: Helvetica, Arial, sans-serif; background-color: #0a0a0a; color: #ffffff;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #111111; border-radius: 12px; overflow: hidden; border: 1px solid #222222; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
        
        <!-- Header -->
        <div style="padding: 30px 20px; text-align: center; border-bottom: 3px solid #e53e3e;">
            <img src="${SIPL_LOGO}" alt="SIPL Logo" style="width: 150px; display: block; margin: 0 auto;" />
            <h1 style="margin: 20px 0 5px; font-size: 28px; font-weight: 900; font-style: italic; color: #ffffff; text-shadow: 0 0 10px rgba(229,62,62,0.8);">WEEKLY DIGEST</h1>
            <p style="margin: 0; font-size: 16px; color: #a0aec0;">Your Personal SIPL Performance</p>
        </div>

        <!-- Personal Stats Card -->
        <div style="background-color: #1a1a1a; margin: 30px; border-radius: 16px; padding: 30px; display: table; width: calc(100% - 60px); box-sizing: border-box; border: 1px solid #333;">
            <div style="display: table-cell; vertical-align: middle; width: 120px; text-align: center;">
                <img src="${avatar}" alt="Avatar" style="width: 80px; height: 80px; border-radius: 50%; border: 3px solid #e53e3e; object-fit: cover;" />
                <div style="margin-top: 10px; font-weight: bold; font-size: 18px; color: #e53e3e;">${player.name}</div>
            </div>
            
            <div style="display: table-cell; vertical-align: middle; padding-left: 20px;">
                <table style="width: 100%; color: #ffffff; font-size: 15px; border-collapse: collapse;">
                    <tr style="border-bottom: 2px solid #333;">
                        <td style="padding: 0 0 12px 0; color: #a0aec0;">Current Team:</td>
                        <td style="padding: 0 0 12px 0; font-weight: bold; text-align: right;">
                            <img src="${teamLogo}" style="vertical-align: middle; width: 24px; border-radius: 4px; margin-right: 8px;" />
                            ${player.team_name || 'Free Agent'}
                        </td>
                    </tr>

                    <!-- Rankings Section -->
                    <tr><td colspan="2" style="padding: 15px 0 5px; font-size: 13px; font-weight: bold; text-transform: uppercase; color: #63b3ed; letter-spacing: 1px;">Rankings</td></tr>
                    <tr style="border-bottom: 1px solid #333;">
                        <td style="padding: 10px 0; color: #a0aec0;">Overall Rank:</td>
                        <td style="padding: 10px 0; font-weight: bold; text-align: right; color: #e53e3e; font-size: 18px;">#${player.overall_rank}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #333;">
                        <td style="padding: 10px 0; color: #a0aec0;">Rank In Team:</td>
                        <td style="padding: 10px 0; font-weight: bold; text-align: right; color: #ffffff;">#${player.rank_in_team}</td>
                    </tr>
                    <tr style="border-bottom: 2px solid #333;">
                        <td style="padding: 10px 0; color: #a0aec0;">Team Standing:</td>
                        <td style="padding: 10px 0; font-weight: bold; text-align: right; color: #ffffff;">#${player.team_standing}</td>
                    </tr>

                    <!-- Performance Section -->
                    <tr><td colspan="2" style="padding: 15px 0 5px; font-size: 13px; font-weight: bold; text-transform: uppercase; color: #63b3ed; letter-spacing: 1px;">Performance</td></tr>
                    <tr style="border-bottom: 1px solid #333;">
                        <td style="padding: 10px 0; color: #a0aec0;">Points (This Week):</td>
                        <td style="padding: 10px 0; font-weight: bold; text-align: right; color: #48bb78; font-size: 18px;">+${player.points_this_week}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #333;">
                        <td style="padding: 10px 0; color: #a0aec0;">Points (This Month):</td>
                        <td style="padding: 10px 0; font-weight: bold; text-align: right; color: #ecc94b; font-size: 18px;">+${player.points_this_month}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #333;">
                        <td style="padding: 10px 0; color: #a0aec0;">Total Points:</td>
                        <td style="padding: 10px 0; font-weight: bold; text-align: right; color: #ffffff; font-size: 18px;">${player.total_points}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; color: #a0aec0;">Total Runs:</td>
                        <td style="padding: 10px 0; font-weight: bold; text-align: right; color: #ffffff; font-size: 18px;">${player.total_runs}</td>
                    </tr>
                </table>
            </div>
        </div>

        <!-- Footer -->
        <div style="padding: 30px 20px; text-align: center; background-color: #151515;">
            <a href="${ROOT_URL}" style="display: inline-block; background-color: #e53e3e; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; text-transform: uppercase;">View Full Leaderboard</a>
            <p style="margin: 20px 0 0; color: #718096; font-size: 11px;">Keep up the great work! SIPL System Notifications.</p>
        </div>
    </div>
</body>
</html>
    `;
};

export const getMonthlyDigestTemplate = (
    topPlayersMonth: any[], 
    topTeamsMonth: any[],
    topPlayersOverall: any[],
    topTeamsOverall: any[]
) => {
    const renderPlayerRows = (players: any[]) => players.map((p, i) => `
        <tr style="border-bottom: 1px solid #333;">
            <td style="padding: 15px; font-weight: 900; color: #e53e3e; font-size: 20px; width: 40px;">#${i+1}</td>
            <td style="padding: 15px;">
                <img src="${getAvatarUrl(p.name)}" style="vertical-align: middle; width: 36px; height: 36px; border-radius: 50%; margin-right: 12px; border: 2px solid rgba(255,255,255,0.1); object-fit: cover;" />
                <strong style="font-size: 16px;">${p.name}</strong>
            </td>
            <td style="padding: 15px; text-align: right; font-weight: bold; color: #48bb78; font-size: 16px;">${p.total_runs} Runs</td>
        </tr>
    `).join('');

    const renderTeamRows = (teams: any[]) => teams.map((t, i) => `
        <tr style="border-bottom: 1px solid #333;">
            <td style="padding: 15px; font-weight: 900; color: #3182ce; font-size: 20px; width: 40px;">#${i+1}</td>
            <td style="padding: 15px;">
                <img src="${getTeamLogoUrl(t.name)}" style="vertical-align: middle; width: 36px; height: 36px; border-radius: 8px; margin-right: 12px; border: 2px solid rgba(255,255,255,0.1); object-fit: cover;" />
                <strong style="font-size: 16px;">${t.name}</strong>
            </td>
            <td style="padding: 15px; text-align: right; font-weight: bold; color: #ecc94b; font-size: 16px;">${t.total_points} Pts</td>
        </tr>
    `).join('');

    const playerMonthRows = renderPlayerRows(topPlayersMonth);
    const teamMonthRows = renderTeamRows(topTeamsMonth);
    const playerOverallRows = renderPlayerRows(topPlayersOverall);
    const teamOverallRows = renderTeamRows(topTeamsOverall);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SIPL Monthly Highlights</title>
</head>
<body style="margin: 0; padding: 20px; font-family: Helvetica, Arial, sans-serif; background-color: #0a0a0a; color: #ffffff;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #111111; border-radius: 12px; overflow: hidden; border: 1px solid #222222; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
        
        <!-- Header -->
        <div style="padding: 30px 20px; text-align: center; border-bottom: 3px solid #3182ce;">
            <img src="${SIPL_LOGO}" alt="SIPL Logo" style="width: 150px; display: block; margin: 0 auto;" />
            <h1 style="margin: 20px 0 5px; font-size: 28px; font-weight: 900; font-style: italic; color: #ffffff; text-shadow: 0 0 10px rgba(49,130,206,0.8);">MONTHLY HIGHLIGHTS</h1>
            <p style="margin: 0; font-size: 16px; color: #a0aec0;">The Best Performers of the Month</p>
        </div>

        <!-- Content -->
        <div style="padding: 30px 20px;">
            
            <h2 style="color: #63b3ed; text-align: center; font-size: 22px; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 2px;">This Month</h2>

            <!-- Top Players Section (Month) -->
            <div style="background-color: #1a1a1a; border-radius: 12px; margin-bottom: 30px; border: 1px solid #333;">
                <h3 style="margin: 0; padding: 20px; font-size: 18px; font-weight: 900; font-style: italic; color: #e53e3e; text-transform: uppercase; border-bottom: 1px solid #333;">🏆 Top 3 Players</h3>
                <table style="width: 100%; color: #ffffff; border-collapse: collapse;">
                    ${playerMonthRows || '<tr><td colspan="3" style="color:#718096; text-align:center; padding: 20px;">No player data available.</td></tr>'}
                </table>
            </div>

            <!-- Top Teams Section (Month) -->
            <div style="background-color: #1a1a1a; border-radius: 12px; margin-bottom: 40px; border: 1px solid #333;">
                <h3 style="margin: 0; padding: 20px; font-size: 18px; font-weight: 900; font-style: italic; color: #3182ce; text-transform: uppercase; border-bottom: 1px solid #333;">🛡️ Top 3 Teams</h3>
                <table style="width: 100%; color: #ffffff; border-collapse: collapse;">
                    ${teamMonthRows || '<tr><td colspan="3" style="color:#718096; text-align:center; padding: 20px;">No team data available.</td></tr>'}
                </table>
            </div>

            <h2 style="color: #63b3ed; text-align: center; font-size: 22px; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 2px;">Overall Standings</h2>

            <!-- Top Players Section (Overall) -->
            <div style="background-color: #1a1a1a; border-radius: 12px; margin-bottom: 30px; border: 1px solid #333;">
                <h3 style="margin: 0; padding: 20px; font-size: 18px; font-weight: 900; font-style: italic; color: #e53e3e; text-transform: uppercase; border-bottom: 1px solid #333;">🏆 Top 3 Players</h3>
                <table style="width: 100%; color: #ffffff; border-collapse: collapse;">
                    ${playerOverallRows || '<tr><td colspan="3" style="color:#718096; text-align:center; padding: 20px;">No player data available.</td></tr>'}
                </table>
            </div>

            <!-- Top Teams Section (Overall) -->
            <div style="background-color: #1a1a1a; border-radius: 12px; margin-bottom: 30px; border: 1px solid #333;">
                <h3 style="margin: 0; padding: 20px; font-size: 18px; font-weight: 900; font-style: italic; color: #3182ce; text-transform: uppercase; border-bottom: 1px solid #333;">🛡️ Top 3 Teams</h3>
                <table style="width: 100%; color: #ffffff; border-collapse: collapse;">
                    ${teamOverallRows || '<tr><td colspan="3" style="color:#718096; text-align:center; padding: 20px;">No team data available.</td></tr>'}
                </table>
            </div>
            
            <!-- Events Banner -->
            <div style="background-color: #1a1a1a; border-radius: 12px; padding: 20px; border-left: 4px solid #3182ce; border-top: 1px solid #333; border-right: 1px solid #333; border-bottom: 1px solid #333;">
                <strong style="color: #3182ce; font-size: 18px; display: block; margin-bottom: 8px;">Upcoming Events</strong>
                <p style="margin: 0; color: #e2e8f0; font-size: 15px; line-height: 1.5;">Get ready for the next round of live battles and the upcoming mega auction. Check the SIPL dashboard to stay tuned!</p>
            </div>

        </div>

        <!-- Footer -->
        <div style="padding: 20px; text-align: center; background-color: #151515; border-top: 1px solid #222;">
            <p style="margin: 0; color: #718096; font-size: 11px;">This is an automated message from the SIPL Management system.</p>
        </div>
    </div>
</body>
</html>
    `;
};
