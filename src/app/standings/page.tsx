'use client';

import { useState, useEffect } from 'react';
import { Award, Home, Calendar, BarChart2 } from 'lucide-react';
import Link from 'next/link';
import { Standing, PlayerStanding } from '@/components/LeagueStandings';
import { supabase } from '@/lib/supabase';

export default function StandingsPage() {
    const [standings, setStandings] = useState<{ teams: Standing[], players: PlayerStanding[] }>({ teams: [], players: [] });
    const [loading, setLoading] = useState(true);



    useEffect(() => {
        const fetchData = () => {
            fetch('/api/league/leaderboard')
                .then(res => res.json())
                .then(data => {
                    if (data.teams) {
                        setStandings(data);
                    } else {
                        setStandings({ teams: Array.isArray(data) ? data : [], players: [] });
                    }
                    setLoading(false);
                });
        };

        fetchData();

        const channel = supabase
            .channel('leaderboard_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, fetchData) // For player standings
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>;

    return (
        <main className="min-h-screen p-6 lg:p-12 space-y-12">
            <header className="flex flex-col md:flex-row justify-between items-center bg-black/40 backdrop-blur-md p-6 rounded-2xl border border-white/5 shadow-2xl gap-6">
                <div>
                    <h1 className="text-4xl font-black text-glow tracking-tighter uppercase italic">League Standings</h1>
                    <p className="text-gray-400 font-bold text-xs tracking-widest uppercase mt-1">SIPL 2026 Season</p>
                </div>

                <div className="flex items-center gap-4">
                    <Link
                        href="/fixtures"
                        className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-6 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white transition-all font-bold"
                    >
                        <Calendar className="w-5 h-5" /> Fixtures
                    </Link>
                    <Link
                        href="/"
                        className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-6 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white transition-all font-bold"
                    >
                        <Home className="w-5 h-5" /> Home
                    </Link>
                </div>
            </header>

            <div className="space-y-12">
                {/* Team Standings */}
                <section className="glass-card overflow-hidden">
                    <div className="p-6 border-b border-white/5 bg-accent/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <BarChart2 className="text-accent" />
                            <h2 className="text-xl font-bold uppercase tracking-wider">Team Standings</h2>
                        </div>
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
                                {standings.teams.map((team, idx) => (
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
                                {standings.teams.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="p-8 text-center text-gray-500 italic">
                                            No team standings available yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Player Standings */}
                <section className="glass-card overflow-hidden">
                    <div className="p-6 border-b border-white/5 bg-accent/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Award className="text-accent" />
                            <h2 className="text-xl font-bold uppercase tracking-wider">Player Standings</h2>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-white/5 text-gray-400 text-xs uppercase tracking-widest">
                                    <th className="p-6">Rank</th>
                                    <th className="p-6">Player</th>
                                    <th className="p-6 text-accent">Points</th>
                                </tr>
                            </thead>
                            <tbody>
                                {standings.players.map((player, idx) => (
                                    <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.02] transition-all">
                                        <td className="p-6 font-black text-white/30">#{idx + 1}</td>
                                        <td className="p-6 font-bold flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 overflow-hidden">
                                                <img
                                                    src={`/assets/employee/thumb/${player.name.toLowerCase()}.png`}
                                                    alt={player.name}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => (e.currentTarget.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + player.name)}
                                                />
                                            </div>
                                            <div>
                                                <div className="text-white">{player.name}</div>
                                            </div>
                                        </td>
                                        <td className="p-6 text-accent font-black text-xl">{player.total_points}</td>
                                    </tr>
                                ))}
                                {standings.players.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="p-8 text-center text-gray-500 italic">
                                            No player standings available yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </main>
    );
}
