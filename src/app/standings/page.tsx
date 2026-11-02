'use client';

import { useState, useEffect, Fragment } from 'react';
import { Home, Calendar, BarChart2, Sparkles, Award } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type TeamPointEvent = {
    id: string;
    points: number;
    category: 'INDIVIDUAL' | 'TEAM';
    player_name: string | null;
    date: string;
    match: {
        id: string | null;
        title: string;
        type: string | null;
        mode: string | null;
        team1_name: string | null;
        team2_name: string | null;
    };
};

type TeamLeaderboardItem = {
    id: string;
    name: string;
    points: number;
    point_breakdown?: TeamPointEvent[];
};

type PlayerStanding = {
    name: string;
    total_points: number;
};

type TeamRoster = {
    id: string;
    captain?: { name?: string | null } | null;
    players?: Array<{ name?: string | null }>;
};

export default function StandingsPage() {
    const [teams, setTeams] = useState<TeamLeaderboardItem[]>([]);
    const [players, setPlayers] = useState<PlayerStanding[]>([]);
    const [teamMembersById, setTeamMembersById] = useState<Record<string, string[]>>({});
    const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [leaderboardRes, rosterRes] = await Promise.all([
                    fetch('/api/league/leaderboard'),
                    fetch('/api/teams')
                ]);

                const data = await leaderboardRes.json();
                const rosterData = rosterRes.ok ? await rosterRes.json() : [];

                const teamsData = data?.teams || (Array.isArray(data) ? data : []);
                const playersData = data?.players || [];
                setTeams(Array.isArray(teamsData) ? teamsData : []);
                setPlayers(Array.isArray(playersData) ? playersData : []);

                const memberMap: Record<string, string[]> = {};
                if (Array.isArray(rosterData)) {
                    rosterData.forEach((team: TeamRoster) => {
                        const captainName = team.captain?.name ? [team.captain.name] : [];
                        const playerNames = (team.players || [])
                            .map(p => p.name)
                            .filter((name): name is string => Boolean(name));

                        memberMap[team.id] = Array.from(new Set([...captainName, ...playerNames]));
                    });
                }
                setTeamMembersById(memberMap);
            } catch (error) {
                console.error('Failed to fetch standings data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        const channel = supabase
            .channel('leaderboard_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, fetchData)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading leaderboard...</div>;

    const maxPoints = teams.length > 0 ? Math.max(...teams.map(t => Number(t.points) || 0), 1) : 1;

    return (
        <main className="min-h-screen p-6 lg:p-12 space-y-12">
            <header className="flex flex-col md:flex-row justify-between items-center bg-black/40 backdrop-blur-md p-6 rounded-2xl border border-white/5 shadow-2xl gap-6">
                <div>
                    <h1 className="text-4xl font-black text-glow tracking-tighter uppercase italic">Team Leaderboard</h1>
                    <p className="text-gray-400 font-bold text-xs tracking-widest uppercase mt-1">SIPL 2026 Game Ladder</p>
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

            <section className="glass-card overflow-hidden border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
                <div className="p-6 border-b border-white/5 bg-gradient-to-r from-accent/10 via-accent/5 to-transparent flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BarChart2 className="text-accent" />
                        <h2 className="text-xl font-bold uppercase tracking-wider">Team Leaderboard</h2>
                    </div>
                    <div className="text-[11px] text-gray-400 uppercase tracking-widest">Tap a team to view point history</div>
                </div>

                <div className="hidden md:grid grid-cols-[80px_1fr_200px_300px] gap-4 px-6 py-4 border-b border-white/5 text-gray-400 text-xs uppercase tracking-widest font-semibold bg-white/[0.02]">
                    <div>Rank</div>
                    <div>Team</div>
                    <div>Members</div>
                    <div className="text-accent">Points</div>
                </div>

                <div className="divide-y divide-white/5">
                    {teams.map((team, idx) => {
                        const expanded = expandedTeamId === team.id;
                        const members = teamMembersById[team.id] || [];
                        const visibleMembers = members.slice(0, 7);
                        const hiddenCount = Math.max(0, members.length - visibleMembers.length);
                        return (
                            <Fragment key={team.id}>
                                <div
                                    className="p-4 md:p-6 flex flex-col md:grid md:grid-cols-[80px_1fr_200px_300px] md:items-center gap-4 cursor-pointer hover:bg-white/[0.02] transition-all"
                                    onClick={() => setExpandedTeamId(expanded ? null : team.id)}
                                >
                                    {/* Left section: Rank + Team Identity */}
                                    <div className="flex items-center justify-between md:contents">
                                        <div className="flex items-center gap-2 text-white/30 font-black">
                                            <button
                                                type="button"
                                                className="w-7 h-7 rounded-md border border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.1] transition-colors text-base flex items-center justify-center font-bold"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setExpandedTeamId(expanded ? null : team.id);
                                                }}
                                                aria-label={expanded ? `Collapse ${team.name}` : `Expand ${team.name}`}
                                            >
                                                {expanded ? '-' : '+'}
                                            </button>
                                            <span className="text-white font-bold">#{idx + 1}</span>
                                        </div>

                                        <div className="flex items-center gap-3 font-bold">
                                            <div className="w-8 h-8 rounded bg-white/5 border border-white/10 overflow-hidden shrink-0">
                                                <img
                                                    src={`/assets/teamlogos/${team.name.toLowerCase().replace(' ', '_')}.png`}
                                                    alt={team.name}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => (e.currentTarget.style.display = 'none')}
                                                />
                                            </div>
                                            <span className="text-white text-base md:text-lg">{team.name}</span>
                                        </div>

                                        {/* Mobile Points display */}
                                        <div className="md:hidden flex flex-col items-end">
                                            <span className="text-accent font-black text-lg">{team.points} <span className="text-[10px] text-gray-400 font-bold">PTS</span></span>
                                        </div>
                                    </div>

                                    {/* Members */}
                                    <div className="flex items-center md:block">
                                        <span className="text-xs text-gray-500 md:hidden mr-3 uppercase tracking-widest shrink-0">Members:</span>
                                        {visibleMembers.length > 0 ? (
                                            <div className="flex items-center -space-x-2">
                                                {visibleMembers.map((memberName) => (
                                                    <div
                                                        key={`${team.id}-${memberName}`}
                                                        className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-black/80 bg-white/10 overflow-hidden"
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
                                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-black/80 bg-white/10 text-[9px] md:text-[10px] font-black flex items-center justify-center text-gray-300" title={`${hiddenCount} more members`}>
                                                        +{hiddenCount}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-500">-</span>
                                        )}
                                    </div>

                                    {/* Points & Progress Bar */}
                                    <div className="w-full">
                                        <div className="hidden md:flex items-center justify-between mb-1.5">
                                            <span className="text-accent font-black text-xl leading-none">{team.points}</span>
                                            <span className="text-[11px] text-gray-400 font-bold">PTS</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-white/10 overflow-hidden relative">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-accent to-cyan-400 transition-all duration-500"
                                                style={{ width: `${Math.max(6, Math.min(100, (Number(team.points) / maxPoints) * 100))}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {expanded && (
                                    <div className="p-4 md:p-6 bg-black/30 border-t border-white/5">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Sparkles className="w-4 h-4 text-accent" />
                                            <h3 className="text-xs md:text-sm font-bold uppercase tracking-widest text-gray-300">
                                                How {team.name} earned points
                                            </h3>
                                        </div>

                                        {(team.point_breakdown?.length ?? 0) > 0 ? (
                                            <div className="space-y-3">
                                                {/* Desktop Headers */}
                                                <div className="hidden md:grid grid-cols-[180px_1fr_120px_180px_80px] gap-4 px-4 py-2 text-gray-400 text-[10px] uppercase tracking-widest font-semibold border-b border-white/5">
                                                    <div>Date</div>
                                                    <div>Match Detail</div>
                                                    <div>Type</div>
                                                    <div>Person</div>
                                                    <div className="text-accent text-right">Earned</div>
                                                </div>

                                                {/* Breakdown List */}
                                                {(team.point_breakdown || []).map((event) => {
                                                    const dateLabel = event.date ? new Date(event.date).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    }) : 'N/A';
                                                    const matchType = event.match.type
                                                        ? event.match.type.replace(/_/g, ' ')
                                                        : 'GENERAL';

                                                    return (
                                                        <div 
                                                            key={event.id} 
                                                            className="flex flex-col md:grid md:grid-cols-[180px_1fr_120px_180px_80px] md:items-center gap-3 p-4 md:p-3 rounded-lg md:rounded-none bg-white/[0.02] md:bg-transparent border border-white/5 md:border-0 md:border-b md:border-white/5 last:border-b-0 hover:bg-white/[0.04] transition-all text-sm"
                                                        >
                                                            {/* Date */}
                                                            <div className="text-xs text-gray-400 md:text-gray-300 font-mono flex justify-between md:block">
                                                                <span className="md:hidden text-[10px] uppercase tracking-wider text-gray-500">Date</span>
                                                                <span>{dateLabel}</span>
                                                            </div>

                                                            {/* Match Title */}
                                                            <div className="flex flex-col gap-0.5">
                                                                <div className="font-semibold text-white text-sm md:text-base">{event.match.title}</div>
                                                                <div className="text-[10px] md:text-[11px] text-gray-400 uppercase tracking-wide md:hidden">{matchType}</div>
                                                            </div>

                                                            {/* Type */}
                                                            <div className="flex justify-between items-center md:block">
                                                                <span className="md:hidden text-[10px] uppercase tracking-wider text-gray-500">Category</span>
                                                                <span className={`text-[9px] md:text-[10px] font-bold px-2.5 py-0.5 md:py-1 rounded-full border ${
                                                                    event.category === 'INDIVIDUAL' 
                                                                        ? 'border-cyan-300/40 text-cyan-300 bg-cyan-500/10' 
                                                                        : 'border-amber-300/40 text-amber-300 bg-amber-500/10'
                                                                }`}>
                                                                    {event.category}
                                                                </span>
                                                            </div>

                                                            {/* Contributor Person */}
                                                            <div className="flex justify-between items-center md:block">
                                                                <span className="md:hidden text-[10px] uppercase tracking-wider text-gray-500">Contributed By</span>
                                                                {event.player_name ? (
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-6 h-6 md:w-8 h-8 rounded-full overflow-hidden border border-white/10 bg-white/5 shrink-0">
                                                                            <img
                                                                                src={`/assets/employee/thumb/${event.player_name.toLowerCase()}.png`}
                                                                                alt={event.player_name}
                                                                                className="w-full h-full object-cover"
                                                                                onError={(e) => (e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${event.player_name}`)}
                                                                            />
                                                                        </div>
                                                                        <span className="text-gray-300 text-sm">{event.player_name}</span>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-gray-500 text-xs">-</span>
                                                                )}
                                                            </div>

                                                            {/* Earned Points */}
                                                            <div className="flex justify-between items-center md:block md:text-right border-t border-white/5 md:border-0 pt-2 md:pt-0">
                                                                <span className="md:hidden text-[10px] uppercase tracking-wider text-gray-500">Points Awarded</span>
                                                                <span className="text-accent font-black text-base">+{event.points}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="rounded-xl border border-dashed border-white/15 p-6 text-gray-500 italic text-sm text-center">
                                                No point earning records for this team yet.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </Fragment>
                        );
                    })}

                    {teams.length === 0 && (
                        <div className="p-8 text-center text-gray-500 italic">
                            No team standings available yet.
                        </div>
                    )}
                </div>
            </section>

            <section className="space-y-6">
                <div className="flex items-center gap-2 p-2">
                    <Award className="text-accent" />
                    <h2 className="text-xl font-bold uppercase tracking-wider">Player Standings</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {players.map((player, idx) => (
                        <div
                            key={`${player.name}-${idx}`}
                            className="glass-card p-4 flex items-center justify-between hover:bg-white/[0.05] transition-all group relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-1 h-full bg-accent opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div className="flex items-center gap-4 min-w-0">
                                <div className="text-2xl font-black text-white/20 w-8">
                                    {idx + 1}
                                </div>
                                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 overflow-hidden shrink-0 shadow-lg">
                                    <img
                                        src={`/assets/employee/thumb/${player.name.toLowerCase()}.png`}
                                        alt={player.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => (e.currentTarget.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + player.name)}
                                    />
                                </div>
                                <div className="min-w-0">
                                    <div className="font-bold text-white truncate group-hover:text-accent transition-colors">{player.name}</div>
                                    <div className="text-[10px] text-gray-500 uppercase tracking-widest font-medium">Rank #{idx + 1}</div>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="text-accent font-black text-2xl tracking-tighter tabular-nums">
                                    {player.total_points}
                                </div>
                                <div className="text-[10px] text-gray-500 uppercase font-bold">Points</div>
                            </div>
                        </div>
                    ))}
                </div>

                {players.length === 0 && (
                    <div className="glass-card p-12 text-center text-gray-500 italic">
                        No player standings available yet.
                    </div>
                )}
            </section>
        </main>
    );
}
