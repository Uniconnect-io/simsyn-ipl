'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Calendar, ChevronRight, Award, BarChart2 } from 'lucide-react';

interface Standing {
    id: string;
    name: string;
    played: number;
    won: number;
    tied: number;
    lost: number;
    points: number;
    nrr: number;
}

interface Match {
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
    case_description?: string;
}

export default function LeaguePage() {
    const [standings, setStandings] = useState<Standing[]>([]);
    const [schedule, setSchedule] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch('/api/league/leaderboard').then(res => res.json()),
            fetch('/api/league/schedule').then(res => res.json())
        ]).then(([leaderboardData, scheduleData]) => {
            setStandings(leaderboardData);
            setSchedule(scheduleData);
            setLoading(false);
        });
    }, []);

    if (loading) return <div className="p-8">Loading...</div>;

    const leagueMatches = schedule.filter(m => m.type === 'LEAGUE');
    const playoffMatches = schedule.filter(m => m.type !== 'LEAGUE');

    return (
        <main className="min-h-screen p-6 lg:p-12 space-y-12">
            <header>
                <div>
                    <h1 className="text-4xl font-black text-glow">LEAGUE STANDINGS</h1>
                    <p className="text-gray-400">Road to the SIPL 2026 Playoffs</p>
                </div>
            </header>

            {/* Leaderboard */}
            <section className="glass-card overflow-hidden">
                <div className="p-6 border-b border-white/5 bg-accent/5 flex items-center gap-2">
                    <BarChart2 className="text-accent" />
                    <h2 className="text-xl font-bold uppercase tracking-wider">Points Table</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5 text-gray-400 text-xs uppercase tracking-widest">
                                <th className="p-6">Pos</th>
                                <th className="p-6">Team</th>
                                <th className="p-6">P</th>
                                <th className="p-6">W</th>
                                <th className="p-6">D</th>
                                <th className="p-6">L</th>
                                <th className="p-6">NRR</th>
                                <th className="p-6 text-accent">PTS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {standings.map((team, idx) => (
                                <tr key={team.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-all">
                                    <td className="p-6 font-black text-white/30">{idx + 1}</td>
                                    <td className="p-6 font-bold flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-white/5 border border-white/10 overflow-hidden">
                                            <img
                                                src={`/assets/teamlogos/${team.name.toLowerCase().replace(' ', '_')}.png`}
                                                alt={team.name}
                                                className="w-full h-full object-cover"
                                                onError={(e) => (e.currentTarget.style.display = 'none')}
                                            />
                                        </div>
                                        {team.name}
                                    </td>
                                    <td className="p-6">{team.played}</td>
                                    <td className="p-6">{team.won}</td>
                                    <td className="p-6">{team.tied}</td>
                                    <td className="p-6">{team.lost}</td>
                                    <td className={`p-6 text-xs font-mono font-bold ${team.nrr >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {team.nrr > 0 ? '+' : ''}{team.nrr.toFixed(3)}
                                    </td>
                                    <td className="p-6 text-accent font-black text-xl">{team.points}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

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
                                                {match.status === 'COMPLETED' ? (
                                                    <span className="bg-accent text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">RESULT</span>
                                                ) : match.status === 'REVIEW_PENDING' ? (
                                                    <span className="bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded text-[10px] font-bold">IN REVIEW</span>
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
                                                    {match.status === 'COMPLETED' ? (
                                                        <div className="text-xl font-black text-white flex items-center gap-2">
                                                            <span>{match.score1}</span>
                                                            <span className="text-gray-600 font-normal text-xs">-</span>
                                                            <span>{match.score2}</span>
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
        </main>
    );
}
