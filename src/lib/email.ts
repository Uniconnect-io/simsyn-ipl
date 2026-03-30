export const sendMail = async (to: string | string[], subject: string, html: string) => {
    const apiKey = process.env.MAILGUN_API_KEY;
    const domain = process.env.MAILGUN_DOMAIN;
    const fromEmail = process.env.MAILGUN_FROM_EMAIL || 'no-reply@simsyn.com';

    if (!apiKey || !domain) {
        console.warn('Mailgun API key or domain not set. Skipping email send.');
        return false;
    }

    const toString = Array.isArray(to) ? to.join(', ') : to;

    const formData = new URLSearchParams();
    formData.append('from', `SIPL Notifications <${fromEmail}>`);
    formData.append('to', toString);
    formData.append('subject', subject);
    formData.append('html', html);

    try {
        const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Mailgun Error:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Mailgun Request Failed:', error);
        return false;
    }
};

export const sendNewIdeaAdminNotification = async (adminEmails: string[], ideaTitle: string, playerName: string) => {
    if (adminEmails.length === 0) return;
    const subject = `New Idea Submitted: ${ideaTitle}`;
    const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #333;">New Idea Submission</h2>
            <p><strong>${playerName}</strong> has submitted a new idea to the Idea Hub:</p>
            <blockquote style="border-left: 4px solid #cc0000; padding-left: 10px; color: #555;">
                <em>${ideaTitle}</em>
            </blockquote>
            <p>Please log in to the admin console to review it.</p>
        </div>
    `;
    return sendMail(adminEmails, subject, html);
};

export const sendIdeaReviewedPlayerNotification = async (playerEmail: string, ideaTitle: string, status: string, score: number) => {
    const subject = `Your Idea has been Reviewed: ${ideaTitle}`;
    const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #333;">Idea Reviewed</h2>
            <p>Your idea "<strong>${ideaTitle}</strong>" has been reviewed by the admin.</p>
            <p><strong>Status:</strong> ${status}</p>
            <p><strong>Score:</strong> ${score}</p>
            <p>Check the Idea Hub for more feedback details.</p>
        </div>
    `;
    return sendMail(playerEmail, subject, html);
};
