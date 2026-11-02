'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Users, Zap, Award, Star, Shield, Activity, Home, Calendar } from 'lucide-react';
import Link from 'next/link';

import { supabase } from '@/lib/supabase';

type TeamRoster = {
    id: string;
    captain?: { name?: string | null } | null;
    players?: Array<{ name?: string | null }>;
};

export default function LiveLeaderboard() {
    const params = useParams();
    const battleId = params.id as string;
    const [feed, setFeed] = useState<any[]>([]);
    const [data, setData] = useState<any>({ individuals: [], teams: [] });
    const [teamMembersById, setTeamMembersById] = useState<Record<string, string[]>>({});
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [showBoundaryOverlay, setShowBoundaryOverlay] = useState<{ player: string, runs: number } | null>(null);
    const [mounted, setMounted] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await fetch('/api/auth/me');
                if (res.ok) {
                    setIsAuthenticated(true);
                }
            } catch (e) {
                console.error("Auth check error:", e);
            }
        };
        checkAuth();
    }, []);

    const lastActionRef = useRef<string | null>(null);

    const battleMode = (data?.battle?.mode || '').toUpperCase();
    const battleType = (data?.battle?.type || '').toUpperCase();
    const isTeamBased = battleMode === 'TEAMS' || battleMode === 'TEAM_VS_TEAM' || battleMode === 'TEAM' || battleType === 'TEAM_BUILDING';
    const topThreeTeams = (data.teams || []).slice(0, 3);
    const topTeamPoints = (data.teams || []).length > 0
        ? Math.max(...(data.teams || []).map((t: any) => Number(t.total_points ?? t.total_score ?? 0)), 1)
        : 1;

    useEffect(() => {
        setMounted(true);
        const fetchLeaderboard = async () => {
            try {
                const [leaderboardRes, teamsRes] = await Promise.all([
                    fetch(`/api/battles/leaderboard?battleId=${battleId}`),
                    fetch('/api/teams')
                ]);

                if (leaderboardRes.ok) {
                    const json = await leaderboardRes.json();

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

                    if (teamsRes.ok) {
                        const teamsData = await teamsRes.json();
                        if (Array.isArray(teamsData)) {
                            const membersMap: Record<string, string[]> = {};
                            teamsData.forEach((team: TeamRoster) => {
                                const captainName = team.captain?.name ? [team.captain.name] : [];
                                const playerNames = (team.players || [])
                                    .map((p) => p.name)
                                    .filter((name): name is string => Boolean(name));
                                membersMap[team.id] = Array.from(new Set([...captainName, ...playerNames]));
                            });
                            setTeamMembersById(membersMap);
                        }
                    }
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
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'roadmap_submissions',
                filter: `match_id=eq.${battleId}`
            }, () => {
                console.log('Roadmap submission update detected, refreshing leaderboard...');
                fetchLeaderboard();
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'matches',
                filter: `id=eq.${battleId}`
            }, () => {
                console.log('Match update detected, refreshing leaderboard...');
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

                    <div className="flex items-center justify-center gap-3 pt-2">
                        <Link
                            href="/fixtures"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all font-bold text-sm"
                        >
                            <Calendar className="w-4 h-4" /> Fixtures
                        </Link>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all font-bold text-sm"
                        >
                            <Home className="w-4 h-4" /> Home
                        </Link>
                    </div>
                </header>

                {isTeamBased && battleType !== 'ROADMAP' ? (
                    <div className="space-y-10">
                        <section className="glass-card p-8 border-white/10">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <Users className="w-8 h-8 text-purple-400" />
                                    <h2 className="text-3xl font-black uppercase italic tracking-tighter">Team Podium</h2>
                                </div>
                                <span className="text-[11px] font-black uppercase tracking-[0.25em] text-gray-500">Top 3 Teams</span>
                            </div>

                            {topThreeTeams.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                    {[1, 0, 2].map((positionIndex) => {
                                        const team = topThreeTeams[positionIndex];
                                        if (!team) return null;

                                        const teamName = team.team_name || `Team ${positionIndex + 1}`;
                                        const teamPoints = Number(team.total_points ?? team.total_score ?? 0);
                                        const members = teamMembersById[team.team_id] || [];
                                        const visibleMembers = members.slice(0, 6);
                                        const hiddenCount = Math.max(0, members.length - visibleMembers.length);
                                        const isFirst = positionIndex === 0;
                                        const isSecond = positionIndex === 1;
                                        const isThird = positionIndex === 2;

                                        return (
                                            <motion.div
                                                key={team.team_id || teamName}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={`rounded-2xl border p-6 text-center relative overflow-hidden ${isFirst ? 'md:min-h-[280px] bg-yellow-500/10 border-yellow-500/30' : isSecond ? 'md:min-h-[240px] bg-slate-400/10 border-slate-400/30' : 'md:min-h-[220px] bg-amber-700/10 border-amber-700/30'}`}
                                            >
                                                <div className={`absolute top-3 right-3 text-[11px] font-black px-2 py-1 rounded-full ${isFirst ? 'bg-yellow-500 text-black' : isSecond ? 'bg-slate-300 text-black' : 'bg-amber-700 text-white'}`}>
                                                    {isFirst ? '1ST' : isSecond ? '2ND' : '3RD'}
                                                </div>

                                                <div className="w-16 h-16 mx-auto rounded-xl bg-white/10 border border-white/10 p-2 mb-4">
                                                    <img
                                                        src={`/assets/teamlogos/${teamName.toLowerCase().replace(/\s+/g, '_')}.png`}
                                                        alt={teamName}
                                                        className="w-full h-full object-contain"
                                                        onError={(e) => (e.currentTarget.style.display = 'none')}
                                                    />
                                                </div>

                                                <div className="text-xl font-black uppercase tracking-tight mb-2">{teamName}</div>
                                                {visibleMembers.length > 0 && (
                                                    <div className="flex items-center justify-center -space-x-2 mb-3">
                                                        {visibleMembers.map((memberName) => (
                                                            <div
                                                                key={`${team.team_id}-${memberName}`}
                                                                className="w-9 h-9 rounded-full border-2 border-black/70 bg-white/10 overflow-hidden"
                                                                title={memberName}
                                                            >
                                                                <img
                                                                    src={`/assets/employee/thumb/${memberName.toLowerCase()}.png`}
                                                                    alt={memberName}
                                                                    className="w-full h-full object-cover"
                                                                    onError={(e) => (e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${memberName}`)}
                                                                />
                                                            </div>
                                                        ))}
                                                        {hiddenCount > 0 && (
                                                            <div
                                                                className="w-9 h-9 rounded-full border-2 border-black/70 bg-white/10 text-[10px] font-black flex items-center justify-center text-gray-300"
                                                                title={`${hiddenCount} more members`}
                                                            >
                                                                +{hiddenCount}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                <div className="text-4xl font-black italic text-accent leading-none">{teamPoints}</div>
                                                <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">Points</div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-14 opacity-30">
                                    <Users className="w-16 h-16 mx-auto mb-4" />
                                    <p className="font-black uppercase tracking-widest">No team scores yet</p>
                                </div>
                            )}
                        </section>

                        <section className="glass-card p-8 border-white/10">
                            <div className="flex items-center gap-3 mb-6">
                                <Shield className="w-7 h-7 text-accent" />
                                <h3 className="text-2xl font-black uppercase italic tracking-tighter">Team Standings</h3>
                            </div>

                            <div className="space-y-3">
                                <AnimatePresence mode="popLayout">
                                    {data.teams.map((team: any, index: number) => {
                                        const teamName = team.team_name || `Team ${index + 1}`;
                                        const teamPoints = Number(team.total_points ?? team.total_score ?? 0);
                                        return (
                                            <motion.div
                                                key={team.team_id || teamName || index}
                                                layout
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                className="glass-card p-4 border-white/5"
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <span className="w-8 text-center text-gray-500 font-black">#{index + 1}</span>
                                                        <div className="w-8 h-8 rounded bg-white/10 p-1 border border-white/10 overflow-hidden">
                                                            <img
                                                                src={`/assets/teamlogos/${teamName.toLowerCase().replace(/\s+/g, '_')}.png`}
                                                                alt={teamName}
                                                                className="w-full h-full object-contain"
                                                                onError={(e) => (e.currentTarget.style.display = 'none')}
                                                            />
                                                        </div>
                                                        <span className="font-black uppercase italic truncate">{teamName}</span>
                                                    </div>
                                                    <span className="text-xl font-black text-accent">{teamPoints}</span>
                                                </div>

                                                <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/10">
                                                    <motion.div
                                                        className="h-full bg-gradient-to-r from-purple-600 to-accent"
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${(teamPoints / topTeamPoints) * 100}%` }}
                                                        transition={{ duration: 0.8 }}
                                                    />
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        </section>
                    </div>
                ) : (
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
                                                    src={`/assets/employee/thumb/${player.name.toLowerCase()}.png`}
                                                    alt={player.name}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => (e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`)}
                                                />
                                            </div>
                                            <div>
                                                <div className="text-xl font-bold uppercase tracking-tight leading-none">{player.name}</div>
                                                <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">{player.team_name || 'Free Agent'}</div>
                                                {battleType === 'ROADMAP' && data.battle?.status === 'COMPLETED' && player.agree_pct !== undefined && (
                                                    <div className="flex gap-2 mt-1 text-[9px] font-black uppercase">
                                                        <span className="text-green-400">Agree: {player.agree_pct}%</span>
                                                        <span className="text-red-400">Disagree: {player.disagree_pct}%</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right relative z-10">
                                            {battleType === 'ROADMAP' ? (
                                                data.battle?.status === 'COMPLETED' ? (
                                                    <>
                                                        <div className="text-3xl font-black italic text-accent">{player.score}</div>
                                                        <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Points</div>
                                                    </>
                                                ) : (
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-right border-r border-white/10 pr-3 mr-1 text-gray-500 font-mono text-sm font-bold">
                                                            <div>{player.score} pts</div>
                                                            <div className="text-[7px] uppercase tracking-widest text-gray-600 font-black">Score</div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-xl font-black italic text-green-400 leading-none">{player.agree_pct ?? 0}%</div>
                                                            <div className="text-[8px] text-gray-500 font-black uppercase tracking-widest mt-0.5">Agree</div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-xl font-black italic text-red-400 leading-none">{player.disagree_pct ?? 100}%</div>
                                                            <div className="text-[8px] text-gray-500 font-black uppercase tracking-widest mt-0.5">Disagree</div>
                                                        </div>
                                                    </div>
                                                )
                                            ) : (
                                                <>
                                                    <div className="text-3xl font-black italic text-accent">{player.score}</div>
                                                    <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Runs</div>
                                                </>
                                            )}
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
                                        key={team.team_id || team.team_name || index}
                                        layout
                                        initial={{ x: 20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        exit={{ x: -20, opacity: 0 }}
                                        className="relative"
                                    >
                                        {(() => {
                                            const teamName = team.team_name || `Team ${index + 1}`;
                                            const teamScore = Number(team.total_score || 0);
                                            return (
                                                <>
                                        <div className="flex justify-between items-end mb-2 px-1">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded bg-white/10 p-1 border border-white/5 overflow-hidden">
                                                    <img
                                                        src={`/assets/teamlogos/${teamName.toLowerCase().replace(/\s+/g, '_')}.png`}
                                                        alt={teamName}
                                                        className="w-full h-full object-contain"
                                                        onError={(e) => (e.currentTarget.style.display = 'none')}
                                                    />
                                                </div>
                                                <div>
                                                    <span className="text-lg font-black uppercase italic block leading-tight">{teamName}</span>
                                                    {battleType === 'ROADMAP' && data.battle?.status === 'COMPLETED' && team.agree_pct !== undefined && (
                                                        <div className="flex flex-col gap-0.5 mt-0.5 text-[9px] font-black uppercase text-gray-400">
                                                            <div className="flex gap-2">
                                                                <span className="text-green-400 font-bold">Consensus Agree: {team.agree_pct}%</span>
                                                                <span className="text-red-400 font-bold">Disagree: {team.disagree_pct}%</span>
                                                            </div>
                                                            {team.avg_deviation !== undefined && team.avg_deviation > 0 && (
                                                                <div className="text-[8px] text-gray-500">
                                                                    Member Dev: {(team.avg_deviation * 100).toFixed(0)}% 
                                                                    {team.collaboration_bonus > 0 ? " (Bonus +50)" : ""}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                {battleType === 'ROADMAP' ? (
                                                    data.battle?.status === 'COMPLETED' ? (
                                                        <>
                                                            <span className="text-2xl font-black text-white block leading-none">
                                                                {teamScore} <span className="text-xs text-gray-500 uppercase">Consensus Pts</span>
                                                            </span>
                                                            {team.total_points > 0 && (
                                                                <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest block mt-0.5">
                                                                    League: +{team.total_points} Pts
                                                                </span>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <div className="flex items-center gap-3">
                                                            <div className="text-right border-r border-white/10 pr-3 mr-1 text-gray-500 font-mono text-sm font-bold">
                                                                <div>{teamScore} pts</div>
                                                                <div className="text-[7px] uppercase tracking-widest text-gray-600 font-black">Score</div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-xl font-black italic text-green-400 leading-none">{team.agree_pct ?? 0}%</div>
                                                                <div className="text-[8px] text-gray-500 font-black uppercase tracking-widest mt-0.5">Agree</div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-xl font-black italic text-red-400 leading-none">{team.disagree_pct ?? 100}%</div>
                                                                <div className="text-[8px] text-gray-500 font-black uppercase tracking-widest mt-0.5">Disagree</div>
                                                            </div>
                                                        </div>
                                                    )
                                                ) : (
                                                    <span className="text-2xl font-black text-white">{teamScore} <span className="text-xs text-gray-500 uppercase">Runs</span></span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                            <motion.div
                                                className="h-full bg-gradient-to-r from-purple-600 to-accent"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(teamScore / (Number(data.teams[0]?.total_score) || 1)) * 100}%` }}
                                                transition={{ duration: 1 }}
                                            />
                                        </div>
                                                </>
                                            );
                                        })()}
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
                                                src={`/assets/employee/thumb/${item.player_name.toLowerCase()}.png`}
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
                )}

                {/* Authenticated Feature Prioritization Table */}
                {battleType === 'ROADMAP' && data.battle?.status === 'COMPLETED' && isAuthenticated && data.sortedFeatures && data.sortedFeatures.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card p-8 border-white/10 space-y-6"
                    >
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-glow-accent flex items-center gap-2">
                                    <Star className="w-8 h-8 text-accent fill-accent animate-pulse" /> 
                                    Consensus Priority Roadmap
                                </h2>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">
                                    Final feature priorities ranked by global WSJF consensus score
                                </p>
                            </div>
                            <div className="bg-accent/10 border border-accent/20 px-4 py-2 rounded-xl text-center">
                                <span className="text-[10px] font-black text-accent uppercase tracking-widest block">Consensus Baseline</span>
                                <span className="text-xs font-bold text-white mt-0.5 block">{data.sortedFeatures.length} Features Evaluated</span>
                            </div>
                        </div>

                        <div className="overflow-x-auto border border-white/5 rounded-2xl bg-black/40">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                    <tr className="border-b border-white/10 text-gray-500 text-[10px] font-black uppercase tracking-widest bg-white/5">
                                        <th className="p-4 w-12 text-center">Rank</th>
                                        <th className="p-4">Feature</th>
                                        <th className="p-4 text-center">Avg Value (MoSCoW)</th>
                                        <th className="p-4 text-center">Avg Effort (T-Shirt)</th>
                                        <th className="p-4 text-center text-accent">Consensus WSJF</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {data.sortedFeatures.map((feat: any, idx: number) => (
                                        <tr key={feat.id} className="hover:bg-white/5 transition-all group font-bold">
                                            <td className="p-4 text-center">
                                                <span className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto text-xs font-black shrink-0 ${
                                                    idx === 0 ? 'bg-yellow-500 text-black' :
                                                    idx === 1 ? 'bg-slate-300 text-black' :
                                                    idx === 2 ? 'bg-amber-700 text-white' : 'bg-white/10 text-gray-400'
                                                }`}>
                                                    {idx + 1}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-white text-base font-black uppercase tracking-tight group-hover:text-accent transition-colors leading-tight">
                                                    {feat.title}
                                                </div>
                                                <div className="text-gray-500 font-medium text-xs mt-1 leading-normal">
                                                    {feat.description}
                                                </div>
                                            </td>
                                            <td className="p-4 text-center text-white">
                                                <div className="text-lg font-black">{feat.avgValue.toFixed(1)}</div>
                                                <div className="text-[9px] text-gray-500 font-black uppercase tracking-wider">Points</div>
                                            </td>
                                            <td className="p-4 text-center text-white">
                                                <div className="text-lg font-black">{feat.avgEffort.toFixed(1)}</div>
                                                <div className="text-[9px] text-gray-500 font-black uppercase tracking-wider">Points</div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className="text-2xl font-black italic text-accent font-mono block">
                                                    {feat.avgWsjf.toFixed(2)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}
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
