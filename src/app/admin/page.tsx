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
import PlayerModal from '@/components/admin/PlayerModal';

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

    // Player Modal states
    const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
    const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

    // Battle Modal states
    const [isCreatingBattle, setIsCreatingBattle] = useState(false);
    const [editingBattleId, setEditingBattleId] = useState<string | null>(null);
    const [battleMode, setBattleMode] = useState('INDIVIDUAL');
    const [battleType, setBattleType] = useState('KAHOOT');
    const [wizardStep, setWizardStep] = useState(1);
    const [wizardConfig, setWizardConfig] = useState({
        title: '',
        description: '',
        question_timer: 10,
        team1_id: '',
        team2_id: '',
        date: '',
        time: '',
        conductor_id: '',
        points_config: '5, 3, 1',
        is_test: true
    });
    const [conductorSearch, setConductorSearch] = useState('');

    // Question Management
    const [managingQuestionsBattleId, setManagingQuestionsBattleId] = useState<string | null>(null);
    const [battleQuestions, setBattleQuestions] = useState<any[]>([]);
    const [isAddingQuestion, setIsAddingQuestion] = useState(false);
    const [newQuestion, setNewQuestion] = useState({
        question: '',
        options: ['', '', '', ''],
        correct_option: 0
    });

    // Report Viewing
    const [viewingReportBattleId, setViewingReportBattleId] = useState<string | null>(null);
    const [reportData, setReportData] = useState<any>(null);

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

    const handleEditPlayer = (player: Player) => {
        setEditingPlayer(player);
        setIsPlayerModalOpen(true);
    };

    const handleSavePlayer = async (formData: any) => {
        try {
            const isEditing = !!formData.id;
            const endpoint = '/api/admin/players';
            const method = isEditing ? 'PATCH' : 'POST';

            const payload = isEditing
                ? { ...formData, action: 'update_details' }
                : formData;

            const res = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                fetchHeartbeat();
            } else {
                const err = await res.json();
                alert(`Failed to save player: ${err.error || 'Unknown error'}`);
                throw new Error(err.error);
            }
        } catch (error) {
            console.error('Save player error:', error);
            throw error;
        }
    };

    const handleCreateBattle = async () => {
        try {
            const endpoint = editingBattleId ? '/api/admin/battles' : '/api/admin/battles';
            const method = editingBattleId ? 'PUT' : 'POST';

            // Format start_time if date and time are provided
            let start_time = null;
            if (wizardConfig.date && wizardConfig.time) {
                // Assuming local time for input, store as ISO string
                const localDate = new Date(`${wizardConfig.date}T${wizardConfig.time}`);
                start_time = localDate.toISOString();
            }

            const payload = {
                id: editingBattleId,
                mode: battleMode,
                type: battleType,
                title: wizardConfig.title,
                description: wizardConfig.description,
                question_timer: wizardConfig.question_timer,
                team1_id: wizardConfig.team1_id || null,
                team2_id: wizardConfig.team2_id || null,
                start_time,
                schedule_time: start_time,
                conductor_id: wizardConfig.conductor_id || null,
                points_config: wizardConfig.points_config ? wizardConfig.points_config.split(',').map(n => parseInt(n.trim())) : [5, 3, 1],
                is_test: wizardConfig.is_test ? 1 : 0
            };

            const response = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                setIsCreatingBattle(false);
                setEditingBattleId(null);
                fetchHeartbeat();
            } else {
                const err = await response.json();
                alert(`Failed to ${editingBattleId ? 'update' : 'create'} battle: ${err.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Failed to create/update battle', error);
            alert('Failed to save battle');
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

    const handlePublishMatch = async (id: string, published: boolean) => {
        if (!confirm(`Are you sure you want to ${published ? 'publish' : 'unpublish'} this match?`)) return;

        try {
            const res = await fetch('/api/admin/battle/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ matchId: id, published })
            });

            if (res.ok) {
                fetchHeartbeat();
            } else {
                alert('Failed to update publish status');
            }
        } catch (error) {
            console.error('Error publishing match:', error);
            alert('An error occurred');
        }
    };

    const handleResetMatch = async (id: string) => {
        if (!confirm('WARNING: Are you sure you want to reset this match? All questions and answers associated with it will be deleted permanently. This cannot be undone.')) return;

        try {
            const res = await fetch(`/api/admin/battles/${id}/reset`, {
                method: 'POST'
            });

            if (res.ok) {
                alert('Match reset successfully');
                fetchHeartbeat();
            } else {
                alert('Failed to reset match');
            }
        } catch (error) {
            console.error('Error resetting match:', error);
            alert('An error occurred');
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
                        onCreateBattle={() => {
                            setEditingBattleId(null);
                            setWizardConfig({
                                title: '',
                                description: '',
                                question_timer: 10,
                                team1_id: '',
                                team2_id: '',
                                date: '',
                                time: '',
                                conductor_id: '',
                                points_config: '5, 3, 1',
                                is_test: true
                            });
                            setBattleMode('INDIVIDUAL');
                            setBattleType('KAHOOT');
                            setWizardStep(1);
                            setIsCreatingBattle(true);
                        }}
                        onManageQuestions={async (id) => {
                            setManagingQuestionsBattleId(id);
                            const res = await fetch(`/api/admin/battles/questions?battleId=${id}`);
                            const data = await res.json();
                            setBattleQuestions(data);
                        }}
                        onViewReport={async (id) => {
                            setViewingReportBattleId(id);
                            const res = await fetch(`/api/admin/battles/${id}/report`);
                            if (res.ok) {
                                const data = await res.json();
                                setReportData(data);
                            }
                        }}
                        onStartIndividualBattle={handleStartIndividualBattle}
                        onEndIndividualBattle={handleEndIndividualBattle}
                        onEditBattle={(battle) => {
                            setEditingBattleId(battle.id);
                            setWizardConfig({
                                title: battle.title,
                                description: battle.description,
                                question_timer: battle.question_timer,
                                team1_id: battle.team1_id || '',
                                team2_id: battle.team2_id || '',
                                date: battle.start_time ? battle.start_time.split('T')[0] : '',
                                time: battle.start_time ? battle.start_time.split('T')[1]?.substring(0, 5) : '',
                                conductor_id: battle.conductor_id || '',
                                points_config: battle.points_config ? (typeof battle.points_config === 'string' ? JSON.parse(battle.points_config).join(', ') : battle.points_config.join(', ')) : '5, 3, 1',
                                is_test: !!battle.is_test
                            });
                            setBattleMode(battle.mode);
                            setBattleType(battle.type);
                            setIsCreatingBattle(true);
                            setWizardStep(2);
                        }}
                        onDeleteMatch={handleDeleteMatch}
                        onPublishMatch={handlePublishMatch}
                        onResetMatch={handleResetMatch}
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
                        onAddPlayer={() => {
                            setEditingPlayer(null);
                            setIsPlayerModalOpen(true);
                        }}
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

                <PlayerModal
                    isOpen={isPlayerModalOpen}
                    onClose={() => setIsPlayerModalOpen(false)}
                    onSave={handleSavePlayer}
                    player={editingPlayer}
                />
            </div>

            {/* Create Battle Wizard */}
            <AnimatePresence>
                {isCreatingBattle && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="bg-[#0a0a0a] border border-white/10 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
                        >
                            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
                                <h2 className="text-2xl font-black uppercase italic tracking-tighter">{editingBattleId ? 'Edit Battle' : 'Create New Battle'}</h2>
                                <button onClick={() => { setIsCreatingBattle(false); setEditingBattleId(null); setWizardStep(1); }}><X className="w-5 h-5" /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                {/* Step Indicator */}
                                <div className="flex items-center gap-4 mb-8">
                                    {[1, 2, 3].map(step => (
                                        <div key={step} className={`flex-1 h-2 rounded-full transition-all ${step <= wizardStep ? 'bg-accent' : 'bg-white/10'}`} />
                                    ))}
                                </div>

                                {wizardStep === 1 && (
                                    <div className="space-y-6">
                                        <h3 className="text-xl font-bold">Select Battle Mode</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div
                                                className={`p-6 bg-white/5 rounded-xl border-2 cursor-pointer transition-all ${battleMode === 'INDIVIDUAL' ? 'border-accent bg-accent/20' : 'border-transparent hover:bg-white/10'}`}
                                                onClick={() => setBattleMode('INDIVIDUAL')}
                                            >
                                                <User className="w-8 h-8 text-accent mb-3" />
                                                <h3 className="font-bold text-lg">Individual</h3>
                                                <p className="text-sm text-gray-400">Players compete individually for points.</p>
                                            </div>
                                            <div
                                                className={`p-6 bg-white/5 rounded-xl border-2 cursor-pointer transition-all ${battleMode === 'TEAM_VS_TEAM' ? 'border-accent bg-accent/20' : 'border-transparent hover:bg-white/10'}`}
                                                onClick={() => setBattleMode('TEAM_VS_TEAM')}
                                            >
                                                <Users className="w-8 h-8 text-blue-400 mb-3" />
                                                <h3 className="font-bold text-lg">1 vs 1 Team</h3>
                                                <p className="text-sm text-gray-400">Two teams compete against each other.</p>
                                            </div>
                                            <div
                                                className={`p-6 bg-white/5 rounded-xl border-2 cursor-pointer transition-all ${battleMode === 'TEAMS' ? 'border-accent bg-accent/20' : 'border-transparent hover:bg-white/10'}`}
                                                onClick={() => setBattleMode('TEAMS')}
                                            >
                                                <Shield className="w-8 h-8 text-green-400 mb-3" />
                                                <h3 className="font-bold text-lg">All Teams</h3>
                                                <p className="text-sm text-gray-400">All teams compete in a group battle.</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {wizardStep === 2 && (
                                    <div className="space-y-6">
                                        <h3 className="text-xl font-bold">Configuration</h3>
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-xs text-gray-400 font-bold uppercase">Battle Type</label>
                                                    <select
                                                        value={battleType}
                                                        onChange={(e) => setBattleType(e.target.value)}
                                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent"
                                                    >
                                                        <option value="KAHOOT">Kahoot / Quiz</option>
                                                        <option value="CASE_STUDY">Case Study</option>
                                                        <option value="TECH_TALK">Tech Talk</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs text-gray-400 font-bold uppercase">Session Mode</label>
                                                    <div className="flex items-center gap-4 mt-1">
                                                        <button
                                                            onClick={() => setWizardConfig({ ...wizardConfig, is_test: true })}
                                                            className={`flex-1 py-3 px-4 rounded-xl border font-bold text-xs transition-all ${wizardConfig.is_test ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-black/40 border-white/10 text-gray-500'}`}
                                                        >
                                                            TESTING (Draft)
                                                        </button>
                                                        <button
                                                            onClick={() => setWizardConfig({ ...wizardConfig, is_test: false })}
                                                            className={`flex-1 py-3 px-4 rounded-xl border font-bold text-xs transition-all ${!wizardConfig.is_test ? 'bg-green-500/20 border-green-500 text-green-500 font-black' : 'bg-black/40 border-white/10 text-gray-500'}`}
                                                        >
                                                            LIVE (Production)
                                                        </button>
                                                    </div>
                                                </div>
                                                {battleType !== 'TECH_TALK' && (
                                                    <div className="space-y-1">
                                                        <label className="text-xs text-gray-400 font-bold uppercase">Question Timer (sec)</label>
                                                        <div className="flex items-center bg-black/40 border border-white/10 rounded-lg px-4 py-3">
                                                            <Timer className="w-4 h-4 text-gray-500 mr-3" />
                                                            <input
                                                                type="number"
                                                                value={wizardConfig.question_timer}
                                                                onChange={(e) => setWizardConfig({ ...wizardConfig, question_timer: parseInt(e.target.value) })}
                                                                className="bg-transparent border-none outline-none text-white w-full font-mono"
                                                                placeholder="10"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {battleType !== 'TECH_TALK' && (
                                            <div className="space-y-2 p-4 bg-white/5 border border-white/5 rounded-2xl w-full">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-xs text-gray-400 font-bold uppercase flex items-center gap-2">
                                                        <Award className="w-4 h-4 text-accent" /> Team Points Ladder
                                                    </label>
                                                    <span className="text-[10px] text-gray-500 font-mono bg-black/40 px-2 py-0.5 rounded">[1st, 2nd, 3rd, ...]</span>
                                                </div>
                                                <input
                                                    type="text"
                                                    value={wizardConfig.points_config}
                                                    onChange={(e) => setWizardConfig({ ...wizardConfig, points_config: e.target.value })}
                                                    className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent font-mono text-sm tracking-wider"
                                                    placeholder="5, 3, 1"
                                                />
                                                <p className="text-[10px] text-gray-500 italic">Enter points separated by commas. First value is for 1st place, second for 2nd, and so on.</p>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <label className="text-xs text-gray-400 font-bold uppercase">Title</label>
                                            <input
                                                type="text"
                                                value={wizardConfig.title}
                                                onChange={(e) => setWizardConfig({ ...wizardConfig, title: e.target.value })}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent"
                                                placeholder={battleType === 'TECH_TALK' ? "Topic Name..." : "Battle Title..."}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs text-gray-400 font-bold uppercase">Description</label>
                                            <textarea
                                                value={wizardConfig.description}
                                                onChange={(e) => setWizardConfig({ ...wizardConfig, description: e.target.value })}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent h-24 resize-none"
                                                placeholder="Description or instructions..."
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-xs text-gray-400 font-bold uppercase">Date</label>
                                                <input
                                                    type="date"
                                                    value={wizardConfig.date}
                                                    onChange={(e) => setWizardConfig({ ...wizardConfig, date: e.target.value })}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs text-gray-400 font-bold uppercase">Time</label>
                                                <input
                                                    type="time"
                                                    value={wizardConfig.time}
                                                    onChange={(e) => setWizardConfig({ ...wizardConfig, time: e.target.value })}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent"
                                                />
                                            </div>
                                        </div>

                                        {battleType === 'TECH_TALK' && (
                                            <div className="space-y-2">
                                                <label className="text-xs text-gray-400 font-bold uppercase">Conductor (Player)</label>
                                                <div className="bg-black/40 border border-white/10 rounded-xl p-2">
                                                    <div className="flex items-center px-2 mb-2">
                                                        <Search className="w-4 h-4 text-gray-500 mr-2" />
                                                        <input
                                                            type="text"
                                                            placeholder="Search player..."
                                                            value={conductorSearch}
                                                            onChange={(e) => setConductorSearch(e.target.value)}
                                                            className="bg-transparent border-none outline-none text-white text-sm w-full"
                                                        />
                                                    </div>
                                                    <div className="max-h-32 overflow-y-auto custom-scrollbar">
                                                        {players.filter(p => p.role !== 'OWNER' && p.name.toLowerCase().includes(conductorSearch.toLowerCase())).map(p => (
                                                            <div
                                                                key={p.id}
                                                                onClick={() => setWizardConfig({ ...wizardConfig, conductor_id: p.id })}
                                                                className={`flex items-center gap-2 p-2 rounded cursor-pointer ${wizardConfig.conductor_id === p.id ? 'bg-accent text-white' : 'hover:bg-white/5 text-gray-400'}`}
                                                            >
                                                                <div className="w-6 h-6 rounded-full bg-white/10 overflow-hidden">
                                                                    <img src={`/assets/employee/thumb/${p.name.toLowerCase()}.png`} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + p.name)} />
                                                                </div>
                                                                <span className="text-xs font-bold">{p.name}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {battleMode === 'TEAM_VS_TEAM' && (
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold uppercase text-gray-500 tracking-widest">Team 1</label>
                                                    <select
                                                        value={wizardConfig.team1_id}
                                                        onChange={e => setWizardConfig({ ...wizardConfig, team1_id: e.target.value })}
                                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent"
                                                    >
                                                        <option value="">Select Team 1</option>
                                                        {teams.map(team => (
                                                            <option key={team.id} value={team.id}>{team.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold uppercase text-gray-500 tracking-widest">Team 2</label>
                                                    <select
                                                        value={wizardConfig.team2_id}
                                                        onChange={e => setWizardConfig({ ...wizardConfig, team2_id: e.target.value })}
                                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent"
                                                    >
                                                        <option value="">Select Team 2</option>
                                                        {teams.filter(t => t.id !== wizardConfig.team1_id).map(team => (
                                                            <option key={team.id} value={team.id}>{team.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {wizardStep === 3 && (
                                    <div className="space-y-6">
                                        <h3 className="text-xl font-bold">Review & Create</h3>
                                        <div className="bg-white/5 p-6 rounded-2xl space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Mode</span>
                                                <span className="font-bold text-white">{battleMode}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Type</span>
                                                <span className="font-bold text-white">{battleType}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Status</span>
                                                <span className={`font-bold ${wizardConfig.is_test ? 'text-red-500' : 'text-green-500'}`}>{wizardConfig.is_test ? 'TEST MODE' : 'LIVE'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Title</span>
                                                <span className="font-bold text-white">{wizardConfig.title}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Date/Time</span>
                                                <span className="font-bold text-white">
                                                    {wizardConfig.date && wizardConfig.time ? `${wizardConfig.date} ${wizardConfig.time}` : 'Not Scheduled'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">PointsConfig</span>
                                                <span className="font-bold text-accent">[{wizardConfig.points_config}]</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-8 border-t border-white/5 flex justify-between bg-white/5">
                                <button
                                    onClick={() => setWizardStep(Math.max(1, wizardStep - 1))}
                                    className={`px-6 py-3 font-bold text-gray-500 hover:text-white transition-all ${wizardStep === 1 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                                >
                                    Back
                                </button>
                                {wizardStep < 3 ? (
                                    <button
                                        onClick={() => setWizardStep(wizardStep + 1)}
                                        className="bg-white text-black font-black px-8 py-3 rounded-xl hover:scale-105 transition-all"
                                        disabled={wizardStep === 2 && !wizardConfig.title}
                                    >
                                        Next
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleCreateBattle}
                                        className="bg-accent text-white font-black px-8 py-3 rounded-xl hover:scale-105 transition-all shadow-lg shadow-accent/20"
                                    >
                                        {editingBattleId ? 'Update Battle' : 'Create Battle'}
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Question Management Modal */}
            <AnimatePresence>
                {managingQuestionsBattleId && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="bg-[#0a0a0a] border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
                        >
                            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
                                <div>
                                    <h2 className="text-2xl font-black uppercase italic tracking-tighter">Question Management</h2>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Battle: {individualBattles.find(b => b.id === managingQuestionsBattleId)?.title}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 bg-accent/20 text-accent border border-accent/20 px-4 py-2 rounded-xl text-xs font-black uppercase cursor-pointer hover:bg-accent hover:text-white transition-all">
                                        <Upload className="w-4 h-4" /> Import CSV
                                        <input
                                            type="file"
                                            accept=".csv"
                                            className="hidden"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;

                                                const reader = new FileReader();
                                                reader.onload = async (event) => {
                                                    try {
                                                        const text = event.target?.result as string;
                                                        if (!text) {
                                                            alert('File is empty');
                                                            return;
                                                        }

                                                        const lines = text.split(/\r?\n/).filter(l => l.trim());
                                                        if (lines.length < 2) {
                                                            alert('CSV must have a header row and at least one data row');
                                                            return;
                                                        }

                                                        const data = lines.slice(1).map((line, idx) => {
                                                            // Split by comma, respecting quotes
                                                            const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.trim().replace(/^"|"$/g, ''));

                                                            if (parts.length < 6) {
                                                                console.warn(`Skipping line ${idx + 2}: Insufficient columns`, parts);
                                                                return null;
                                                            }

                                                            // Handle 1-indexed correct option from CSV
                                                            let correctIdx = parseInt(parts[5]);
                                                            if (isNaN(correctIdx)) {
                                                                console.warn(`Skipping line ${idx + 2}: Invalid CorrectIndex`, parts[5]);
                                                                return null;
                                                            }
                                                            correctIdx = Math.max(0, correctIdx - 1); // Convert 1-indexed to 0-indexed

                                                            return {
                                                                battle_id: managingQuestionsBattleId,
                                                                question: parts[0],
                                                                options: [parts[1], parts[2], parts[3], parts[4]],
                                                                correct_option: correctIdx
                                                            };
                                                        }).filter(d => d !== null);

                                                        if (data.length === 0) {
                                                            alert('No valid questions found in CSV. Please check the format.');
                                                            return;
                                                        }

                                                        const res = await fetch('/api/admin/battles/questions', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify(data)
                                                        });

                                                        if (res.ok) {
                                                            alert(`Successfully imported ${data.length} questions!`);
                                                            const updated = await fetch(`/api/admin/battles/questions?battleId=${managingQuestionsBattleId}`);
                                                            setBattleQuestions(await updated.json());
                                                        } else {
                                                            const err = await res.json();
                                                            alert(`Import failed: ${err.error || 'Server error'}`);
                                                        }
                                                    } catch (err) {
                                                        console.error('Import error:', err);
                                                        alert('Failed to process CSV file.');
                                                    } finally {
                                                        // Reset input
                                                        e.target.value = '';
                                                    }
                                                };
                                                reader.readAsText(file);
                                            }}
                                        />
                                    </label>
                                    <button
                                        onClick={() => setManagingQuestionsBattleId(null)}
                                        className="p-2 text-gray-500 hover:text-white transition-colors"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-6">
                                {/* Questions List */}
                                <div className="space-y-4">
                                    {battleQuestions.map((q, idx) => (
                                        <div key={idx} className="bg-white/5 border border-white/5 p-6 rounded-2xl group relative">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-6 h-6 rounded-full bg-accent text-black text-[10px] font-black flex items-center justify-center italic">
                                                        {idx + 1}
                                                    </span>
                                                    <h4 className="font-bold text-lg">{q.question}</h4>
                                                </div>
                                                <button
                                                    onClick={async () => {
                                                        if (!confirm('Delete this question?')) return;
                                                        await fetch('/api/admin/battles/questions', {
                                                            method: 'DELETE',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ id: q.id })
                                                        });
                                                        setBattleQuestions(prev => prev.filter(item => item.id !== q.id));
                                                    }}
                                                    className="text-gray-600 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                {q.options.map((opt: string, i: number) => (
                                                    <div key={i} className={`p-3 rounded-xl text-xs font-bold border ${i === q.correct_option ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-black/20 border-white/5 text-gray-400'}`}>
                                                        {opt} {i === q.correct_option && <Check className="w-3 h-3 inline ml-1" />}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}

                                    {battleQuestions.length === 0 && !isAddingQuestion && (
                                        <div className="text-center py-20 opacity-20 capitalize italic text-2xl font-black">
                                            No questions added yet
                                        </div>
                                    )}

                                    {isAddingQuestion && (
                                        <div className="bg-accent/5 border border-accent/20 p-8 rounded-3xl space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Question Content</label>
                                                <input
                                                    type="text"
                                                    value={newQuestion.question}
                                                    onChange={e => setNewQuestion({ ...newQuestion, question: e.target.value })}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 focus:border-accent outline-none text-white font-bold"
                                                    placeholder="Enter your question here..."
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                {newQuestion.options.map((opt, i) => (
                                                    <div key={i} className="space-y-2">
                                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Option {i + 1}</label>
                                                        <div className="relative">
                                                            <input
                                                                type="text"
                                                                value={opt}
                                                                onChange={e => {
                                                                    const newOpts = [...newQuestion.options];
                                                                    newOpts[i] = e.target.value;
                                                                    setNewQuestion({ ...newQuestion, options: newOpts });
                                                                }}
                                                                className={`w-full bg-black/40 border rounded-xl p-4 focus:border-accent outline-none font-bold pr-12 ${newQuestion.correct_option === i ? 'border-green-500/50' : 'border-white/10'}`}
                                                                placeholder={`Option ${i + 1}`}
                                                            />
                                                            <button
                                                                onClick={() => setNewQuestion({ ...newQuestion, correct_option: i })}
                                                                className={`absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center transition-all ${newQuestion.correct_option === i ? 'bg-green-500 text-black' : 'bg-white/5 text-gray-600'}`}
                                                            >
                                                                <Check className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                                                <button
                                                    onClick={() => setIsAddingQuestion(false)}
                                                    className="px-6 py-3 text-gray-500 font-black text-xs uppercase"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        const res = await fetch('/api/admin/battles/questions', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ ...newQuestion, battle_id: managingQuestionsBattleId })
                                                        });
                                                        if (res.ok) {
                                                            setIsAddingQuestion(false);
                                                            setNewQuestion({ question: '', options: ['', '', '', ''], correct_option: 0 });
                                                            const updated = await fetch(`/api/admin/battles/questions?battleId=${managingQuestionsBattleId}`);
                                                            setBattleQuestions(await updated.json());
                                                        }
                                                    }}
                                                    className="bg-accent text-white px-8 py-3 rounded-xl font-black text-xs uppercase shadow-lg shadow-accent/20"
                                                >
                                                    Add Question
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-8 border-t border-white/5 bg-white/5">
                                {!isAddingQuestion && (
                                    <button
                                        onClick={() => setIsAddingQuestion(true)}
                                        className="w-full py-4 border-2 border-dashed border-white/10 rounded-2xl text-gray-500 font-bold uppercase tracking-widest hover:border-accent/40 hover:text-accent transition-all flex items-center justify-center gap-2"
                                    >
                                        <Plus className="w-5 h-5" /> Add Individual Question
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Battle Report Modal */}
            <AnimatePresence>
                {viewingReportBattleId && reportData && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="bg-[#0a0a0a] border border-white/10 rounded-3xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
                        >
                            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
                                <div>
                                    <h2 className="text-2xl font-black uppercase italic tracking-tighter">Battle Report</h2>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                                        Battle: {individualBattles.find(b => b.id === viewingReportBattleId)?.title}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => {
                                            // Handle Export to CSV
                                            const headers = ['Player', 'Team', 'Question', 'Answer', 'Is Correct', 'Runs', 'Time (s)'];
                                            const rows = reportData.answers.map((a: any) => [
                                                a.playerName,
                                                a.teamName,
                                                `"${a.question.replace(/"/g, '""')}"`,
                                                `"${a.answer.replace(/"/g, '""')}"`,
                                                a.is_correct ? 'Yes' : 'No',
                                                a.score,
                                                a.time_taken
                                            ]);
                                            const csvContent = "data:text/csv;charset=utf-8,"
                                                + [headers, ...rows].map(e => e.join(",")).join("\n");
                                            const encodedUri = encodeURI(csvContent);
                                            const link = document.createElement("a");
                                            link.setAttribute("href", encodedUri);
                                            link.setAttribute("download", `battle_report_${viewingReportBattleId}.csv`);
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                        }}
                                        className="bg-accent/20 text-accent border border-accent/20 px-4 py-2 rounded-xl text-xs font-black uppercase hover:bg-accent hover:text-white transition-all flex items-center gap-2"
                                    >
                                        <Upload className="w-4 h-4 rotate-180" /> Export CSV
                                    </button>
                                    <button
                                        onClick={() => {
                                            setViewingReportBattleId(null);
                                            setReportData(null);
                                        }}
                                        className="p-2 text-gray-500 hover:text-white transition-colors"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                    {/* Score Distribution */}
                                    <div className="bg-white/5 border border-white/5 p-6 rounded-2xl flex flex-col max-h-[400px]">
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-6 shrink-0">Top Scores</h3>
                                        <div className="space-y-4 overflow-y-auto custom-scrollbar pr-2 flex-1">
                                            {(reportData.scores || reportData.topScores || []).map((score: any, idx: number) => (
                                                <div key={idx} className="flex items-center justify-between shrink-0">
                                                    <div className="flex items-center gap-3">
                                                        <span className="w-6 h-6 rounded-full bg-accent/20 text-accent text-[10px] font-black flex items-center justify-center">
                                                            {idx + 1}
                                                        </span>
                                                        <div>
                                                            <div className="font-bold text-sm">{score.player_name || score.playerName}</div>
                                                            <div className="text-[10px] text-gray-500 uppercase">{score.team_name || score.teamName}</div>
                                                        </div>
                                                    </div>
                                                    <div className="font-mono text-xl font-black text-accent">{score.score ?? score.total_score}</div>
                                                </div>
                                            ))}
                                            {(!reportData.scores && !reportData.topScores || (reportData.scores || reportData.topScores).length === 0) && (
                                                <div className="text-gray-500 text-sm italic">No scores yet.</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Stats Summary */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white/5 border border-white/5 p-6 rounded-2xl flex flex-col justify-center items-center text-center">
                                            <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-2">Total Answers</div>
                                            <div className="text-4xl font-black text-white">{reportData.answers?.length || 0}</div>
                                        </div>
                                        <div className="bg-white/5 border border-white/5 p-6 rounded-2xl flex flex-col justify-center items-center text-center">
                                            <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-2">Avg Time</div>
                                            <div className="text-4xl font-black text-blue-500">
                                                {reportData.answers && reportData.answers.length > 0
                                                    ? (reportData.answers.reduce((acc: number, cur: any) => acc + (cur.response_time || cur.time_taken || 0), 0) / reportData.answers.length).toFixed(1)
                                                    : '0'}s
                                            </div>
                                        </div>
                                        <div className="bg-white/5 border border-white/5 p-6 rounded-2xl flex flex-col justify-center items-center text-center col-span-2">
                                            <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-2">Accuracy Rate</div>
                                            <div className="text-5xl font-black text-green-500">
                                                {reportData.answers.length > 0
                                                    ? Math.round((reportData.answers.filter((a: any) => a.is_correct).length / reportData.answers.length) * 100)
                                                    : 0}%
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Detailed Answers Table */}
                                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4">Detailed Answers</h3>
                                <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-white/10 bg-black/40">
                                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Player</th>
                                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Question & Answer</th>
                                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Result</th>
                                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Runs</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reportData.answers.map((ans: any, idx: number) => (
                                                <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                    <td className="p-4">
                                                        <div className="font-bold text-sm">{ans.player_name || ans.playerName}</div>
                                                        <div className="text-[10px] text-gray-500">{ans.team_name || ans.teamName}</div>
                                                    </td>
                                                    <td className="p-4 text-sm text-gray-300 max-w-sm">
                                                        <div className="line-clamp-2 truncate mxl" title={ans.question}>{ans.question}</div>
                                                        <div className="text-[10px] text-gray-500 mt-1 italic">Answer: {ans.answer}</div>
                                                    </td>
                                                    <td className="p-4">
                                                        {ans.is_correct ? (
                                                            <span className="inline-flex items-center gap-1 bg-green-500/10 text-green-500 px-2 py-1 rounded text-[10px] font-bold">
                                                                <Check className="w-3 h-3" /> Correct
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-500 px-2 py-1 rounded text-[10px] font-bold">
                                                                <X className="w-3 h-3" /> Incorrect
                                                            </span>
                                                        )}
                                                        <div className="text-[10px] text-gray-500 mt-1">{ans.response_time ?? ans.time_taken}s</div>
                                                    </td>
                                                    <td className="p-4 text-right font-mono font-bold text-accent">
                                                        +{ans.runs_awarded ?? ans.score}
                                                    </td>
                                                </tr>
                                            ))}
                                            {reportData.answers.length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="p-8 text-center text-gray-500 text-sm italic">
                                                        No answers recorded for this battle.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
    );
}
