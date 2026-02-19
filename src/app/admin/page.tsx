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
    BarChart3,
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
    Edit3,
    Edit
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
    const [owners, setOwners] = useState<Owner[]>([]);
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
    const [activeTab, setActiveTab] = useState<'auction' | 'owners' | 'battles' | 'cases' | 'insights' | 'maintenance'>('auction');

    // Battle Wizard State
    const [isCreatingBattle, setIsCreatingBattle] = useState(false);
    const [wizardStep, setWizardStep] = useState(1);
    const [battleMode, setBattleMode] = useState<'INDIVIDUAL' | 'TEAM_VS_TEAM' | 'TEAMS'>('INDIVIDUAL');
    const [battleType, setBattleType] = useState('KAHOOT'); // KAHOOT, CASE_STUDY, TECH_TALK
    const [editingBattleId, setEditingBattleId] = useState<string | null>(null);
    const [wizardConfig, setWizardConfig] = useState({
        title: '',
        description: '',
        question_timer: 10,
        team1_id: '',
        team2_id: '',
        date: '',
        time: '',
        conductor_id: '',
        points_weight: 1.0
    });

    const [conductorSearch, setConductorSearch] = useState('');
    const filteredConductors = players.filter(p => p.name.toLowerCase().includes(conductorSearch.toLowerCase()));

    // Individual Battles State
    const [individualBattles, setIndividualBattles] = useState<any[]>([]);
    const [managingQuestionsBattleId, setManagingQuestionsBattleId] = useState<string | null>(null);
    const [battleQuestions, setBattleQuestions] = useState<any[]>([]);
    const [isAddingQuestion, setIsAddingQuestion] = useState(false);
    const [newQuestion, setNewQuestion] = useState({ question: '', options: ['', '', '', ''], correct_option: 0 });
    const [viewingReportBattleId, setViewingReportBattleId] = useState<string | null>(null);
    const [reportData, setReportData] = useState<{ answers: any[], scores: any[] } | null>(null);

    // Leaderboard State
    const [leaderboard, setLeaderboard] = useState<any[]>([]);

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

    // Judgement Schemes State
    const [judgementSchemes, setJudgementSchemes] = useState<any[]>([]);
    const [isAddingScheme, setIsAddingScheme] = useState(false);
    const [newScheme, setNewScheme] = useState<any>({
        name: '',
        alignment_weight: 0.25,
        feasibility_weight: 0.20,
        value_weight: 0.25,
        effort_weight: 0.15,
        innovation_weight: 0.15,
        relevance_threshold: 0.12,
        is_default: false
    });

    const fetchSchemes = async () => {
        const res = await fetch('/api/admin/schemes');
        if (res.ok) {
            const data = await res.json();
            setJudgementSchemes(data);
        }
    };

    const fetchHeartbeat = async () => {
        try {
            const res = await fetch('/api/admin/heartbeat');
            if (!res.ok) {
                if (res.status === 401) setLoggedInAdmin(null);
                return;
            }
            const data = await res.json();

            setPlayers(data.players);
            setOwners(data.owners);
            setTeams(data.teams);
            setMatches(data.matches);
            setCaseStudies(data.caseStudies);
            setIndividualBattles(data.individualBattles);
            setAuctionStatus(data.auction);

            if (data.auction?.status === 'ACTIVE' && data.auction?.timerEnd) {
                const remaining = Math.max(0, Math.floor((new Date(data.auction.timerEnd).getTime() - Date.now()) / 1000));
                setTimeLeft(remaining);
            } else {
                setTimeLeft(null);
            }

            setLoading(false);
        } catch (e) {
            console.error("Heartbeat failed", e);
        }
    };

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
            fetchHeartbeat();
            fetchSchemes();
        } else {
            setLoading(false);
        }
    }, [loggedInAdmin]);

    // fetchPlayers removed in favor of fetchHeartbeat

    useEffect(() => {
        if (!loggedInAdmin) return;

        // Dynamic polling: 1s during active auction, 10s otherwise
        const intervalTime = (auctionStatus?.status === 'ACTIVE') ? 1000 : 10000;
        const interval = setInterval(fetchHeartbeat, intervalTime);
        return () => clearInterval(interval);
    }, [loggedInAdmin, auctionStatus?.status]);

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
    const resetOwnerPassword = async (ownerId: string) => {
        if (!confirm('Are you sure you want to reset this owner\'s password to default (sipl2026)?')) return;

        try {
            const res = await fetch('/api/auth/admin/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ownerId }),
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
            fetchHeartbeat();
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
            fetchHeartbeat();
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
                fetchHeartbeat();
            }
        } catch (error) {
            alert('Failed to add player');
        }
    };

    const handleRemovePlayer = async (id: string) => {
        if (!confirm('Are you sure you want to remove this player?')) return;
        try {
            const res = await fetch(`/api/admin/players?id=${id}`, { method: 'DELETE' });
            if (res.ok) fetchHeartbeat();
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

    const handleUpdateSchedule = async (id: string, date: string) => {
        try {
            const res = await fetch('/api/admin/schedule', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, date }),
            });
            if (res.ok) {
                fetchHeartbeat();
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
            fetchHeartbeat();
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
            if (res.ok) fetchHeartbeat();
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
            alert('Battle Started! Owners can now submit ideas.');
            setStartingBattleMatch(null);
            setCaseDescription('');
            fetchHeartbeat();
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
                fetchHeartbeat();
            } else {
                alert(`Failed to reset ${type}`);
            }
        }
    };

    const handleCreateBattle = async () => {
        // Validation Logic
        if (!wizardConfig.title || !wizardConfig.description || !battleMode || !battleType) {
            console.warn('Validation failed:', {
                title: wizardConfig.title,
                description: wizardConfig.description,
                mode: battleMode,
                type: battleType
            });
            alert('Please fill in Title, Description, Mode and Type.');
            return;
        }

        if (battleMode === 'TEAM_VS_TEAM' && (!wizardConfig.team1_id || !wizardConfig.team2_id)) {
            alert('Please select both Team 1 and Team 2.');
            return;
        }

        if (battleType === 'TECH_TALK' && !wizardConfig.conductor_id) {
            alert('Please select a Conductor for the Tech Talk.');
            return;
        }

        if ((battleType === 'TECH_TALK' || wizardConfig.date || wizardConfig.time) && (!wizardConfig.date || !wizardConfig.time)) {
            alert('Please select both Date and Time if scheduling.');
            return;
        }

        const res = await fetch('/api/admin/battles', {
            method: editingBattleId ? 'PATCH' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: editingBattleId,
                title: wizardConfig.title,
                description: wizardConfig.description,
                question_timer: wizardConfig.question_timer,
                mode: battleMode,
                team1_id: wizardConfig.team1_id || null,
                team2_id: wizardConfig.team2_id || null,
                battle_type: battleType,
                start_time: (wizardConfig.date && wizardConfig.time) ? `${wizardConfig.date}T${wizardConfig.time}` : null,
                conductor_id: wizardConfig.conductor_id || null,
                points_weight: wizardConfig.points_weight
            }),
        });

        if (res.ok) {
            alert(editingBattleId ? 'Battle updated successfully!' : 'Battle created successfully!');
            setIsCreatingBattle(false);
            setEditingBattleId(null);
            setWizardStep(1);
            setWizardConfig({
                title: '',
                description: '',
                question_timer: 10,
                team1_id: '',
                team2_id: '',
                date: '',
                time: '',
                conductor_id: '',
                points_weight: 1.0
            });
            setBattleMode('INDIVIDUAL');
            setBattleType('KAHOOT');
            fetchHeartbeat();
        } else {
            const data = await res.json();
            alert(data.error || `Failed to ${editingBattleId ? 'update' : 'create'} battle`);
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

            <div className="flex gap-4 mb-8 border-b border-white/10 pb-4 overflow-x-auto custom-scrollbar">
                <button
                    onClick={() => setActiveTab('auction')}
                    className={`px-6 py-2 rounded-lg font-bold transition-all whitespace-nowrap ${activeTab === 'auction' ? 'bg-accent text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                    <Gavel className="inline-block w-4 h-4 mr-2" /> Auction
                </button>
                <button
                    onClick={() => setActiveTab('owners')}
                    className={`px-6 py-2 rounded-lg font-bold transition-all whitespace-nowrap ${activeTab === 'owners' ? 'bg-accent text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                    <Shield className="inline-block w-4 h-4 mr-2" /> Owners
                </button>


                <button
                    onClick={() => setActiveTab('battles')}
                    className={`px-6 py-2 rounded-lg font-bold transition-all whitespace-nowrap ${activeTab === 'battles' ? 'bg-accent text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                    <Zap className="inline-block w-4 h-4 mr-2" /> Battles
                </button>


                <button
                    onClick={() => setActiveTab('cases')}
                    className={`px-6 py-2 rounded-lg font-bold transition-all whitespace-nowrap ${activeTab === 'cases' ? 'bg-accent text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                    <FileText className="inline-block w-4 h-4 mr-2" /> Cases
                </button>
                <button
                    onClick={() => setActiveTab('insights')}
                    className={`px-6 py-2 rounded-lg font-bold transition-all whitespace-nowrap ${activeTab === 'insights' ? 'bg-accent text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                    <BarChart className="inline-block w-4 h-4 mr-2" /> Insights
                </button>
                <button
                    onClick={() => setActiveTab('maintenance')}
                    className={`px-6 py-2 rounded-lg font-bold transition-all whitespace-nowrap ${activeTab === 'maintenance' ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                    <Settings className="inline-block w-4 h-4 mr-2" /> Maintenance
                </button>
            </div>


            {activeTab === 'cases' && (
                <section className="mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-end mb-8">
                        <div>
                            <h2 className="text-2xl font-black flex items-center gap-3">
                                <Award className="text-accent" /> CASE STUDY LIBRARY
                            </h2>
                            <p className="text-gray-400 mt-1">Manage unique problem statements for Match Battles.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="bg-white/5 text-gray-400 border border-white/10 font-bold px-6 py-2 rounded-lg transition-all hover:bg-white/10 flex items-center gap-2 cursor-pointer text-sm">
                                <Upload className="w-4 h-4" /> IMPORT CSV
                                <input
                                    type="file"
                                    accept=".csv"
                                    className="hidden"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const reader = new FileReader();
                                        reader.onload = async (ev) => {
                                            const text = ev.target?.result as string;
                                            const lines = text.split('\n').filter(l => l.trim());
                                            const data = lines.slice(1).map(line => {
                                                const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.trim().replace(/^"|"$/g, ''));
                                                if (parts.length < 2) return null;
                                                return { title: parts[0], description: parts[1] };
                                            }).filter(d => d !== null);

                                            if (data.length > 0) {
                                                const res = await fetch('/api/admin/cases', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify(data)
                                                });
                                                if (res.ok) {
                                                    alert(`${data.length} cases imported successfully!`);
                                                    const updated = await fetch('/api/admin/cases');
                                                    setCaseStudies(await updated.json());
                                                }
                                            }
                                        };
                                        reader.readAsText(file);
                                    }}
                                />
                            </label>
                            <button
                                onClick={() => {
                                    setIsEditingCase(false);
                                    setNewCase({ title: '', description: '' });
                                    setIsAddingCase(true);
                                }}
                                className="bg-accent text-white font-bold px-6 py-2 rounded-lg transition-all hover:scale-105 flex items-center gap-2 text-sm"
                            >
                                <Plus className="w-4 h-4" /> ADD CASE
                            </button>
                        </div>
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
                activeTab === 'owners' && (
                    <section className="mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
                            <Shield className="text-accent" /> OWNER MANAGEMENT
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {owners.map(owner => (
                                <div key={owner.id} className="glass-card p-6 flex flex-col items-center text-center">
                                    <div className="w-16 h-16 rounded-full overflow-hidden mb-4 border-2 border-white/10">
                                        <img
                                            src={`/assets/employee/${owner.name.toLowerCase()}.png`}
                                            alt={owner.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => (e.currentTarget.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + owner.name)}
                                        />
                                    </div>
                                    <h3 className="font-bold mb-1">{owner.name}</h3>
                                    <p className="text-xs text-accent font-black mb-1">{owner.teamName || 'NO TEAM'}</p>
                                    {owner.team_id && (
                                        <div className="mb-4">
                                            <div className="text-[10px] text-gray-500 uppercase font-bold">Wallet Balance</div>
                                            <div className="text-sm font-black text-white">₹{(owner.balance || 0).toLocaleString()}</div>
                                            <button
                                                onClick={() => handleTopup(owner.team_id!)}
                                                className="text-[9px] text-accent hover:underline font-bold mt-1"
                                            >
                                                + Topup Wallet
                                            </button>
                                        </div>
                                    )}
                                    <p className="text-xs text-gray-500 mb-4">{owner.team_id ? 'Assigned' : 'Unassigned'}</p>
                                    <button
                                        onClick={() => resetOwnerPassword(owner.id)}
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



            {activeTab === 'battles' && (
                <section className="mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-end mb-8">
                        <div>
                            <h2 className="text-2xl font-black flex items-center gap-3">
                                <Zap className="text-accent" /> BATTLE MANAGEMENT
                            </h2>
                            <p className="text-gray-400 mt-1">Control center for all Match and Individual battles.</p>
                        </div>
                        <button
                            onClick={() => {
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
                                    points_weight: 1.0
                                });
                                setBattleMode('INDIVIDUAL');
                                setBattleType('KAHOOT');
                                setWizardStep(1);
                                setIsCreatingBattle(true);
                            }}
                            className="bg-accent text-white font-bold px-6 py-2 rounded-lg transition-all hover:scale-105 flex items-center gap-2 text-sm"
                        >
                            <Plus className="w-4 h-4" /> CREATE BATTLE
                        </button>
                    </div>

                    <div className="space-y-4">
                        {/* Unified List: Matches (that are battles) + Individual Battles */}
                        {/* 1. Live/Active Matches */}
                        {matches.filter(m => m.status === 'IN_PROGRESS' || m.status === 'SCHEDULED').map(match => (
                            <div key={match.id} className="glass-card p-6 flex flex-col md:flex-row justify-between items-center gap-6 border-l-4 border-l-blue-500 relative group">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-black bg-blue-500/20 text-blue-500 px-2 rounded uppercase">MATCH BATTLE</span>
                                        <span className="text-[10px] text-gray-500 font-mono">{new Date(match.date).toLocaleString()}</span>
                                    </div>
                                    <h3 className="text-lg font-bold">{match.team1Name} vs {match.team2Name}</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    {match.status === 'SCHEDULED' && (
                                        <div className="flex items-center gap-2">
                                            <select
                                                className="bg-black/60 border border-white/10 rounded-lg p-2 text-[10px] focus:border-accent outline-none text-white max-w-[150px]"
                                                id={`case-${match.id}`}
                                            >
                                                <option value="">Random Case</option>
                                                {caseStudies.map(cs => (
                                                    <option key={cs.id} value={cs.id}>{cs.title}</option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={() => {
                                                    const caseSelect = document.getElementById(`case-${match.id}`) as HTMLSelectElement;
                                                    handleStartBattle(match.id, caseSelect.value ? caseStudies.find(c => c.id === caseSelect.value)?.description : '');
                                                }}
                                                className="bg-green-500/20 text-green-500 border border-green-500/20 px-4 py-2 rounded-lg font-bold text-xs hover:bg-green-500 hover:text-white transition-all"
                                            >
                                                START
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    if (!confirm('Delete this match battle?')) return;
                                                    await fetch('/api/admin/schedule', {
                                                        method: 'DELETE',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ id: match.id })
                                                    });
                                                    fetchHeartbeat();
                                                }}
                                                className="p-2 text-gray-500 hover:text-red-500 transition-all"
                                                title="Delete Match"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                    {match.status === 'IN_PROGRESS' && (
                                        <span className="text-red-500 font-bold animate-pulse text-xs">LIVE NOW</span>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* 2. Individual Battles */}
                        {individualBattles.map(battle => (
                            <div key={battle.id} className={`glass-card p-6 flex flex-col md:flex-row justify-between items-center gap-6 border-l-4 ${battle.status === 'ACTIVE' ? 'border-l-green-500' : 'border-l-gray-500'}`}>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-black bg-purple-500/20 text-purple-500 px-2 rounded uppercase">INDIVIDUAL</span>
                                        <span className="text-[10px] font-black bg-blue-500/20 text-blue-500 px-2 rounded uppercase">{battle.battle_type?.replace('_', ' ') || 'KAHOOT'}</span>
                                        <span className={`text-[10px] font-black px-2 rounded uppercase ${battle.status === 'ACTIVE' ? 'bg-green-500/20 text-green-500' : 'bg-gray-700/50 text-gray-500'}`}>
                                            {battle.status}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-bold">{battle.title}</h3>
                                    <p className="text-sm text-gray-500 line-clamp-1">{battle.description}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={async () => {
                                            setManagingQuestionsBattleId(battle.id);
                                            const res = await fetch(`/api/admin/battles/questions?battleId=${battle.id}`);
                                            const data = await res.json();
                                            setBattleQuestions(data);
                                        }}
                                        className="bg-white/5 text-gray-400 border border-white/10 px-3 py-2 rounded-lg font-bold text-[10px] uppercase hover:bg-white/10 hover:text-white transition-all flex items-center gap-2"
                                    >
                                        <List className="w-3 h-3" /> Questions
                                    </button>
                                    <button
                                        onClick={async () => {
                                            setViewingReportBattleId(battle.id);
                                            const res = await fetch(`/api/admin/battles/${battle.id}/report`);
                                            if (res.ok) {
                                                const data = await res.json();
                                                setReportData(data);
                                            }
                                        }}
                                        className="bg-blue-600/20 text-blue-500 border border-blue-500/20 px-3 py-2 rounded-lg font-bold text-[10px] uppercase hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2"
                                    >
                                        <FileText className="w-3 h-3" /> Report
                                    </button>
                                    {battle.status === 'PENDING' && (
                                        <button
                                            onClick={async () => {
                                                await fetch('/api/admin/battles', {
                                                    method: 'PATCH',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ id: battle.id, status: 'ACTIVE' })
                                                });
                                                fetchHeartbeat();
                                            }}
                                            className="bg-green-600/20 text-green-500 border border-green-500/20 px-4 py-2 rounded-lg font-bold text-[10px] uppercase hover:bg-green-600 hover:text-white transition-all"
                                        >
                                            START
                                        </button>
                                    )}
                                    {battle.status === 'ACTIVE' && (
                                        <button
                                            onClick={async () => {
                                                if (!confirm('End battle and finalize scores?')) return;
                                                await fetch('/api/admin/battles', {
                                                    method: 'PATCH',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ id: battle.id, status: 'COMPLETED' })
                                                });
                                                fetchHeartbeat();
                                            }}
                                            className="bg-red-600/20 text-red-500 border border-red-500/20 px-4 py-2 rounded-lg font-bold text-[10px] uppercase hover:bg-red-600 hover:text-white transition-all"
                                        >
                                            END
                                        </button>
                                    )}
                                    <button
                                        onClick={() => {
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
                                                points_weight: battle.points_weight || 1.0
                                            });
                                            setBattleMode(battle.mode);
                                            setBattleType(battle.type);
                                            setIsCreatingBattle(true);
                                            setWizardStep(2); // Jump to configuration
                                        }}
                                        className="p-2 text-gray-500 hover:text-white transition-all"
                                        title="Edit Battle"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (!confirm('RESET this battle? This will clear all answers and scores. Cannot be undone.')) return;
                                            const res = await fetch(`/api/admin/battles/${battle.id}/reset`, { method: 'POST' });
                                            if (res.ok) {
                                                alert('Battle reset successfully!');
                                                fetchHeartbeat();
                                            } else {
                                                alert('Failed to reset battle');
                                            }
                                        }}
                                        className="p-2 text-gray-500 hover:text-orange-500 transition-all"
                                        title="Reset Battle Data"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (!confirm('Delete this battle?')) return;
                                            await fetch('/api/admin/battles', {
                                                method: 'DELETE',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ id: battle.id })
                                            });
                                            fetchHeartbeat();
                                        }}
                                        className="p-2 text-gray-500 hover:text-red-500"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}



            {activeTab === 'insights' && (
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
                                {/* <button
                                    onClick={async () => {
                                        if (!confirm('Shuffle and reset all teams? This cannot be undone.')) return;
                                        const res = await fetch('/api/auction/reset', { method: 'POST' });
                                        const data = await res.json();
                                        if (data.success) {
                                            fetchHeartbeat();
                                            alert('Auction table and teams reset successfully!');
                                        }
                                    }}
                                    className="bg-red-500 text-white font-bold px-6 py-2 rounded-lg transition-all hover:scale-105"
                                >
                                    RESET TEAMS
                                </button> */}
                                <button
                                    onClick={() => setIsAddingPlayer(true)}
                                    className="bg-accent text-white font-bold px-6 py-2 rounded-lg transition-all hover:scale-105 flex items-center gap-2"
                                >
                                    <Play className="w-4 h-4" /> ADD PLAYER
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {players.filter(p => p.role !== 'OWNER').map(player => {
                                const isLive = auctionStatus?.status === 'ACTIVE' && auctionStatus?.playerId === player.id;
                                const isSold = player.is_auctioned;

                                return (
                                    <div
                                        key={player.id}
                                        className={`glass-card p-6 flex flex-col justify-between relative overflow-hidden ${isLive ? 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)]' : ''}`}
                                    >
                                        {isLive && timeLeft !== null && (
                                            <div className="absolute top-0 right-0 bg-red-600 text-white px-6 py-2 rounded-bl-2xl font-mono font-bold flex items-center gap-3 z-10 animate-pulse">
                                                <Timer className="w-6 h-6" /> <span className="text-2xl">{timeLeft}s</span>
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
                                                <p className="text-gray-400">Min Bid: {(player.min_bid ?? 0).toLocaleString()}</p>
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
                            className="bg-[#0a0a0a] border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col shadow-2xl"
                        >
                            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
                                <h2 className="text-2xl font-black uppercase italic tracking-tighter">{editingBattleId ? 'Edit Battle' : 'Create New Battle'}</h2>
                                <button onClick={() => { setIsCreatingBattle(false); setEditingBattleId(null); setWizardStep(1); }}><X className="w-5 h-5" /></button>
                            </div>

                            <div className="p-8">
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
                                                    {battleType !== 'TECH_TALK' && (
                                                        <div className="grid grid-cols-2 gap-4">
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
                                                            <div className="space-y-1">
                                                                <label className="text-xs text-gray-400 font-bold uppercase">Points Weight</label>
                                                                <div className="flex items-center bg-black/40 border border-white/10 rounded-lg px-4 py-3">
                                                                    <Award className="w-4 h-4 text-accent mr-3" />
                                                                    <input
                                                                        type="number"
                                                                        step="0.1"
                                                                        value={wizardConfig.points_weight}
                                                                        onChange={(e) => setWizardConfig({ ...wizardConfig, points_weight: parseFloat(e.target.value) })}
                                                                        className="bg-transparent border-none outline-none text-white w-full font-mono"
                                                                        placeholder="1.0"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

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
                                                            {filteredConductors.map(p => (
                                                                <div
                                                                    key={p.id}
                                                                    onClick={() => setWizardConfig({ ...wizardConfig, conductor_id: p.id })}
                                                                    className={`flex items-center gap-2 p-2 rounded cursor-pointer ${wizardConfig.conductor_id === p.id ? 'bg-accent text-white' : 'hover:bg-white/5 text-gray-400'}`}
                                                                >
                                                                    <div className="w-6 h-6 rounded-full bg-white/10 overflow-hidden">
                                                                        <img src={`/assets/employee/${p.name.toLowerCase()}.png`} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + p.name)} />
                                                                    </div>
                                                                    <span className="text-xs font-bold">{p.name}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                        </div>      {battleMode === 'TEAM_VS_TEAM' && (
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

                                        <div className="space-y-2">
                                        </div>
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
                                                <span className="text-gray-500">Title</span>
                                                <span className="font-bold text-white">{wizardConfig.title}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Date/Time</span>
                                                <span className="font-bold text-white">
                                                    {wizardConfig.date && wizardConfig.time ? `${wizardConfig.date} ${wizardConfig.time}` : 'Not Scheduled'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

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
                                            if (!reportData) return;
                                            const headers = ['Player', 'Team', 'Question', 'Answer', 'Is Correct', 'Runs', 'Time (s)'];
                                            const rows = reportData.answers.map(a => [
                                                a.player_name,
                                                a.team_name || 'Unassigned',
                                                a.question,
                                                a.answer || '-',
                                                a.is_correct ? 'Yes' : 'No',
                                                a.runs_awarded,
                                                (a.response_time / 1000).toFixed(2)
                                            ]);
                                            const csvContent = "data:text/csv;charset=utf-8,"
                                                + headers.join(",") + "\n"
                                                + rows.map(e => e.join(",")).join("\n");
                                            const encodedUri = encodeURI(csvContent);
                                            const link = document.createElement("a");
                                            link.setAttribute("href", encodedUri);
                                            link.setAttribute("download", `battle_report_${viewingReportBattleId}.csv`);
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                        }}
                                        className="bg-green-600/20 text-green-500 border border-green-500/20 px-4 py-2 rounded-xl text-xs font-black uppercase hover:bg-green-600 hover:text-white transition-all flex items-center gap-2"
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
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    <div className="lg:col-span-1 space-y-6">
                                        <h3 className="text-xl font-bold border-b border-white/10 pb-4">Leaderboard</h3>
                                        <div className="space-y-2">
                                            {reportData.scores.map((s, idx) => (
                                                <div key={idx} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                                                    <div>
                                                        <div className="font-bold">{s.player_name}</div>
                                                        <div className="text-[10px] text-gray-500 uppercase">{s.team_name || 'Freelance'}</div>
                                                    </div>
                                                    <div className="text-xl font-black text-accent">{s.score}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="lg:col-span-2 space-y-6">
                                        <h3 className="text-xl font-bold border-b border-white/10 pb-4">Detailed Answer Log</h3>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="text-[10px] text-gray-500 uppercase font-black tracking-wider border-b border-white/10">
                                                        <th className="p-3">Player</th>
                                                        <th className="p-3">Question</th>
                                                        <th className="p-3">Answer</th>
                                                        <th className="p-3 text-center">Result</th>
                                                        <th className="p-3 text-center">Time</th>
                                                        <th className="p-3 text-right">Runs</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="text-sm font-bold">
                                                    {reportData.answers.map((a, idx) => (
                                                        <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                            <td className="p-3">
                                                                <div>{a.player_name}</div>
                                                                <div className="text-[9px] text-gray-600 uppercase">{a.team_name}</div>
                                                            </td>
                                                            <td className="p-3 max-w-[200px] truncate text-gray-400" title={a.question}>{a.question}</td>
                                                            <td className="p-3 max-w-[200px] truncate font-mono text-white/70" title={a.answer}>{a.answer || '-'}</td>
                                                            <td className="p-3 text-center">
                                                                <span className={`px-2 py-1 rounded text-[10px] uppercase ${a.is_correct ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                                    {a.is_correct ? 'Correct' : 'Wrong'}
                                                                </span>
                                                            </td>
                                                            <td className="p-3 text-center font-mono text-gray-400">{(a.response_time / 1000).toFixed(1)}s</td>
                                                            <td className="p-3 text-right text-accent">+{a.runs_awarded}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </main >
    );
}
