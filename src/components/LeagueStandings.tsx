import React, { useState } from 'react';
import { BarChart2, User, Users } from 'lucide-react';

export interface Standing {
    id: string;
    name: string;
    played: number;
    won: number;
    tied: number;
    lost: number;
    points: number;
    nrr: number;
}

export interface PlayerStanding {
    name: string;
    team_id: string;
    total_points: number;
}

interface LeagueStandingsProps {
    standings: {
        teams: Standing[];
        players: PlayerStanding[];
    };
}

export default function LeagueStandings({ standings }: LeagueStandingsProps) {
    const [view, setView] = useState<'teams' | 'players'>('teams');
    const teamsData = standings.teams || [];
    const playersData = standings.players || [];

    return (
        <section className="glass-card overflow-hidden">
            <div className="p-6 border-b border-white/5 bg-accent/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <BarChart2 className="text-accent" />
                    <h2 className="text-xl font-bold uppercase tracking-wider">Points Table</h2>
                </div>
                <div className="flex bg-black/40 rounded-lg p-1 border border-white/10">
                    <button
                        onClick={() => setView('teams')}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${view === 'teams' ? 'bg-accent text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        <Users className="w-3 h-3" /> Teams
                    </button>
                    <button
                        onClick={() => setView('players')}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${view === 'players' ? 'bg-accent text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        <User className="w-3 h-3" /> Players
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                {view === 'teams' ? (
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
                            {teamsData.map((team, idx) => (
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
                            {teamsData.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-gray-500 italic">
                                        No team standings available yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                ) : (
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5 text-gray-400 text-xs uppercase tracking-widest">
                                <th className="p-6">Rank</th>
                                <th className="p-6">Player</th>
                                <th className="p-6 text-accent">Points</th>
                            </tr>
                        </thead>
                        <tbody>
                            {playersData.map((player, idx) => (
                                <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.02] transition-all">
                                    <td className="p-6 font-black text-white/30">#{idx + 1}</td>
                                    <td className="p-6 font-bold flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 overflow-hidden">
                                            <img
                                                src={`/assets/employee/${player.name.toLowerCase()}.png`}
                                                alt={player.name}
                                                className="w-full h-full object-cover"
                                                onError={(e) => (e.currentTarget.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + player.name)}
                                            />
                                        </div>
                                        <div>
                                            <div className="text-white">{player.name}</div>
                                            {/* We could show team name here if we had it mapped, or just fetch it */}
                                        </div>
                                    </td>
                                    <td className="p-6 text-accent font-black text-xl">{player.total_points}</td>

                                </tr>
                            ))}
                            {playersData.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="p-8 text-center text-gray-500 italic">
                                        No player standings available yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </section>
    );
}
