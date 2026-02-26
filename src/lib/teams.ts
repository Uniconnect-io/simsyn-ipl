/**
 * Sends a notification to Microsoft Teams using the modern "Workflows" (Power Automate) endpoint.
 * Legacy Incoming Webhooks are being retired.
 */
export async function sendTeamsNotification(cardContent: any) {
    // Workflows URL might be stored in either variable
    const workflowUrl = process.env.TEAMS_WORKFLOW_URL || process.env.TEAMS_WEBHOOK_URL;

    if (!workflowUrl) {
        console.warn('TEAMS_WORKFLOW_URL is not defined. Skipping Teams notification.');
        return;
    }

    try {
        const response = await fetch(workflowUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cardContent)
        });

        if (!response.ok) {
            console.error('Failed to send Teams notification:', await response.text());
        }
    } catch (error) {
        console.error('Error sending Teams notification:', error);
    }
}

/**
 * Creates an Adaptive Card for a scheduled battle.
 * Teams Workflows usually consume the Adaptive Card object directly.
 */
export function createBattleScheduledCard(battle: { title: string, description: string, start_time: string, mode: string, type: string }) {
    return {
        "type": "AdaptiveCard",
        "body": [
            {
                "type": "TextBlock",
                "size": "Medium",
                "weight": "Bolder",
                "text": "📢 New Battle Scheduled!"
            },
            {
                "type": "TextBlock",
                "text": `**${battle.title}**`,
                "wrap": true
            },
            {
                "type": "TextBlock",
                "text": battle.description,
                "wrap": true,
                "isSubtle": true
            },
            {
                "type": "FactSet",
                "facts": [
                    { "title": "Type", "value": battle.type },
                    { "title": "Mode", "value": battle.mode },
                    { "title": "Starts At", "value": battle.start_time ? new Date(battle.start_time).toLocaleString() : 'TBD' }
                ]
            }
        ],
        "actions": [
            {
                "type": "Action.OpenUrl",
                "title": "View Leaderboard",
                "url": `${process.env.NEXT_PUBLIC_APP_URL}/leaderboard`
            }
        ],
        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
        "version": "1.4"
    };
}

/**
 * Creates an Adaptive Card for a completed battle.
 */
export function createBattleCompletedCard(battle: { title: string, winner?: string, score1?: number, score2?: number, team1?: string, team2?: string }) {
    const summary = battle.winner
        ? `🏆 Winner: **${battle.winner}**`
        : `🤝 It's a Draw! (${battle.score1} - ${battle.score2})`;

    return {
        "type": "AdaptiveCard",
        "body": [
            {
                "type": "TextBlock",
                "size": "Medium",
                "weight": "Bolder",
                "text": "🏁 Battle Completed!"
            },
            {
                "type": "TextBlock",
                "text": `**${battle.title}** has ended.`,
                "wrap": true
            },
            {
                "type": "TextBlock",
                "text": summary,
                "color": "Good",
                "weight": "Bolder",
                "size": "Large"
            },
            {
                "type": "FactSet",
                "facts": [
                    { "title": battle.team1 || 'Team 1', "value": `${battle.score1 ?? 0}` },
                    { "title": battle.team2 || 'Team 2', "value": `${battle.score2 ?? 0}` }
                ]
            }
        ],
        "actions": [
            {
                "type": "Action.OpenUrl",
                "title": "Full Results",
                "url": `${process.env.NEXT_PUBLIC_APP_URL}/leaderboard`
            }
        ],
        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
        "version": "1.4"
    };
}
