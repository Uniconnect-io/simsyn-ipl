'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link'; // Added for the new navigation
import BattleHistoryTable from '@/components/BattleHistoryTable';

export default function HistoryPage() {
    const [captain, setCaptain] = useState<any>(null);
    const [historyIdeas, setHistoryIdeas] = useState<any[]>([]);
    const [matches, setMatches] = useState<any[]>([]); // Need matches for context
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem('sipl_captain');
        if (stored) {
            const cap = JSON.parse(stored);
            setCaptain(cap);
            fetchHistory(cap.team_id);
        } else {
            setLoading(false);
        }
    }, []);

    const fetchHistory = async (teamId: string) => {
        setLoading(true); // Ensure loading is true when fetching
        try {
            // Fetch ideas
            const res = await fetch(`/api/battle/history?teamId=${teamId}`);
            const data = await res.json();

            // Fetch matches for context (optimally should be separate or included, assuming we fetch schedule)
            const matchesRes = await fetch('/api/league/schedule');
            const matchesData = await matchesRes.json();

            setHistoryIdeas(data.ideas);
            setMatches(matchesData);
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading history...</div>;
    }

    if (!captain) {
        return <div className="p-8 text-center text-gray-500">Please login first.</div>;
    }

    return (
        <main className="min-h-screen bg-black text-white p-4 md:p-8 pb-32">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black italic tracking-tighter">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-white">
                            BATTLE HISTORY
                        </span>
                    </h1>
                    <p className="text-gray-400 text-sm">Review your past innovation performance.</p>
                </div>
                <Link href="/captain" className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold transition-all">
                    Back to HQ
                </Link>
            </header>

            <BattleHistoryTable ideas={historyIdeas} matches={matches} teamFilter={captain.team_id} />
        </main>
    );
}
