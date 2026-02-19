import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Trophy, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export interface Match {
    id: string;
    team1_id: string;
    team1Name: string | null;
    team2_id: string;
    team2Name: string | null;
    month: number;
    date: string;
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
}

interface LeagueScheduleProps {
    schedule: Match[];
}

export default function LeagueSchedule({ schedule }: LeagueScheduleProps) {
    const leagueMatches = schedule.filter(m => m.type === 'LEAGUE');
    const playoffMatches = schedule.filter(m => m.type !== 'LEAGUE');

    return (
        <div className="space-y-12">
            {/* League Schedule */}
            <section className="space-y-8">
                <div className="flex items-center gap-2">
                    <Calendar className="text-accent" />
                    <h2 className="text-2xl font-bold">League Matches - March to July 2026</h2>
                </div>

                <div className="space-y-12">
                    {[3, 4, 5, 6, 7].map(month => {
                        const monthMatches = leagueMatches.filter(m => m.month === month);
                        const monthNames = ['', '', '', 'March', 'April', 'May', 'June', 'July'];

                        if (monthMatches.length === 0) return null;

                        return (
                            <div key={month} className="space-y-6">
                                {/* Month Label on Top */}
                                <h3 className="text-accent font-black text-2xl uppercase tracking-widest">
                                    {monthNames[month]} 2026
                                </h3>

                                {/* Matches in 3 columns below */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {monthMatches.map(match => (
                                        <motion.div
                                            key={match.id}
                                            whileHover={{ scale: 1.02 }}
                                            className={`glass-card p-4 border-white/5 hover:border-accent/20 cursor-pointer group relative overflow-hidden ${match.status === 'COMPLETED' ? 'bg-accent/5 overflow-hidden' : ''}`}
                                            onClick={() => window.location.href = `/match/${match.id}`}
                                        >
                                            <div className="flex justify-between items-center text-sm mb-4 relative z-10">
                                                <span className="text-accent font-mono text-xs">
                                                    {new Date(match.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                </span>
                                                {match.status === 'COMPLETED' && match.is_published ? (
                                                    <span className="bg-accent text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">RESULT</span>
                                                ) : (match.status === 'REVIEW_PENDING' || (match.status === 'COMPLETED' && !match.is_published)) ? (
                                                    <span className="bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded text-[10px] font-bold">DECISION PENDING</span>
                                                ) : match.status === 'IN_PROGRESS' ? (
                                                    <span className="bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.5)]">LIVE NOW</span>
                                                ) : (
                                                    <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-[10px] font-bold">UPCOMING</span>
                                                )}
                                            </div>

                                            <div className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-white/5 relative z-10">
                                                <div className="flex flex-col items-center gap-1 w-24">
                                                    <div className="w-10 h-10 rounded bg-white/5 border border-white/10 overflow-hidden">
                                                        <img
                                                            src={`/assets/teamlogos/${match.team1Name?.toLowerCase().replace(' ', '_')}.png`}
                                                            alt={match.team1Name || ''}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => (e.currentTarget.style.display = 'none')}
                                                        />
                                                    </div>
                                                    <span className={`text-[10px] font-bold text-center leading-tight ${match.winnerName === match.team1Name ? 'text-accent' : ''}`}>{match.team1Name}</span>
                                                </div>

                                                <div className="flex flex-col items-center">
                                                    {match.status === 'COMPLETED' && match.is_published ? (
                                                        <div className="flex flex-col items-center">
                                                            <div className="text-xl font-black text-white flex items-center gap-2">
                                                                <span className={match.winnerName === match.team1Name ? 'text-accent' : ''}>{match.score1}/{match.wickets1}</span>
                                                                <span className="text-gray-600 font-normal text-xs">-</span>
                                                                <span className={match.winnerName === match.team2Name ? 'text-accent' : ''}>{match.score2}/{match.wickets2}</span>
                                                            </div>
                                                            <div className="text-[10px] font-mono text-gray-500 mt-1">
                                                                ({match.overs1 || 0} ov) vs ({match.overs2 || 0} ov)
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-600 text-[10px] font-black italic">VS</span>
                                                    )}
                                                </div>

                                                <div className="flex flex-col items-center gap-1 w-24">
                                                    <div className="w-10 h-10 rounded bg-white/5 border border-white/10 overflow-hidden">
                                                        <img
                                                            src={`/assets/teamlogos/${match.team2Name?.toLowerCase().replace(' ', '_')}.png`}
                                                            alt={match.team2Name || ''}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => (e.currentTarget.style.display = 'none')}
                                                        />
                                                    </div>
                                                    <span className={`text-[10px] font-bold text-center leading-tight ${match.winnerName === match.team2Name ? 'text-accent' : ''}`}>{match.team2Name}</span>
                                                </div>
                                            </div>

                                            {match.status === 'COMPLETED' && (
                                                <div className="mt-3 flex items-center justify-center gap-2 text-accent font-black text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                                                    <span>View Match Report</span>
                                                    <ChevronRight className="w-3 h-3" />
                                                </div>
                                            )}
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Playoffs */}
            {playoffMatches.length > 0 && (
                <section className="space-y-8">
                    <div className="flex items-center gap-2">
                        <Trophy className="text-accent" />
                        <h2 className="text-2xl font-bold">Playoffs - August to November 2026</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {playoffMatches.map(match => (
                            <motion.div
                                key={match.id}
                                whileHover={{ scale: 1.02 }}
                                className="glass-card p-6 border-accent/20 cursor-pointer group"
                                onClick={() => window.location.href = `/match/${match.id}`}
                            >
                                <div className="flex justify-between items-center mb-4">
                                    <div>
                                        <h3 className="text-accent font-black text-lg uppercase">{match.type.replace(/(\d)/, ' $1')}</h3>
                                        <p className="text-xs text-gray-400 mt-1">{match.case_description || 'TBD'}</p>
                                    </div>
                                    <span className="text-accent font-mono text-sm">
                                        {new Date(match.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center bg-black/40 p-4 rounded-xl border border-white/5">
                                    <div className="flex flex-col items-center gap-2 flex-1">
                                        {match.team1Name ? (
                                            <>
                                                <div className="w-12 h-12 rounded bg-white/5 border border-white/10 overflow-hidden">
                                                    <img
                                                        src={`/assets/teamlogos/${match.team1Name.toLowerCase().replace(' ', '_')}.png`}
                                                        alt={match.team1Name}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => (e.currentTarget.style.display = 'none')}
                                                    />
                                                </div>
                                                <span className="text-sm font-bold">{match.team1Name}</span>
                                            </>
                                        ) : (
                                            <span className="text-gray-500 text-sm">TBD</span>
                                        )}
                                    </div>
                                    <span className="text-gray-600 text-sm font-black italic px-4">VS</span>
                                    <div className="flex flex-col items-center gap-2 flex-1">
                                        {match.team2Name ? (
                                            <>
                                                <div className="w-12 h-12 rounded bg-white/5 border border-white/10 overflow-hidden">
                                                    <img
                                                        src={`/assets/teamlogos/${match.team2Name.toLowerCase().replace(' ', '_')}.png`}
                                                        alt={match.team2Name}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => (e.currentTarget.style.display = 'none')}
                                                    />
                                                </div>
                                                <span className="text-sm font-bold">{match.team2Name}</span>
                                            </>
                                        ) : (
                                            <span className="text-gray-500 text-sm">TBD</span>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
