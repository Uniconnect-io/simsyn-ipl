'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Users, Zap, Award, Star, Shield, Activity } from 'lucide-react';

import { supabase } from '@/lib/supabase';

export default function LiveLeaderboard() {
    const params = useParams();
    const battleId = params.id as string;
    const [feed, setFeed] = useState<any[]>([]);
    const [data, setData] = useState<any>({ individuals: [], teams: [] });
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [showBoundaryOverlay, setShowBoundaryOverlay] = useState<{ player: string, runs: number } | null>(null);
    const [mounted, setMounted] = useState(false);

    const lastActionRef = useRef<string | null>(null);

    useEffect(() => {
        setMounted(true);
        const fetchLeaderboard = async () => {
            try {
                const res = await fetch(`/api/battles/leaderboard?battleId=${battleId}`);
                if (res.ok) {
                    const json = await res.json();

                    if (json.feed && json.feed.length > 0) {
                        const newTopAction = json.feed[0];
                        const lastTime = lastActionRef.current;

                        if (lastTime && newTopAction.created_at !== lastTime) {
                            if (newTopAction.runs_awarded >= 4) {
                                setShowBoundaryOverlay({
                                    player: newTopAction.player_name,
                                    runs: newTopAction.runs_awarded
                                });
                                setTimeout(() => setShowBoundaryOverlay(null), 3000);
                            }
                        }
                        lastActionRef.current = newTopAction.created_at;
                    }

                    setData(json);
                    setFeed(json.feed || []);
                    setLastUpdate(new Date());
                }
            } catch (e) {
                console.error("Failed to fetch leaderboard", e);
            }
        };

        // Initial fetch
        fetchLeaderboard();

        // Supabase Realtime Subscription
        const channel = supabase
            .channel(`leaderboard_${battleId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'individual_battle_answers',
                filter: `battle_id=eq.${battleId}`
            }, () => {
                console.log('New answer detected, refreshing leaderboard...');
                fetchLeaderboard();
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'scores',
                filter: `match_id=eq.${battleId}`
            }, () => {
                console.log('Score update detected, refreshing leaderboard...');
                fetchLeaderboard();
            })
            .subscribe();

        // Fallback polling (60s)
        const interval = setInterval(fetchLeaderboard, 60000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, [battleId]);

    return (
        <main className="min-h-screen bg-black text-white p-8 bg-animate overflow-hidden relative font-sans">
            {/* Background Elements */}
            <div className="fixed inset-0 z-0 opacity-20 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-accent rounded-full blur-[150px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600 rounded-full blur-[150px]" />
            </div>

            <div className="max-w-7xl mx-auto space-y-12 relative z-10">
                <header className="text-center space-y-4">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="inline-flex items-center gap-3 px-6 py-2 bg-accent/20 border border-accent/20 rounded-full"
                    >
                        <Zap className="w-5 h-5 text-accent fill-accent animate-pulse" />
                        <span className="text-sm font-black uppercase tracking-[0.3em] text-accent">Live Battle Leaderboard</span>
                    </motion.div>
                    <h1 className="text-6xl font-black italic uppercase tracking-tighter text-glow-accent">Battle Standings</h1>
                    <p suppressHydrationWarning className="text-gray-500 font-bold uppercase tracking-widest text-xs">
                        Last Updated: {mounted && lastUpdate ? lastUpdate.toLocaleTimeString() : 'Syncing...'}
                    </p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Individual Leaderboard */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-8">
                            <Trophy className="w-8 h-8 text-yellow-500" />
                            <h2 className="text-3xl font-black uppercase italic tracking-tighter">Elite Players</h2>
                        </div>

                        <div className="space-y-3">
                            <AnimatePresence mode="popLayout">
                                {data.individuals.map((player: any, index: number) => (
                                    <motion.div
                                        key={player.name}
                                        layout
                                        initial={{ x: -20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        exit={{ x: 20, opacity: 0 }}
                                        className={`glass-card p-4 flex items-center justify-between border-white/5 relative overflow-hidden group ${index < 3 ? 'bg-accent/5 border-accent/20' : ''}`}
                                    >
                                        <div className="flex items-center gap-4 relative z-10">
                                            <div className="w-10 text-2xl font-black italic text-gray-500 shrink-0 text-center">
                                                {index === 0 ? <Award className="w-8 h-8 text-yellow-500 mx-auto" /> : index === 1 ? <Award className="w-8 h-8 text-slate-400 mx-auto" /> : index === 2 ? <Award className="w-8 h-8 text-orange-600 mx-auto" /> : `#${index + 1}`}
                                            </div>
                                            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/10 shrink-0 bg-white/5">
                                                <img
                                                    src={`/assets/employee/${player.name.toLowerCase()}.png`}
                                                    alt={player.name}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => (e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`)}
                                                />
                                            </div>
                                            <div>
                                                <div className="text-xl font-bold uppercase tracking-tight leading-none">{player.name}</div>
                                                <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">{player.team_name || 'Free Agent'}</div>
                                            </div>
                                        </div>
                                        <div className="text-right relative z-10">
                                            <div className="text-3xl font-black italic text-accent">{player.score}</div>
                                            <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Runs</div>
                                        </div>
                                        {index < 3 && <div className="absolute inset-0 bg-gradient-to-r from-accent/0 via-accent/5 to-accent/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />}
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Team Leaderboard */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-8">
                            <Users className="w-8 h-8 text-purple-500" />
                            <h2 className="text-3xl font-black uppercase italic tracking-tighter">Squad Dominance</h2>
                        </div>

                        <div className="space-y-4">
                            <AnimatePresence mode="popLayout">
                                {data.teams.map((team: any, index: number) => (
                                    <motion.div
                                        key={team.team_name}
                                        layout
                                        initial={{ x: 20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        exit={{ x: -20, opacity: 0 }}
                                        className="relative"
                                    >
                                        <div className="flex justify-between items-end mb-2 px-1">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded bg-white/10 p-1 border border-white/5 overflow-hidden">
                                                    <img
                                                        src={`/assets/teamlogos/${team.team_name.toLowerCase().replace(/\s+/g, '_')}.png`}
                                                        alt={team.team_name}
                                                        className="w-full h-full object-contain"
                                                        onError={(e) => (e.currentTarget.style.display = 'none')}
                                                    />
                                                </div>
                                                <span className="text-lg font-black uppercase italic">{team.team_name}</span>
                                            </div>
                                            <span className="text-2xl font-black text-white">{team.total_score} <span className="text-xs text-gray-500 uppercase">Runs</span></span>
                                        </div>
                                        <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                            <motion.div
                                                className="h-full bg-gradient-to-r from-purple-600 to-accent"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(team.total_score / (data.teams[0]?.total_score || 1)) * 100}%` }}
                                                transition={{ duration: 1 }}
                                            />
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>

                        {data.teams.length === 0 && (
                            <div className="text-center py-20 opacity-20">
                                <Users className="w-16 h-16 mx-auto mb-4" />
                                <p className="font-black uppercase tracking-widest">No team scores yet</p>
                            </div>
                        )}
                    </div>

                    {/* Live Feed (Bubbles) - Now in Column 3 */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-8">
                            <Activity className="w-8 h-8 text-blue-500" />
                            <h2 className="text-3xl font-black uppercase italic tracking-tighter">Live Feed</h2>
                        </div>

                        <div className="space-y-3 flex flex-col gap-3">
                            <AnimatePresence mode="popLayout">
                                {feed.slice(0, 8).map((item: any, i) => (
                                    <motion.div
                                        key={`${item.player_name}-${item.created_at}`}
                                        layout
                                        initial={{ opacity: 0, x: 50, scale: 0.8 }}
                                        animate={{ opacity: 1, x: 0, scale: 1 }}
                                        exit={{ opacity: 0, x: 20, scale: 0.9 }}
                                        className={`glass-card p-3 rounded-xl border flex items-start gap-3 shadow-lg backdrop-blur-md ${item.runs_awarded >= 4 ? 'border-accent/50 bg-accent/20' : 'border-white/10 bg-black/80'}`}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-black text-xs ${item.runs_awarded >= 4 ? 'bg-accent text-black' : 'bg-white/10 text-white'}`}>
                                            {item.runs_awarded}
                                        </div>
                                        <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 shrink-0 bg-white/5">
                                            <img
                                                src={`/assets/employee/${item.player_name.toLowerCase()}.png`}
                                                alt={item.player_name}
                                                className="w-full h-full object-cover"
                                                onError={(e) => (e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.player_name}`)}
                                            />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="text-accent text-[10px] font-black uppercase tracking-wider truncate">
                                                    {item.player_name}
                                                </span>
                                            </div>
                                            <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wide truncate mb-1">
                                                {item.team_name || 'Free Agent'}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            {feed.length === 0 && (
                                <div className="text-center py-20 opacity-20">
                                    <Activity className="w-16 h-16 mx-auto mb-4" />
                                    <p className="font-black uppercase tracking-widest">No activity yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* BOUNDARY OVERLAY */}
            <AnimatePresence>
                {showBoundaryOverlay && (
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -100 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
                    >
                        <div className="relative text-center">
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
                                <div className="text-xl font-bold uppercase tracking-[0.5em] text-accent mt-2">{showBoundaryOverlay.player}</div>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </main >
    );
}
