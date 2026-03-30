export async function sendTeamsNotification(title: string, message: string) {
    const POWER_AUTOMATE_URL = process.env.TEAMS_WORKFLOW_URL;
    const TEAMS_WEBHOOK_URL = process.env.MS_TEAMS_WEBHOOK_URL;

    // Use Webhook URL, fallback to PowerAutomate workflow URL
    const urlPayload = TEAMS_WEBHOOK_URL || POWER_AUTOMATE_URL;
    
    // Only proceed if a webhook URL is configured
    if (!urlPayload) {
        console.warn('No MS Teams webhook or workflow URL configured. Skipping.');
        return false;
    }

    // Clean any accidental quotes from .env
    const cleanUrl = urlPayload.replace(/^['"]|['"]$/g, '');

    try {
        const response = await fetch(cleanUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                // Easy fields for Power Automate HTTP trigger:
                title,
                message,
                
                // Legacy MS Teams Incoming Webhook standard formatting:
                "@type": "MessageCard",
                "@context": "http://schema.org/extensions",
                "themeColor": "e53e3e",
                "summary": title,
                "sections": [{
                    "activityTitle": title,
                    "text": message
                }]
            })
        });

        if (!response.ok) {
            console.error('MS Teams Webhook responded with status:', response.status);
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('MS Teams Webhook Request Failed:', error);
        return false;
    }
};
