'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, Calendar, Trophy, ArrowRight, Video, Swords, User, BarChart2, Home, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface Match {
    id: string;
    team1_id: string;
    team1Name: string | null;
    team2_id: string;
    team2Name: string | null;
    month: number;
    start_time: string;
    type: string;
    status: string;
    winnerName: string | null;
    score1?: number;
    score2?: number;
    wickets1?: number;
    wickets2?: number;
    overs1?: number;
    overs2?: number;
    case_description?: string;
    is_published?: number;
    battle_type?: string;
    title?: string;
    description?: string;
    conductor_id?: string;
    conductorName?: string | null;
}

export default function FixturesPage() {
    const [schedule, setSchedule] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/league/schedule')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setSchedule(data);
                } else {
                    console.error('API returned non-array:', data);
                    setSchedule([]);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to fetch schedule:', err);
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>;

    const groupedMatches = schedule.reduce((groups, match) => {
        const date = new Date(match.start_time);
        const month = date.getMonth(); // 0-11
        if (!groups[month]) groups[month] = [];
        groups[month].push(match);
        return groups;
    }, {} as Record<number, Match[]>);

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const sortedMonths = Object.keys(groupedMatches).map(Number).sort((a, b) => a - b);

    return (
        <main className="min-h-screen p-6 lg:p-12 space-y-12">
            <header className="flex flex-col md:flex-row justify-between items-center bg-black/40 backdrop-blur-md p-6 rounded-2xl border border-white/5 shadow-2xl gap-6">
                <div>
                    <h1 className="text-4xl font-black text-glow tracking-tighter uppercase italic">Season Schedule</h1>
                    <p className="text-gray-400 font-bold text-xs tracking-widest uppercase mt-1">SIPL 2026 Timeline</p>
                </div>

                <div className="flex items-center gap-4">
                    <Link
                        href="/standings"
                        className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-6 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white transition-all font-bold"
                    >
                        <BarChart2 className="w-5 h-5" /> Standings
                    </Link>
                    <Link
                        href="/"
                        className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-6 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white transition-all font-bold"
                    >
                        <Home className="w-5 h-5" /> Home
                    </Link>
                </div>
            </header>

            <section className="space-y-12 animate-in fade-in zoom-in-95 duration-500">
                {sortedMonths.map(month => (
                    <div key={month} className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                            <h3 className="text-accent font-black text-2xl uppercase tracking-widest bg-black/50 px-6 py-2 rounded-full border border-white/10">
                                {monthNames[month]} 2026
                            </h3>
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {groupedMatches[month].map(match => (
                                <motion.div
                                    key={match.id}
                                    whileHover={{ scale: 1.02 }}
                                    className={`glass-card p-0 border-white/5 hover:border-accent/20 group relative overflow-hidden flex flex-col 
                                        ${match.status === 'COMPLETED' ? 'bg-accent/5' : ''} 
                                        ${(['LEAGUE', 'QUALIFIER1', 'QUALIFIER2', 'ELIMINATOR', 'FINAL'].includes(match.type) || (['KAHOOT', 'CASE_STUDY'].includes(match.type) && match.status === 'COMPLETED')) ? 'cursor-pointer' : 'cursor-default'}`}
                                    onClick={() => {
                                        const isBattle = ['KAHOOT', 'CASE_STUDY', 'TECH_TALK'].includes(match.type);
                                        const isMatch = ['LEAGUE', 'QUALIFIER1', 'QUALIFIER2', 'ELIMINATOR', 'FINAL'].includes(match.type);

                                        if (isMatch) window.location.href = `/match/${match.id}`;
                                        if (isBattle && match.status === 'COMPLETED' && match.type !== 'TECH_TALK') window.location.href = `/battles/leaderboard/${match.id}`;
                                    }}
                                >
                                    {/* Header / Status Bar */}
                                    <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                                        <div className="flex items-center gap-2">
                                            {['KAHOOT', 'CASE_STUDY', 'TECH_TALK'].includes(match.type) ? (
                                                match.type === 'TECH_TALK' ? <Video className="w-4 h-4 text-purple-400" /> : <Swords className="w-4 h-4 text-accent" />
                                            ) : (
                                                <Trophy className="w-4 h-4 text-yellow-500" />
                                            )}
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                {match.type.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-500 text-xs font-mono">
                                                {new Date(match.start_time).toLocaleDateString('en-US', { day: 'numeric', weekday: 'short' })}
                                                {match.start_time.includes('T') && ` • ${new Date(match.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-5 flex-1 flex flex-col justify-center">
                                        {['KAHOOT', 'CASE_STUDY', 'TECH_TALK'].includes(match.type) ? (
                                            <div className="space-y-4">
                                                <div>
                                                    <h3 className="font-bold text-lg leading-tight text-white mb-1">{match.title}</h3>
                                                    <p className="text-sm text-gray-400 line-clamp-2">{match.description}</p>
                                                </div>

                                                {(match.conductorName || match.conductor_id) && (
                                                    <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/5">
                                                        <div className="w-8 h-8 rounded-full bg-black/40 overflow-hidden border border-white/10">
                                                            <img src={`/assets/employee/thumb/${(match.conductorName || '').toLowerCase()}.png`} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${match.conductorName || match.conductor_id}`)} />
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] text-gray-500 uppercase font-bold">Conducted By</div>
                                                            <div className="text-sm font-bold text-accent">{match.conductorName || match.conductor_id}</div>
                                                        </div>
                                                    </div>
                                                )}

                                                {match.status === 'COMPLETED' && (
                                                    <div className="inline-block bg-green-500/20 text-green-400 text-[10px] font-black uppercase px-2 py-1 rounded">
                                                        COMPLETED
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            /* League Match Content */
                                            <div className="flex justify-between items-center">
                                                <div className="flex flex-col items-center gap-2 w-1/3">
                                                    <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 p-2">
                                                        <img src={`/assets/teamlogos/${match.team1Name?.toLowerCase().replace(' ', '_')}.png`} className="w-full h-full object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                                    </div>
                                                    <span className={`text-xs font-bold text-center leading-tight ${match.winnerName === match.team1Name ? 'text-accent' : 'text-gray-300'}`}>{match.team1Name}</span>
                                                </div>

                                                <div className="flex flex-col items-center">
                                                    {match.status === 'COMPLETED' ? (
                                                        <div className="flex flex-col items-center">
                                                            <div className="text-xl font-black text-white whitespace-nowrap">
                                                                {match.score1}/{match.wickets1} - {match.score2}/{match.wickets2}
                                                            </div>
                                                            <span className="text-[10px] text-gray-500 mt-1 font-mono">RESULT</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-lg font-black text-gray-700 italic">VS</span>
                                                    )}
                                                </div>

                                                <div className="flex flex-col items-center gap-2 w-1/3">
                                                    <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 p-2">
                                                        <img src={`/assets/teamlogos/${match.team2Name?.toLowerCase().replace(' ', '_')}.png`} className="w-full h-full object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                                    </div>
                                                    <span className={`text-xs font-bold text-center leading-tight ${match.winnerName === match.team2Name ? 'text-accent' : 'text-gray-300'}`}>{match.team2Name}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer / Action */}
                                    {['LEAGUE', 'QUALIFIER1', 'QUALIFIER2', 'ELIMINATOR', 'FINAL'].includes(match.type) && (
                                        <div className="bg-white/5 p-3 flex justify-center border-t border-white/5 group-hover:bg-accent group-hover:text-black transition-colors">
                                            <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                                                Match Details <ChevronRight className="w-3 h-3" />
                                            </span>
                                        </div>
                                    )}
                                    {['KAHOOT', 'CASE_STUDY'].includes(match.type) && match.status === 'COMPLETED' && (
                                        <div className="bg-white/5 p-3 flex justify-center border-t border-white/5 group-hover:bg-accent group-hover:text-black transition-colors">
                                            <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                                                View Leaderboard <BarChart2 className="w-3 h-3" />
                                            </span>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </div>
                ))}
            </section>
        </main>
    );
}
