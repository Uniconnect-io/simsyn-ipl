'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
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
    List,
    Zap,
    Trash2,
    Check,
    Upload,
    Lightbulb,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Modular Tab Components
import IdeasTab from '@/components/admin/IdeasTab';
import OwnersTab from '@/components/admin/OwnersTab';
import CasesTab from '@/components/admin/CasesTab';
import AuctionTab from '@/components/admin/AuctionTab';
import BattlesTab from '@/components/admin/BattlesTab';
import MaintenanceTab from '@/components/admin/MaintenanceTab';

interface Player {
    id: string;
    name: string;
    rating: number;
    pool: string;
    min_bid: number;
    tags?: string;
    is_auctioned: boolean;
    role?: string;
    team_id: string | null;
    teamName?: string | null;
}

interface Owner {
    id: string;
    name: string;
    team_id: string | null;
    teamName?: string | null;
    balance?: number;
    role?: string;
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
    captain_id?: string | null;
    owner_id?: string | null;
}

interface CaseStudy {
    id: string;
    title: string;
    description: string;
    is_used: boolean;
    created_at: string;
}

export default function AdminPage() {
    const [loggedInAdmin, setLoggedInAdmin] = useState<any>(null);
    const [isCheckingSession, setIsCheckingSession] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [activeTab, setActiveTab] = useState('owners');
    const [loading, setLoading] = useState(false);

    // Data states
    const [players, setPlayers] = useState<Player[]>([]);
    const [owners, setOwners] = useState<Owner[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [matches, setMatches] = useState<Match[]>([]);
    const [individualBattles, setIndividualBattles] = useState<any[]>([]);
    const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([]);
    const [auctionStatus, setAuctionStatus] = useState<any>(null);
    const [timeLeft, setLeftTime] = useState<number | null>(null);
    const [startingAuctionId, setStartingAuctionId] = useState<string | null>(null);

    useEffect(() => {
        checkSession();
        const interval = setInterval(fetchHeartbeat, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (auctionStatus?.status === 'ACTIVE' && auctionStatus.timerEnd) {
            const calculateTime = () => {
                const end = new Date(auctionStatus.timerEnd).getTime();
                const now = Date.now();
                const remaining = Math.max(0, Math.floor((end - now) / 1000));
                setLeftTime(remaining);
            };

            calculateTime();
            const timer = setInterval(calculateTime, 1000);
            return () => clearInterval(timer);
        } else {
            setLeftTime(null);
        }
    }, [auctionStatus]);

    const checkSession = async () => {
        const session = localStorage.getItem('sipl_admin');
        if (session) {
            setLoggedInAdmin(JSON.parse(session));
            fetchHeartbeat();
        }
        setIsCheckingSession(false);
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: username, password, type: 'admin' }),
            });
            const data = await res.json();

            if (data.success) {
                localStorage.setItem('sipl_admin', JSON.stringify(data.user));
                setLoggedInAdmin(data.user);
                fetchHeartbeat();
            } else {
                alert(data.error || 'Invalid credentials');
            }
        } catch (error) {
            console.error(error);
            alert('Login failed');
        }
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        localStorage.removeItem('sipl_admin');
        setLoggedInAdmin(null);
    };

    const resetUserPassword = async (userId: string) => {
        if (!confirm('Are you sure you want to reset this user\'s password to default (sipl2026)?')) return;

        try {
            const res = await fetch('/api/auth/admin/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ownerId: userId }),
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
            if (res.ok) fetchHeartbeat();
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
                fetchHeartbeat();
            }
        } catch (error) {
            alert('Failed to topup wallet');
        }
    };

    const handleStartBattle = async (matchId: string, customCaseDesc: string = '') => {
        const res = await fetch('/api/admin/battle/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ matchId, caseDescription: customCaseDesc }),
        });

        if (res.ok) {
            alert('Battle Started! Owners can now submit ideas.');
            fetchHeartbeat();
        } else {
            const data = await res.json();
            alert(data.error || 'Failed to start battle');
        }
    };

    const handleRemovePlayer = async (id: string) => {
        if (!confirm('Are you sure you want to remove this player from the auction pool?')) return;
        try {
            const res = await fetch(`/api/admin/players?id=${id}`, { method: 'DELETE' });
            if (res.ok) fetchHeartbeat();
            else alert('Failed to remove player');
        } catch (error) {
            alert('Failed to remove player');
        }
    };

    const handleEditPlayer = async (player: Player) => {
        const newBidStr = prompt(`Enter new Base Price for ${player.name} (Current: ${player.min_bid}):`, player.min_bid.toString());
        if (newBidStr === null) return;
        const newBid = parseInt(newBidStr);
        if (isNaN(newBid) || newBid < 0) return alert('Invalid base price');

        try {
            const res = await fetch('/api/admin/update-player', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerId: player.id, minBid: newBid })
            });
            if (res.ok) fetchHeartbeat();
            else alert('Failed to update player base price');
        } catch (error) {
            alert('Failed to update player');
        }
    };

    const handleStartIndividualBattle = async (battleId: string) => {
        if (!confirm('Start this individual battle?')) return;
        try {
            await fetch('/api/admin/battles', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: battleId, status: 'ACTIVE' })
            });
            fetchHeartbeat();
        } catch (error) {
            console.error(error);
            alert('Failed to start battle');
        }
    };

    const handleEndIndividualBattle = async (battleId: string) => {
        if (!confirm('End this individual battle and calculate scores?')) return;
        try {
            await fetch('/api/admin/battles', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: battleId, status: 'COMPLETED' })
            });
            fetchHeartbeat();
        } catch (error) {
            console.error(error);
            alert('Failed to end battle');
        }
    };

    const handleDeleteMatch = async (id: string) => {
        if (!confirm('Delete this match/battle?')) return;
        try {
            await fetch('/api/admin/battles', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            fetchHeartbeat();
        } catch (error) {
            alert('Failed to delete match');
        }
    };

    const fetchHeartbeat = async () => {
        try {
            const [
                playersRes,
                ownersRes,
                teamsRes,
                matchesRes,
                casesRes,
                auctionRes,
                battlesRes
            ] = await Promise.all([
                fetch(`/api/players?_=${Date.now()}`),
                fetch(`/api/owners?_=${Date.now()}`),
                fetch(`/api/teams?_=${Date.now()}`),
                fetch(`/api/league/schedule?_=${Date.now()}`),
                fetch(`/api/admin/cases?_=${Date.now()}`),
                fetch(`/api/auction/status?_=${Date.now()}`),
                fetch(`/api/admin/battles?_=${Date.now()}`)
            ]);

            if (playersRes.ok) setPlayers(await playersRes.json());
            if (ownersRes.ok) setOwners(await ownersRes.json());
            if (teamsRes.ok) setTeams(await teamsRes.json());
            if (matchesRes.ok) setMatches(await matchesRes.json());
            if (casesRes.ok) setCaseStudies(await casesRes.json());
            if (battlesRes.ok) setIndividualBattles(await battlesRes.json());

            if (auctionRes.ok) {
                const status = await auctionRes.json();
                setAuctionStatus(status);
                if (status.status !== 'ACTIVE') {
                    setStartingAuctionId(null);
                }
            }

        } catch (error) {
            console.error('Heartbeat failed:', error);
        }
    };

    const startAuction = async (playerId: string) => {
        setStartingAuctionId(playerId);
        try {
            const res = await fetch('/api/auction/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerId })
            });
            if (!res.ok) alert('Failed to start auction');
            fetchHeartbeat();
        } catch (error) {
            console.error(error);
        }
    };

    const handleResetAuction = async () => {
        if (!confirm('RESET entire auction? All teams will be cleared. This cannot be undone.')) return;
        try {
            const res = await fetch('/api/admin/reset-auction', { method: 'POST' });
            if (res.ok) {
                alert('Auction reset complete');
                fetchHeartbeat();
            }
        } catch (error) {
            console.error(error);
        }
    };

    if (isCheckingSession || loading) return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white">
            <Shield className="w-12 h-12 text-red-500 animate-pulse mb-4" />
            <p className="text-xs font-bold uppercase tracking-[0.3em] animate-pulse">Initializing SIPL Console...</p>
        </div>
    );

    if (!loggedInAdmin) {
        return (
            <main className="min-h-screen flex items-center justify-center p-6 bg-black">
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
                    <p className="text-gray-400 text-center mb-8 text-xs font-bold uppercase">Restricted Access Zone</p>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] text-gray-500 uppercase font-black px-1">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:border-red-500 outline-none text-white transition-all text-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] text-gray-500 uppercase font-black px-1">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:border-red-500 outline-none text-white transition-all text-sm"
                            />
                        </div>
                        <button type="submit" className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-xl transition-all mt-4 flex items-center justify-center gap-2 text-xs uppercase tracking-widest">
                            Access Console
                        </button>
                    </form>
                    <div className="mt-8 pt-8 border-t border-white/5 text-center">
                        <Link
                            href="/"
                            className="text-gray-500 hover:text-white transition-colors font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 justify-center"
                        >
                            <Home className="w-3 h-3" /> Back to Home
                        </Link>
                    </div>
                </motion.div>
            </main>
        );
    }

    return (
        <main className="p-8 max-w-7xl mx-auto min-h-screen">
            <header className="flex justify-between items-center mb-12">
                <div>
                    <h1 className="text-4xl font-black text-glow uppercase tracking-tighter italic">ADMIN CONSOLE</h1>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Tournament Control & Auction Management</p>
                </div>
                <div className="flex items-center gap-4">
                    <Link
                        href="/"
                        className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-6 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white transition-all text-xs font-black uppercase tracking-widest"
                    >
                        <Home className="w-4 h-4" /> Home
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 bg-white/5 hover:bg-red-500/20 px-6 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-red-500 transition-all text-xs font-black uppercase tracking-widest"
                    >
                        <LogOut className="w-4 h-4" /> Logout
                    </button>
                </div>
            </header>

            <nav className="flex gap-2 mb-12 border-b border-white/5 pb-4 overflow-x-auto custom-scrollbar no-scrollbar">
                {[
                    { id: 'owners', label: 'Players', icon: Shield },
                    { id: 'ideas', label: 'Idea Hub', icon: Lightbulb },
                    { id: 'battles', label: 'Battles', icon: Zap },
                    { id: 'auction', label: 'Auction', icon: Gavel },
                    { id: 'maintenance', label: 'Maintenance', icon: Settings, color: 'hover:text-red-500' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 whitespace-nowrap
                            ${activeTab === tab.id
                                ? tab.id === 'maintenance' ? 'bg-red-500 text-white' : 'bg-accent text-white'
                                : `text-gray-500 hover:bg-white/5 ${tab.color || 'hover:text-accent'}`}`}
                    >
                        <tab.icon className="w-4 h-4" /> {tab.label}
                    </button>
                ))}
            </nav>

            <div className="mt-8">
                {activeTab === 'owners' && (
                    <OwnersTab
                        owners={owners}
                        players={players}
                        teams={teams}
                        onResetPassword={resetUserPassword}
                        onTopup={handleTopup}
                        onPlayerAction={handlePlayerAction}
                    />
                )}

                {activeTab === 'ideas' && <IdeasTab />}

                {activeTab === 'battles' && (
                    <BattlesTab
                        matches={matches}
                        individualBattles={individualBattles}
                        caseStudies={caseStudies}
                        onStartBattle={handleStartBattle}
                        onCreateBattle={() => { alert('Use the /admin page to create modals or manage them here.'); }}
                        onManageQuestions={async () => { }}
                        onViewReport={async () => { }}
                        onStartIndividualBattle={handleStartIndividualBattle}
                        onEndIndividualBattle={handleEndIndividualBattle}
                        onEditBattle={() => { }}
                        onDeleteMatch={handleDeleteMatch}
                    />
                )}

                {activeTab === 'auction' && (
                    <AuctionTab
                        players={players}
                        auctionStatus={auctionStatus}
                        timeLeft={timeLeft}
                        startingAuctionId={startingAuctionId}
                        onStartAuction={startAuction}
                        onEditPlayer={handleEditPlayer}
                        onAddPlayer={() => { alert('Add player functionality is pending implementation.'); }}
                        onRemovePlayer={handleRemovePlayer}
                    />
                )}

                {activeTab === 'maintenance' && (
                    <MaintenanceTab
                        onClearCache={() => alert('API Cache Purged!')}
                        onResetAuction={handleResetAuction}
                        onTriggerAutomation={() => {
                            fetch('/api/admin/trigger-automation', { method: 'POST' });
                            alert('Automation triggered!');
                        }}
                        onSyncData={fetchHeartbeat}
                    />
                )}
            </div>
        </main>
    );
}
