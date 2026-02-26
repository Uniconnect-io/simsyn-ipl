'use client';

import { useEffect } from 'react';
import Script from 'next/script';

export default function TeamsInitializer() {
    useEffect(() => {
        const initTeams = async () => {
            // @ts-ignore
            if (window.microsoftTeams && window.parent !== window.self) {
                try {
                    // @ts-ignore
                    await window.microsoftTeams.app.initialize();
                    console.log("Teams SDK initialized successfully");
                } catch (err) {
                    // Silent in prod unless it's a real mystery
                    console.debug("Teams SDK init skipped or failed:", err);
                }
            }
        };

        initTeams();
    }, []);

    return (
        <Script
            src="https://res.cdn.office.net/teams-js/2.19.0/js/MicrosoftTeams.min.js"
            strategy="afterInteractive"
            onLoad={() => {
                // @ts-ignore
                if (window.microsoftTeams && window.parent !== window.self) {
                    // @ts-ignore
                    window.microsoftTeams.app.initialize()
                        .then(() => console.log("Teams SDK initialized via onLoad"))
                        .catch((err: any) => console.debug("Teams SDK onLoad init skipped:", err));
                }
            }}
        />
    );
}
