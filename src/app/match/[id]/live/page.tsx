'use client';

import { useState, useEffect, use, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Home, Activity, Zap, Play, AlertCircle, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Idea {
    id: string;
    content: string;
    score: number;
    runs: number;
    is_wicket: boolean;
    is_extra: boolean;
    team_id: string;
    created_at: string;
}

interface Match {
    id: string;
    team1_id: string;
    team2_id: string;
    team1Name: string;
    team2Name: string;
    status: string;
    score1: number;
    score2: number;
    wickets1: number;
    wickets2: number;
    overs1: number;
    overs2: number;
    case_description: string;
    ideas1?: Idea[];
    ideas2?: Idea[];
}

export default function LiveMatchDashboard({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
    const params = use(paramsPromise);
    const [match, setMatch] = useState<Match | null>(null);
    const [lastIdeaId, setLastIdeaId] = useState<string | null>(null);
    const [showWicketOverlay, setShowWicketOverlay] = useState<{ team: string, type: 'WICKET' } | null>(null);
    const [showBoundaryOverlay, setShowBoundaryOverlay] = useState<{ team: string, runs: number } | null>(null);
    const [feed, setFeed] = useState<Idea[]>([]);



    useEffect(() => {
        const fetchMatch = async () => {
            try {
                const res = await fetch(`/api/match/${params.id}`);
                const data = await res.json();

                if (data && !data.error) {
                    setMatch(prev => {
                        // Check for new events
                        const allIdeas = [...(data.ideas1 || []), ...(data.ideas2 || [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                        if (prev) {
                            const newIdea = allIdeas[0];
                            if (newIdea && newIdea.id !== lastIdeaId) {
                                setLastIdeaId(newIdea.id);
                                setFeed(f => [newIdea, ...f].slice(0, 5)); // Keep last 5 in feed

                                // Trigger animations
                                const teamName = newIdea.team_id === data.team1_id ? data.team1Name : data.team2Name;
                                if (newIdea.is_wicket) {
                                    setShowWicketOverlay({ team: teamName, type: 'WICKET' });
                                    setTimeout(() => setShowWicketOverlay(null), 3000);
                                } else if (newIdea.runs === 4 || newIdea.runs === 6) {
                                    setShowBoundaryOverlay({ team: teamName, runs: newIdea.runs });
                                    setTimeout(() => setShowBoundaryOverlay(null), 3000);
                                }
                            }
                        } else {
                            // Initial load, just set the last ID
                            if (allIdeas.length > 0) setLastIdeaId(allIdeas[0].id);
                        }
                        return data;
                    });
                }
            } catch (e) {
                console.error("Fetch error", e);
            }
        };

        fetchMatch();

        // 🟢 Realtime Subscription
        const channel = supabase
            .channel(`match_${params.id}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${params.id}` },
                (payload) => {
                    console.log('Match Update:', payload);
                    fetchMatch();
                }
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'battle_ideas', filter: `match_id=eq.${params.id}` },
                (payload) => {
                    console.log('New Idea:', payload);
                    fetchMatch();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [params.id, lastIdeaId]);

    if (!match) return (
        <div className="flex items-center justify-center min-h-screen bg-black text-white">
            <Activity className="w-8 h-8 animate-pulse text-accent" />
            <span className="ml-2 font-black uppercase tracking-widest text-xs">Connecting to Stadium Feed...</span>
        </div>
    );

    return (
        <main className="min-h-screen bg-black text-white overflow-hidden relative font-sans">
            {/* Background Elements */}
            <div className="fixed inset-0 z-0 opacity-20 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-accent rounded-full blur-[150px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600 rounded-full blur-[150px]" />
            </div>

            {/* Header */}
            <header className="fixed top-0 w-full z-40 p-6 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
                <Link href={`/match/${params.id}`} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                    <ChevronLeft className="w-5 h-5" /> <span className="text-xs font-black uppercase tracking-widest">Exit Stadium</span>
                </Link>
                <div className="flex items-center gap-2 px-4 py-1.5 bg-red-600 text-white rounded-full animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.5)]">
                    <div className="w-2 h-2 bg-white rounded-full" />
                    <span className="text-[10px] font-black uppercase tracking-widest">LIVE</span>
                </div>
            </header>

            {/* Scoreboard */}
            <div className="relative z-10 pt-24 pb-12 flex flex-col items-center justify-center min-h-[60vh]">
                <div className="w-full max-w-6xl grid grid-cols-[1fr_auto_1fr] items-center gap-8 px-8">
                    {/* Team 1 */}
                    <div className="flex flex-col items-end text-right">
                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-white/5 border border-white/10 overflow-hidden mb-6 shadow-2xl relative group">
                            <div className="absolute inset-0 bg-accent/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <img
                                src={`/assets/teamlogos/${match.team1Name.toLowerCase().replace(/ /g, '_')}.png`}
                                alt={match.team1Name}
                                className="w-full h-full object-cover"
                                onError={(e) => (e.currentTarget.style.display = 'none')}
                            />
                        </div>
                        <h2 className="text-4xl md:text-6xl font-black uppercase text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-500 leading-none mb-2">{match.team1Name}</h2>
                        <div className="flex items-baseline gap-2">
                            <span className="text-6xl md:text-8xl font-black text-accent tracking-tighter">{match.score1}/{match.wickets1}</span>
                        </div>
                        <p className="text-gray-500 text-sm font-mono font-bold tracking-widest">{match.overs1.toFixed(1)} OVERS</p>
                    </div>

                    {/* VS / Status */}
                    <div className="text-center flex flex-col items-center gap-4">
                        <div className="w-px h-24 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
                        <span className="text-2xl font-black italic text-gray-600">VS</span>
                        <div className="w-px h-24 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
                    </div>

                    {/* Team 2 */}
                    <div className="flex flex-col items-start text-left">
                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-white/5 border border-white/10 overflow-hidden mb-6 shadow-2xl relative group">
                            <div className="absolute inset-0 bg-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <img
                                src={`/assets/teamlogos/${match.team2Name.toLowerCase().replace(/ /g, '_')}.png`}
                                alt={match.team2Name}
                                className="w-full h-full object-cover"
                                onError={(e) => (e.currentTarget.style.display = 'none')}
                            />
                        </div>
                        <h2 className="text-4xl md:text-6xl font-black uppercase text-transparent bg-clip-text bg-gradient-to-bl from-white to-gray-500 leading-none mb-2">{match.team2Name}</h2>
                        <div className="flex items-baseline gap-2">
                            <span className="text-6xl md:text-8xl font-black text-blue-400 tracking-tighter">{match.score2}/{match.wickets2}</span>
                        </div>
                        <p className="text-gray-500 text-sm font-mono font-bold tracking-widest">{match.overs2.toFixed(1)} OVERS</p>
                    </div>
                </div>

                {/* Case Description Ticker */}
                <div className="mt-16 w-full max-w-4xl px-6">
                    <div className="bg-white/5 border border-white/10 rounded-full px-6 py-3 flex items-center gap-4 overflow-hidden">
                        <AlertCircle className="w-4 h-4 text-accent flex-shrink-0" />
                        <div className="whitespace-nowrap overflow-hidden text-ellipsis text-xs font-bold text-gray-400 uppercase tracking-widest">
                            {match.case_description}
                        </div>
                    </div>
                </div>
            </div>

            {/* Live Feed (Bubbles) */}
            <div className="fixed bottom-0 left-0 w-full p-6 md:p-12 pointer-events-none">
                <div className="max-w-2xl mx-auto flex flex-col-reverse gap-4">
                    <AnimatePresence>
                        {feed.map((idea) => (
                            <motion.div
                                key={idea.id}
                                initial={{ opacity: 0, y: 50, scale: 0.8 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                                className={`glass-card p-4 rounded-2xl border flex items-center gap-4 ${idea.is_wicket ? 'border-red-500/50 bg-red-900/20' : idea.runs >= 4 ? 'border-accent/50 bg-accent/10' : 'border-white/10 bg-black/60'}`}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${idea.is_wicket ? 'bg-red-500 text-white' : 'bg-white/10 text-white'}`}>
                                    {idea.is_wicket ? 'W' : idea.runs}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${idea.team_id === match.team1_id ? 'text-accent' : 'text-blue-400'}`}>
                                            {idea.team_id === match.team1_id ? match.team1Name : match.team2Name}
                                        </span>
                                        <span className="text-gray-500 text-[10px]">• Just now</span>
                                    </div>
                                    <p className="text-sm font-medium leading-snug line-clamp-2">{idea.content}</p>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>

            {/* WICKET OVERLAY */}
            <AnimatePresence>
                {showWicketOverlay && (
                    <motion.div
                        initial={{ opacity: 0, scale: 1.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-red-600/90 backdrop-blur-sm"
                    >
                        <div className="text-center">
                            <motion.div
                                animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                className="text-9xl mb-4"
                            >
                                🏏
                            </motion.div>
                            <h1 className="text-8xl md:text-9xl font-black uppercase text-white tracking-tighter drop-shadow-xl">WICKET!</h1>
                            <p className="text-2xl font-bold uppercase tracking-[0.5em] text-black mt-4 bg-white inline-block px-4 py-1">{showWicketOverlay.team}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* BOUNDARY OVERLAY */}
            <AnimatePresence>
                {showBoundaryOverlay && (
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -100 }}
                        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
                    >
                        <div className="relative">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: [0, 1.2, 1] }}
                                className={`text-[15rem] font-black italic leading-none text-transparent bg-clip-text ${showBoundaryOverlay.runs === 6 ? 'bg-gradient-to-b from-yellow-300 to-orange-600' : 'bg-gradient-to-b from-blue-300 to-blue-600'} drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)]`}
                            >
                                {showBoundaryOverlay.runs}
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
                                className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap"
                            >
                                <span className="text-4xl font-black uppercase tracking-widest text-white drop-shadow-md">
                                    {showBoundaryOverlay.runs === 6 ? 'MAXIMUM!' : 'BOUNDARY!'}
                                </span>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
    );
}
