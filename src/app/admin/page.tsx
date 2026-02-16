'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    Trophy,
    Calendar,
    Settings,
    RefreshCw,
    Search,
    Plus,
    Shield,
    ChevronRight,
    Gavel,
    FileText,
    BarChart,
    Home,
    LogOut,
    Play,
    CheckCircle,
    User,
    Award,
    Edit2,
    X,
    Timer,
    List
} from 'lucide-react';
import Link from 'next/link';
import BattleHistoryTable from '@/components/BattleHistoryTable';

interface Player {
    id: string;
    name: string;
    rating: number;
    pool: string;
    min_bid: number;
    tags?: string;
    is_auctioned: boolean;
    team_id: string | null;
    teamName?: string | null;
}

interface Captain {
    id: string;
    name: string;
    team_id: string | null;
    teamName?: string | null;
    balance?: number;
}

interface Match {
    id: string;
    team1_id: string | null;
    team2_id: string | null;
    team1Name?: string;
    team2Name?: string;
    date: string;
    type: string;
    month: number;
    case_description?: string;
    status: string;
    score1: number;
    score2: number;
    wickets1: number;
    wickets2: number;
    start_time?: string;
    end_time?: string;
}

interface Team {
    id: string;
    name: string;
}

interface CaseStudy {
    id: string;
    title: string;
    description: string;
    is_used: boolean;
    created_at: string;
}

interface BattleIdea {
    id: string;
    match_id: string;
    team_id: string;
    captain_id: string;
    content: string;
    score: number;
    runs: number;
    is_wicket: boolean;
    is_duplicate: boolean;
    feedback: string;
    created_at: string;
    match_type: string;
    team_name: string;
    captain_name: string;
}

export default function AdminPage() {
    const [players, setPlayers] = useState<Player[]>([]);
    const [captains, setCaptains] = useState<Captain[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    const [loggedInAdmin, setLoggedInAdmin] = useState<any>(null);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
    const [isAddingPlayer, setIsAddingPlayer] = useState(false);
    const [newPlayer, setNewPlayer] = useState({ name: '', rating: 5, pool: 'D', min_bid: 50000 });
    const [newMinBid, setNewMinBid] = useState<number>(0);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [auctionStatus, setAuctionStatus] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'auction' | 'captains' | 'schedule' | 'cases' | 'insights' | 'maintenance'>('auction');

    // Insights State
    const [battleIdeas, setBattleIdeas] = useState<BattleIdea[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Case Study State
    const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([]);
    const [isAddingCase, setIsAddingCase] = useState(false);
    const [newCase, setNewCase] = useState({ title: '', description: '' });
    const [isEditingCase, setIsEditingCase] = useState(false);
    const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
    const [schedule, setSchedule] = useState<Match[]>([]);
    const [startingBattleMatch, setStartingBattleMatch] = useState<Match | null>(null);
    const [caseDescription, setCaseDescription] = useState('');

    useEffect(() => {
        const checkSession = async () => {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                if (data.user.role === 'ADMIN') {
                    setLoggedInAdmin(data.user);
                    localStorage.setItem('sipl_admin', JSON.stringify(data.user));
                    return;
                }
            }
            // If session is invalid or wrong role
            localStorage.removeItem('sipl_admin');
            setLoggedInAdmin(null);
        };
        checkSession();
    }, []);

    useEffect(() => {
        if (loggedInAdmin) {
            fetchPlayers();
        } else {
            setLoading(false);
        }
    }, [loggedInAdmin]);

    const fetchPlayers = async () => {
        // setLoading(true); // Don't block UI on poll
        const playersRes = await fetch('/api/players');
        const playersData = await playersRes.json();
        setPlayers(playersData);

        const captainsRes = await fetch('/api/captains');
        const captainsData = await captainsRes.json();
        setCaptains(captainsData);

        const teamsRes = await fetch('/api/teams');
        const teamsData = await teamsRes.json();
        setTeams(teamsData);

        const scheduleRes = await fetch('/api/league/schedule');
        const scheduleData = await scheduleRes.json();
        setMatches(scheduleData);

        setLoading(false);

        // Fetch auction status for timer
        const auctionRes = await fetch('/api/auction/status');
        const auctionData = await auctionRes.json();
        setAuctionStatus(auctionData);

        if (auctionData.status === 'ACTIVE' && auctionData.timerEnd) {
            const remaining = Math.max(0, Math.floor((new Date(auctionData.timerEnd).getTime() - Date.now()) / 1000));
            setTimeLeft(remaining);
        } else {
            setTimeLeft(null);
        }

        const casesRes = await fetch('/api/admin/cases');
        const casesData = await casesRes.json();
        setCaseStudies(casesData);
    };

    useEffect(() => {
        if (!loggedInAdmin) return;

        const interval = setInterval(fetchPlayers, 1000); // Poll every second for timer sync
        return () => clearInterval(interval);
    }, [loggedInAdmin]);

    useEffect(() => {
        if (activeTab === 'insights') {
            fetchBattleIdeas();
        }
    }, [activeTab]);

    const fetchBattleIdeas = async () => {
        try {
            const res = await fetch('/api/battle/history');
            const data = await res.json();
            setBattleIdeas(data.ideas || []);
        } catch (error) {
            console.error('Error fetching battle ideas:', error);
        }
    };
    const resetCaptainPassword = async (captainId: string) => {
        if (!confirm('Are you sure you want to reset this captain\'s password to default (sipl2026)?')) return;

        try {
            const res = await fetch('/api/auth/admin/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ captainId }),
            });
            const data = await res.json();
            if (data.success) {
                alert('Password reset successfully!');
            } else {
                alert(data.error);
            }
        } catch (error) {
            alert('Failed to reset password');
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: username, password, type: 'admin' }),
        });
        const data = await res.json();

        if (data.success) {
            localStorage.setItem('sipl_admin', JSON.stringify(data.user));
            setLoggedInAdmin(data.user);
        } else {
            alert(data.error || 'Invalid credentials');
        }
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        localStorage.removeItem('sipl_admin');
        setLoggedInAdmin(null);
    };

    const handleUpdateMinBid = async () => {
        if (!editingPlayer) return;

        const res = await fetch('/api/admin/update-player', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId: editingPlayer.id, minBid: newMinBid }),
        });

        const data = await res.json();

        if (data.success) {
            alert('Minimum bid updated!');
            setEditingPlayer(null);
            fetchPlayers();
        } else {
            alert(data.error);
        }
    };

    const startAuction = async (playerId: string) => {
        const res = await fetch('/api/auction/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId }),
        });
        const data = await res.json();
        if (data.success) {
            alert('Auction started!');
            fetchPlayers();
        } else {
            alert(data.error);
        }
    };

    const handleAddPlayer = async () => {
        try {
            const res = await fetch('/api/admin/players', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newPlayer),
            });
            if (res.ok) {
                setIsAddingPlayer(false);
                setNewPlayer({ name: '', rating: 5, pool: 'D', min_bid: 50000 });
                fetchPlayers();
            }
        } catch (error) {
            alert('Failed to add player');
        }
    };

    const handleRemovePlayer = async (id: string) => {
        if (!confirm('Are you sure you want to remove this player?')) return;
        try {
            const res = await fetch(`/api/admin/players?id=${id}`, { method: 'DELETE' });
            if (res.ok) fetchPlayers();
            else {
                const data = await res.json();
                alert(data.error || 'Failed to remove player');
            }
        } catch (error) {
            alert('Failed to remove player');
        }
    };

    const handlePlayerAction = async (id: string, action: 'release' | 'assign', team_id?: string) => {
        let refund = false;
        if (action === 'release') {
            if (!confirm('Release this player from their team?')) return;
            refund = confirm('Refund sold price to team wallet?');
        }
        try {
            const res = await fetch('/api/admin/players', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action, team_id, refund }),
            });
            if (res.ok) fetchPlayers();
        } catch (error) {
            alert('Failed to update player');
        }
    };

    const handleTopup = async (teamId: string) => {
        const amountStr = prompt('Enter topup amount (e.g., 100000):');
        if (!amountStr) return;
        const amount = parseInt(amountStr);
        if (isNaN(amount) || amount <= 0) {
            alert('Invalid amount');
            return;
        }

        try {
            const res = await fetch('/api/admin/teams/topup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teamId, amount }),
            });
            if (res.ok) {
                alert('Wallet topped up!');
                fetchPlayers();
            }
        } catch (error) {
            alert('Failed to topup wallet');
        }
    };

    const handleUpdateSchedule = async (id: string, date: string) => {
        try {
            const res = await fetch('/api/admin/schedule', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, date }),
            });
            if (res.ok) {
                fetchPlayers();
            } else {
                alert('Failed to update schedule');
            }
        } catch (error) {
            alert('Error updating schedule');
        }
    };

    const handleAddCase = async () => {
        if (!newCase.title || !newCase.description) return;

        const url = isEditingCase ? '/api/admin/cases' : '/api/admin/cases';
        const method = isEditingCase ? 'PUT' : 'POST';
        const body = isEditingCase ? { id: editingCaseId, ...newCase } : newCase;

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (res.ok) {
            setIsAddingCase(false);
            setIsEditingCase(false);
            setEditingCaseId(null);
            setNewCase({ title: '', description: '' });
            fetchPlayers();
        } else {
            alert('Failed to save case study');
        }
    };

    const handleDeleteCase = async (id: string) => {
        if (!confirm('Are you sure you want to delete this case study?')) return;
        try {
            const res = await fetch('/api/admin/cases', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            if (res.ok) fetchPlayers();
        } catch (error) {
            alert('Failed to delete case study');
        }
    };

    const handleStartBattle = async (matchId: string, customCaseDesc: string = '') => {
        const finalDesc = customCaseDesc || caseDescription;

        const res = await fetch('/api/admin/battle/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ matchId, caseDescription: finalDesc }),
        });

        if (res.ok) {
            alert('Battle Started! Captains can now submit ideas.');
            setStartingBattleMatch(null);
            setCaseDescription('');
            fetchPlayers();
        } else {
            const data = await res.json();
            alert(data.error || 'Failed to start battle');
        }
    };

    const handleReset = async (type: 'results' | 'players' | 'wallets' | 'captains' | 'cases') => {
        const descriptions = {
            results: 'This will reset all match scores, summaries, and winners. Schedule and month assignments will remain.',
            players: 'This will remove all team assignments from players and clear the auction history.',
            wallets: 'This will reset all team wallets back to 1,000,000 tokens.',
            captains: 'This will unlink all captains from their assigned teams.',
            cases: 'This will remove all case studies status.'
        };

        if (confirm(`⚠️ WARNING: ${descriptions[type]}\n\nAre you sure you want to proceed? This action cannot be undone.`)) {
            const res = await fetch('/api/admin/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type }),
            });

            if (res.ok) {
                alert(`Reset ${type} successful!`);
                // Refresh data
                fetchPlayers();
                setCaptains([]); // Force refresh or fetch captains if there's a fetchCaptains
            } else {
                alert(`Failed to reset ${type}`);
            }
        }
    };

    const handleUpdateIdea = async (idea: any, weightedScore: number, breakdown: any) => {
        try {
            const res = await fetch('/api/battle/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ideaId: idea.id, weightedScore, breakdown }),
            });
            const data = await res.json();
            if (data.success) {
                // Refresh data to reflect new scores
                const matchesRes = await fetch('/api/league/schedule');
                if (matchesRes.ok) setMatches(await matchesRes.json());

                const ideasRes = await fetch('/api/battle/history');
                if (ideasRes.ok) {
                    const ideasData = await ideasRes.json();
                    setBattleIdeas(ideasData.ideas);
                }
            } else {
                alert('Failed to update score: ' + data.error);
            }
        } catch (error) {
            console.error(error);
            alert('Error updating score');
        }
    };

    const handleUnpublishMatch = async (matchId: string) => {
        if (!confirm('Are you sure you want to UNPUBLISH this match? This will REVERT the Points Table changes.')) return;

        try {
            const res = await fetch('/api/admin/battle/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ matchId, published: false }),
            });
            const data = await res.json();
            if (data.success) {
                alert('Match unpublished successfully! Points table reverted.');
                // Refresh matches to update status UI
                const matchesRes = await fetch('/api/league/schedule');
                if (matchesRes.ok) setMatches(await matchesRes.json());
            } else {
                alert('Failed to unpublish match: ' + data.error);
            }
        } catch (error) {
            console.error(error);
            alert('Error unpublishing match');
        }
    };

    const handlePublishMatch = async (matchId: string) => {
        if (!confirm('Are you sure you want to PUBLISH this match? This will update the Points Table and cannot be undone.')) return;

        try {
            const res = await fetch('/api/admin/battle/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ matchId, published: true }),
            });
            const data = await res.json();
            if (data.success) {
                alert('Match published successfully! Points table updated.');
                // Refresh matches to update status UI
                const matchesRes = await fetch('/api/league/schedule');
                if (matchesRes.ok) setMatches(await matchesRes.json());
            } else {
                alert('Failed to publish match: ' + data.error);
            }
        } catch (error) {
            console.error(error);
            alert('Error publishing match');
        }
    };


    if (loading) return <div className="p-8">Loading...</div>;

    if (!loggedInAdmin) {
        return (
            <main className="min-h-screen flex items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-12 max-w-md w-full border-red-500/20"
                >
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 rounded-2xl bg-red-500/10 flex items-center justify-center">
                            <Shield className="text-red-500 w-10 h-10" />
                        </div>
                    </div>
                    <h2 className="text-3xl font-black text-center mb-2">Admin Login</h2>
                    <p className="text-gray-400 text-center mb-8">Restricted Access Zone</p>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs text-gray-500 uppercase font-black px-1">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 focus:border-red-500 outline-none text-white transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs text-gray-500 uppercase font-black px-1">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 focus:border-red-500 outline-none text-white transition-all"
                            />
                        </div>
                        <button type="submit" className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-xl transition-all mt-4 flex items-center justify-center gap-2">
                            Access Console
                        </button>
                    </form>
                    <div className="mt-8 pt-8 border-t border-white/5 text-center">
                        <Link
                            href="/"
                            className="text-gray-500 hover:text-white transition-colors font-bold uppercase tracking-widest text-xs flex items-center gap-2 justify-center"
                        >
                            <Home className="w-3 h-3" /> Back to Home
                        </Link>
                    </div>
                </motion.div>
            </main>
        );
    }

    return (
        <main className="p-8 max-w-6xl mx-auto">
            <header className="flex justify-between items-center mb-12">
                <div>
                    <h1 className="text-4xl font-black text-glow">ADMIN CONSOLE</h1>
                    <p className="text-gray-400">Tournament Control & Auction Management</p>
                </div>
                <div className="flex items-center gap-4">
                    <Link
                        href="/"
                        className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-6 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white transition-all font-bold"
                    >
                        <Home className="w-5 h-5" /> Home
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 bg-white/5 hover:bg-red-500/20 px-6 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-red-500 transition-all font-bold"
                    >
                        <LogOut className="w-5 h-5" /> Logout
                    </button>
                </div>
            </header>

            <div className="flex gap-4 mb-8 border-b border-white/10 pb-4">
                <button
                    onClick={() => setActiveTab('auction')}
                    className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'auction' ? 'bg-accent text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                    <Trophy className="inline-block w-4 h-4 mr-2" /> Auction
                </button>
                <button
                    onClick={() => setActiveTab('captains')}
                    className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'captains' ? 'bg-accent text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                    <User className="inline-block w-4 h-4 mr-2" /> Captains
                </button>
                <button
                    onClick={() => setActiveTab('schedule')}
                    className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'schedule' ? 'bg-accent text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                    <Trophy className="inline-block w-4 h-4 mr-2" /> Schedule
                </button>
                <button
                    onClick={() => setActiveTab('cases')}
                    className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'cases' ? 'bg-accent text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                    <Award className="inline-block w-4 h-4 mr-2" /> Cases
                </button>
                <button
                    onClick={() => setActiveTab('insights')}
                    className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'insights' ? 'bg-accent text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                    <List className="inline-block w-4 h-4 mr-2" /> Insights
                </button>
                <button
                    onClick={() => setActiveTab('maintenance')}
                    className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'maintenance' ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                    <Settings className="inline-block w-4 h-4 mr-2" /> Maintenance
                </button>
            </div>

            {activeTab === 'schedule' && (
                <section className="mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
                        <Trophy className="text-accent" /> SCHEDULE MANAGEMENT
                    </h2>

                    <div className="glass-card p-8 space-y-8">
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-xl font-bold mb-2">League & Playoff Schedule</h3>
                                    <p className="text-gray-400">View and manually adjust match dates and times.</p>
                                </div>
                                <button
                                    onClick={async () => {
                                        if (!confirm('Generate new schedule? This will clear all existing matches and results.')) return;
                                        const res = await fetch('/api/league/generate-schedule', { method: 'POST' });
                                        const data = await res.json();
                                        if (data.success) {
                                            alert(`Schedule generated successfully! ${data.count} matches created.`);
                                            fetchPlayers();
                                        } else {
                                            alert('Failed to generate schedule');
                                        }
                                    }}
                                    className="bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/20 font-black px-6 py-3 rounded-xl transition-all flex items-center gap-2 text-xs"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    REGENERATE COMPLETE SCHEDULE
                                </button>
                            </div>

                            <div className="space-y-4">
                                {Array.isArray(matches) && matches.map((match) => (
                                    <div key={match.id} className="bg-black/40 border border-white/5 rounded-xl p-4 flex flex-col md:flex-row justify-between items-center gap-4 hover:border-accent/20 transition-all">
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className="px-3 py-1 bg-white/5 rounded-lg text-[10px] font-bold text-gray-500 uppercase">
                                                {match.type === 'LEAGUE' ? `Month ${match.month}` : match.type}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-sm min-w-[100px] text-right">
                                                    {match.team1Name || 'TBD'}
                                                </span>
                                                <span className="text-[10px] font-black italic text-gray-600">VS</span>
                                                <span className="font-bold text-sm min-w-[100px]">
                                                    {match.team2Name || 'TBD'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            {match.status === 'SCHEDULED' ? (
                                                <>
                                                    <input
                                                        type="datetime-local"
                                                        defaultValue={new Date(match.date).toISOString().slice(0, 16)}
                                                        className="bg-black/60 border border-white/10 rounded-lg p-2 text-xs focus:border-accent outline-none text-white"
                                                        id={`date-${match.id}`}
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const input = document.getElementById(`date-${match.id}`) as HTMLInputElement;
                                                            handleUpdateSchedule(match.id, new Date(input.value).toISOString());
                                                        }}
                                                        className="bg-accent/10 hover:bg-accent text-accent hover:text-white px-4 py-2 rounded-lg text-[10px] font-bold border border-accent/20 transition-all"
                                                    >
                                                        UPDATE
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (confirm(`Start Live Battle for ${match.team1Name} vs ${match.team2Name}?`)) {
                                                                handleStartBattle(match.id);
                                                            }
                                                        }}
                                                        className="bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-white px-4 py-2 rounded-lg text-[10px] font-bold border border-green-500/20 transition-all ml-2"
                                                    >
                                                        START BATTLE
                                                    </button>
                                                </>
                                            ) : match.status === 'IN_PROGRESS' ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[10px] text-red-500 font-black animate-pulse">LIVE BATTLE</span>
                                                        <span className="text-xs font-mono font-bold text-white">
                                                            {match.score1}/{match.wickets1} vs {match.score2}/{match.wickets2}
                                                        </span>
                                                    </div>
                                                    <button
                                                        className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-4 py-2 rounded-lg text-[10px] font-bold border border-red-500/20 transition-all"
                                                    >
                                                        VIEW LIVE
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-end gap-2">
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[10px] text-gray-500 font-bold uppercase">Completed</span>
                                                        <span className="text-xs font-mono font-bold text-gray-300">
                                                            {match.score1} - {match.score2}
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={() => window.open(`/match/${match.id}`, '_blank')}
                                                        className="bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg text-[9px] font-black tracking-widest uppercase border border-white/10"
                                                    >
                                                        Review Results
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {activeTab === 'cases' && (
                <section className="mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-end mb-8">
                        <div>
                            <h2 className="text-2xl font-black flex items-center gap-3">
                                <Award className="text-accent" /> CASE STUDY LIBRARY
                            </h2>
                            <p className="text-gray-400 mt-1">Manage unique problem statements for Match Battles.</p>
                        </div>
                        <button
                            onClick={() => {
                                setIsEditingCase(false);
                                setNewCase({ title: '', description: '' });
                                setIsAddingCase(true);
                            }}
                            className="bg-accent text-white font-bold px-6 py-2 rounded-lg transition-all hover:scale-105 flex items-center gap-2"
                        >
                            <Play className="w-4 h-4" /> ADD CASE STUDY
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {caseStudies.map(cs => (
                            <div key={cs.id} className="glass-card p-6 border-white/5 hover:border-accent/20 transition-all relative group">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-lg font-bold text-white">{cs.title}</h3>
                                    <div className="flex items-center gap-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${cs.is_used ? 'bg-gray-500/20 text-gray-500' : 'bg-green-500/20 text-green-500'}`}>
                                            {cs.is_used ? 'USED' : 'AVAILABLE'}
                                        </span>
                                        <button
                                            onClick={() => handleDeleteCase(cs.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setNewCase({ title: cs.title, description: cs.description });
                                                setEditingCaseId(cs.id);
                                                setIsEditingCase(true);
                                                setIsAddingCase(true);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all"
                                        >
                                            <Edit2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-gray-400 text-sm leading-relaxed line-clamp-3 mb-4">
                                    {cs.description}
                                </p>
                                <div className="text-[10px] text-gray-600 font-mono">
                                    ADDED: {new Date(cs.created_at).toLocaleDateString()}
                                </div>
                            </div>
                        ))}

                        {caseStudies.length === 0 && (
                            <div className="col-span-full py-20 text-center glass-card border-dashed border-white/10 opacity-60">
                                <Award className="w-12 h-12 text-gray-600 mx-auto mb-4 opacity-20" />
                                <h4 className="text-xl font-bold text-gray-500">No Case Studies Found</h4>
                                <p className="text-sm text-gray-600">Start by adding innovation problem statements to your library.</p>
                            </div>
                        )}
                    </div>
                </section>
            )
            }

            {
                activeTab === 'captains' && (
                    <section className="mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
                            <Shield className="text-accent" /> CAPTAIN MANAGEMENT
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {captains.map(captain => (
                                <div key={captain.id} className="glass-card p-6 flex flex-col items-center text-center">
                                    <div className="w-16 h-16 rounded-full overflow-hidden mb-4 border-2 border-white/10">
                                        <img
                                            src={`/assets/employee/${captain.name.toLowerCase()}.png`}
                                            alt={captain.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => (e.currentTarget.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + captain.name)}
                                        />
                                    </div>
                                    <h3 className="font-bold mb-1">{captain.name}</h3>
                                    <p className="text-xs text-accent font-black mb-1">{captain.teamName || 'NO TEAM'}</p>
                                    {captain.team_id && (
                                        <div className="mb-4">
                                            <div className="text-[10px] text-gray-500 uppercase font-bold">Wallet Balance</div>
                                            <div className="text-sm font-black text-white">₹{(captain.balance || 0).toLocaleString()}</div>
                                            <button
                                                onClick={() => handleTopup(captain.team_id!)}
                                                className="text-[9px] text-accent hover:underline font-bold mt-1"
                                            >
                                                + Topup Wallet
                                            </button>
                                        </div>
                                    )}
                                    <p className="text-xs text-gray-500 mb-4">{captain.team_id ? 'Assigned' : 'Unassigned'}</p>
                                    <button
                                        onClick={() => resetCaptainPassword(captain.id)}
                                        className="text-xs bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-500 py-2 px-4 rounded-lg border border-white/5 transition-all w-full flex items-center justify-center gap-2"
                                    >
                                        <RefreshCw className="w-3 h-3" /> Reset Password
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>
                )
            }

            {
                activeTab === 'insights' && (
                    <section className="mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-end mb-8">
                            <div>
                                <h2 className="text-2xl font-black flex items-center gap-3">
                                    <List className="text-accent" /> BATTLE INSIGHTS
                                </h2>
                                <p className="text-gray-400 mt-1">Audit trail of all innovation ideas submitted during battles.</p>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="text"
                                    placeholder="Search ideas, teams, or results..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-accent outline-none text-sm w-64 transition-all"
                                />
                            </div>
                        </div>

                        <BattleHistoryTable
                            ideas={battleIdeas}
                            matches={matches}
                            searchTerm={searchTerm}
                            editable={true}
                            onUpdateIdea={handleUpdateIdea}
                            onPublishMatch={handlePublishMatch}
                            onUnpublishMatch={handleUnpublishMatch}
                        />
                    </section>
                )
            }

            {
                activeTab === 'auction' && (
                    <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-end mb-8">
                            <h2 className="text-2xl font-black flex items-center gap-3">
                                <Trophy className="text-accent" /> AUCTION CONTROL
                            </h2>
                            <div className="flex gap-4">
                                <button
                                    onClick={async () => {
                                        if (!confirm('Shuffle and reset all teams? This cannot be undone.')) return;
                                        const res = await fetch('/api/auction/reset', { method: 'POST' });
                                        const data = await res.json();
                                        if (data.success) {
                                            fetchPlayers();
                                            alert('Auction table and teams reset successfully!');
                                        }
                                    }}
                                    className="bg-red-500 text-white font-bold px-6 py-2 rounded-lg transition-all hover:scale-105"
                                >
                                    RESET TEAMS
                                </button>
                                <button
                                    onClick={() => setIsAddingPlayer(true)}
                                    className="bg-accent text-white font-bold px-6 py-2 rounded-lg transition-all hover:scale-105 flex items-center gap-2"
                                >
                                    <Play className="w-4 h-4" /> ADD PLAYER
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {players.map(player => {
                                const isLive = auctionStatus?.status === 'ACTIVE' && auctionStatus?.playerId === player.id;
                                const isSold = player.is_auctioned;

                                return (
                                    <div
                                        key={player.id}
                                        className={`glass-card p-6 flex flex-col justify-between relative overflow-hidden ${isLive ? 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)]' : ''}`}
                                    >
                                        {isLive && timeLeft !== null && (
                                            <div className="absolute top-0 right-0 bg-red-600 text-white px-4 py-1 rounded-bl-xl font-mono font-bold flex items-center gap-2 z-10 animate-pulse">
                                                <Timer className="w-4 h-4" /> {timeLeft}s
                                            </div>
                                        )}

                                        <div>
                                            <div className="flex justify-between items-start mb-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${player.pool === 'A' ? 'bg-red-500' :
                                                    player.pool === 'B' ? 'bg-orange-500' :
                                                        player.pool === 'C' ? 'bg-yellow-500' :
                                                            'bg-blue-500'
                                                    }`}>
                                                    Pool {player.pool}
                                                </span>
                                                <span className="text-accent font-bold">Rating: {player.rating}</span>
                                            </div>
                                            <h3 className="text-xl font-bold mb-1">{player.name}</h3>
                                            {player.tags && (
                                                <div className="flex flex-wrap gap-1 mb-3">
                                                    {player.tags.split(',').map(tag => (
                                                        <span key={tag} className="text-[9px] bg-white/5 text-gray-400 border border-white/10 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-tighter">
                                                            {tag.trim()}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center">
                                                <p className="text-gray-400">Min Bid: {player.min_bid.toLocaleString()}</p>
                                                {!player.is_auctioned && !isLive && (
                                                    <button
                                                        onClick={() => {
                                                            setEditingPlayer(player);
                                                            setNewMinBid(player.min_bid);
                                                        }}
                                                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                                                        title="Edit Min Bid"
                                                    >
                                                        <Edit2 className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mt-6">
                                            {player.is_auctioned ? (
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-2 text-green-500">
                                                        <CheckCircle className="w-5 h-5" /> Sold: <span className="font-bold">{player.teamName}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => handlePlayerAction(player.id, 'release')}
                                                        className="w-full text-xs text-red-400 hover:text-red-300 py-2 border border-red-500/20 rounded-lg hover:bg-red-500/10 transition-all font-bold"
                                                    >
                                                        RELEASE FROM TEAM
                                                    </button>
                                                </div>
                                            ) : isLive ? (
                                                <div className="w-full bg-red-500/20 text-red-500 py-3 rounded-xl font-bold flex items-center justify-center gap-2 border border-red-500/50">
                                                    <Timer className="w-5 h-5 animate-spin" /> AUCTION LIVE
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => startAuction(player.id)}
                                                            className="flex-1 btn-primary flex items-center justify-center gap-2 py-3 text-xs"
                                                            disabled={auctionStatus?.status === 'ACTIVE'}
                                                        >
                                                            <Play className="w-4 h-4" /> Start Auction
                                                        </button>
                                                        <button
                                                            onClick={() => handleRemovePlayer(player.id)}
                                                            className="px-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 transition-all rounded-xl"
                                                            title="Remove Player"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    <select
                                                        onChange={(e) => {
                                                            if (e.target.value) {
                                                                handlePlayerAction(player.id, 'assign', e.target.value);
                                                                e.target.value = '';
                                                            }
                                                        }}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-xs outline-none focus:border-accent appearance-none text-center cursor-pointer"
                                                        defaultValue=""
                                                    >
                                                        <option value="" disabled className="bg-gray-900">Assign to Team...</option>
                                                        {teams.map(t => (
                                                            <option key={t.id} value={t.id} className="bg-gray-900">{t.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )
            }

            {
                editingPlayer && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="glass-card p-8 max-w-sm w-full border-accent"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold">Edit Min Bid</h3>
                                <button onClick={() => setEditingPlayer(null)}><X className="w-5 h-5" /></button>
                            </div>
                            <p className="text-gray-400 mb-4">Update base price for <span className="text-white font-bold">{editingPlayer.name}</span></p>
                            <input
                                type="number"
                                value={newMinBid}
                                onChange={(e) => setNewMinBid(parseInt(e.target.value) || 0)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 mb-6 focus:border-accent outline-none text-white font-mono text-xl"
                            />
                            <button
                                onClick={handleUpdateMinBid}
                                className="w-full btn-primary py-3 font-bold"
                            >
                                UPDATE PRICE
                            </button>
                        </motion.div>
                    </div>
                )
            }
            {
                isAddingPlayer && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="glass-card p-8 max-w-sm w-full border-accent"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold uppercase tracking-widest">Add New Player</h3>
                                <button onClick={() => setIsAddingPlayer(false)}><X className="w-5 h-5" /></button>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-gray-500 uppercase font-bold">Name</label>
                                    <input
                                        type="text"
                                        value={newPlayer.name}
                                        onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 focus:border-accent outline-none text-white text-sm"
                                        placeholder="Player Name"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-gray-500 uppercase font-bold">Rating (1-10)</label>
                                        <input
                                            type="number"
                                            value={newPlayer.rating}
                                            onChange={(e) => setNewPlayer({ ...newPlayer, rating: parseInt(e.target.value) || 0 })}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 focus:border-accent outline-none text-white text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-gray-500 uppercase font-bold">Pool</label>
                                        <select
                                            value={newPlayer.pool}
                                            onChange={(e) => setNewPlayer({ ...newPlayer, pool: e.target.value })}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 focus:border-accent outline-none text-white text-sm appearance-none"
                                        >
                                            <option value="A">Pool A</option>
                                            <option value="B">Pool B</option>
                                            <option value="C">Pool C</option>
                                            <option value="D">Pool D</option>
                                            <option value="E">Pool E</option>
                                            <option value="F">Pool F</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-gray-500 uppercase font-bold">Min Bid</label>
                                    <input
                                        type="number"
                                        value={newPlayer.min_bid}
                                        onChange={(e) => setNewPlayer({ ...newPlayer, min_bid: parseInt(e.target.value) || 0 })}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 focus:border-accent outline-none text-white text-sm font-mono"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleAddPlayer}
                                className="w-full btn-primary py-3 font-black mt-8 text-sm uppercase tracking-widest"
                                disabled={!newPlayer.name}
                            >
                                SAVE PLAYER
                            </button>
                        </motion.div>
                    </div>
                )
            }
            {
                activeTab === 'maintenance' && (
                    <section className="mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
                            <Settings className="text-red-500" /> SYSTEM MAINTENANCE
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Reset Results */}
                            <div className="glass-card p-8 border-red-500/20 space-y-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-3 rounded-xl bg-red-500/10 text-red-500">
                                        <RefreshCw className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-xl font-bold uppercase tracking-widest">Reset Results</h3>
                                </div>
                                <p className="text-gray-400 text-sm leading-relaxed">
                                    Clears all match scores, AI summaries, and winners.
                                    Match schedule and dates remain intact.
                                </p>
                                <button
                                    onClick={() => handleReset('results')}
                                    className="w-full bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-600/20 px-6 py-4 rounded-xl font-black transition-all uppercase tracking-widest text-xs"
                                >
                                    Reset Match Results
                                </button>
                            </div>

                            {/* Reset Cases */}
                            <div className="glass-card p-8 border-red-500/20 space-y-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-3 rounded-xl bg-red-500/10 text-red-500">
                                        <Award className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-xl font-bold uppercase tracking-widest">Reset Case Status</h3>
                                </div>
                                <p className="text-gray-400 text-sm leading-relaxed">
                                    Resets the 'Used' status of all case studies, making them available for random selection again.
                                </p>
                                <button
                                    onClick={() => handleReset('cases')}
                                    className="w-full bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-600/20 px-6 py-4 rounded-xl font-black transition-all uppercase tracking-widest text-xs"
                                >
                                    Reset Case Status
                                </button>
                            </div>

                            {/* Reset Assignments */}
                            <div className="glass-card p-8 border-red-500/20 space-y-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-3 rounded-xl bg-red-500/10 text-red-500">
                                        <User className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-xl font-bold uppercase tracking-widest">Reset Players</h3>
                                </div>
                                <p className="text-gray-400 text-sm leading-relaxed">
                                    Unassigns all players from teams and clears auction history (bids).
                                    Players return to the pool for a fresh auction.
                                </p>
                                <button
                                    onClick={() => handleReset('players')}
                                    className="w-full bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-600/20 px-6 py-4 rounded-xl font-black transition-all uppercase tracking-widest text-xs"
                                >
                                    Reset Player Assignments
                                </button>
                            </div>

                            {/* Reset Wallets */}
                            <div className="glass-card p-8 border-red-500/20 space-y-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-3 rounded-xl bg-red-500/10 text-red-500">
                                        <Trophy className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-xl font-bold uppercase tracking-widest">Reset Wallets</h3>
                                </div>
                                <p className="text-gray-400 text-sm leading-relaxed">
                                    Resets all team wallet balances to the starting amount of 1,000,000 tokens.
                                </p>
                                <button
                                    onClick={() => handleReset('wallets')}
                                    className="w-full bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-600/20 px-6 py-4 rounded-xl font-black transition-all uppercase tracking-widest text-xs"
                                >
                                    Reset All Wallets
                                </button>
                            </div>

                            {/* Reset Captains */}
                            <div className="glass-card p-8 border-red-500/20 space-y-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-3 rounded-xl bg-red-500/10 text-red-500">
                                        <Shield className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-xl font-bold uppercase tracking-widest">Reset Captains</h3>
                                </div>
                                <p className="text-gray-400 text-sm leading-relaxed">
                                    Unlinks all captains from their current teams. Requires re-assignment
                                    from the Team Management tab.
                                </p>
                                <button
                                    onClick={() => handleReset('captains')}
                                    className="w-full bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-600/20 px-6 py-4 rounded-xl font-black transition-all uppercase tracking-widest text-xs"
                                >
                                    Reset Captain Assignments
                                </button>
                            </div>
                        </div>
                    </section>
                )
            }

            {
                isAddingCase && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="glass-card p-8 max-w-lg w-full border-accent"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold uppercase tracking-widest">{isEditingCase ? 'Edit Case Study' : 'Add Case Study'}</h3>
                                <button onClick={() => { setIsAddingCase(false); setIsEditingCase(false); }}><X className="w-5 h-5" /></button>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-gray-500 uppercase font-bold">Case Title</label>
                                    <input
                                        type="text"
                                        value={newCase.title}
                                        onChange={(e) => setNewCase({ ...newCase, title: e.target.value })}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 focus:border-accent outline-none text-white text-sm"
                                        placeholder="e.g., Sustainability in Supply Chain"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-gray-500 uppercase font-bold">Description / Problem Statement</label>
                                    <textarea
                                        value={newCase.description}
                                        onChange={(e) => setNewCase({ ...newCase, description: e.target.value })}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-4 focus:border-accent outline-none text-white text-sm min-h-[250px] resize-none leading-relaxed"
                                        placeholder="Detailed problem statement..."
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleAddCase}
                                className="w-full btn-primary py-4 font-black mt-8 text-sm uppercase tracking-widest rounded-xl"
                                disabled={!newCase.title || !newCase.description}
                            >
                                SAVE TO LIBRARY
                            </button>
                        </motion.div>
                    </div>
                )
            }
        </main >
    );
}
