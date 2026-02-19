'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, User, ArrowRight, RefreshCw, CheckCircle, Shield, List, Home } from 'lucide-react';
import Link from 'next/link';

interface Owner {
    id: string;
    name: string;
    team_id: string | null;
}

export default function OwnerPage() {
    const [owners, setOwners] = useState<Owner[]>([]);
    const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null);
    const [assignedTeam, setAssignedTeam] = useState<{ id: string, name: string } | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loggedInOwner, setLoggedInOwner] = useState<Owner | null>(null);
    const [teamBalance, setTeamBalance] = useState<number | null>(null);
    const [password, setPassword] = useState('');
    const [showResetModal, setShowResetModal] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loadingTeamData, setLoadingTeamData] = useState(false);
    const [activeMatch, setActiveMatch] = useState<any>(null); // Kept for "Live Battle" badge indicator if needed, or remove if unused.

    // Effect to check for active match to show badge (optional, but good UX)
    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await fetch('/api/battle/status');
                const data = await res.json();
                setActiveMatch(data.match);
            } catch (e) {
                console.error(e);
            }
        };
        fetchStatus();
    }, []);

    useEffect(() => {
        const checkSession = async () => {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                setLoggedInOwner(data.user);
                localStorage.setItem('sipl_owner', JSON.stringify(data.user));
                if (data.user.team_id) {
                    fetchTeamData(data.user.team_id);
                }
                if (data.user.password_reset_required) {
                    setShowResetModal(true);
                }
                return;
            }
            // Session invalid
            localStorage.removeItem('sipl_owner');
            setLoggedInOwner(null);
            setAssignedTeam(null);
        };
        checkSession();
        fetchOwners();
    }, []);

    const fetchOwners = async () => {
        const res = await fetch('/api/owners');
        const data = await res.json();
        setOwners(data);
        setLoading(false);
    };

    const fetchTeamData = async (teamId: string) => {
        setLoadingTeamData(true);
        try {
            const res = await fetch(`/api/teams/${teamId}`);
            const data = await res.json();
            if (data && !data.error) {
                setAssignedTeam(data);
                setTeamBalance(data.balance);
            }
        } finally {
            setLoadingTeamData(false);
        }
    };

    const handleLogin = async (owner: Owner) => {
        if (!password) {
            alert('Please enter your password');
            return;
        }

        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: owner.id, password, type: 'owner' }),
        });
        const data = await res.json();

        if (data.success) {
            localStorage.setItem('sipl_owner', JSON.stringify(data.user));
            setLoggedInOwner(data.user);
            if (data.user.team_id) {
                fetchTeamData(data.user.team_id);
            }
            if (data.user.password_reset_required) {
                setShowResetModal(true);
            }
            setPassword('');
        } else {
            alert(data.error || 'Invalid password');
        }
    };

    const handlePasswordUpdate = async () => {
        if (!newPassword || newPassword !== confirmPassword) {
            alert('Passwords do not match or are empty');
            return;
        }

        const res = await fetch('/api/auth/update-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: loggedInOwner?.id, newPassword }),
        });
        const data = await res.json();

        if (data.success) {
            alert('Password updated successfully!');
            const updated = { ...loggedInOwner!, password_reset_required: 0 };
            localStorage.setItem('sipl_owner', JSON.stringify(updated));
            setLoggedInOwner(updated);
            setShowResetModal(false);
            setNewPassword('');
            setConfirmPassword('');
        } else {
            alert(data.error);
        }
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        localStorage.removeItem('sipl_owner');
        setLoggedInOwner(null);
        setAssignedTeam(null);
        setSelectedOwner(null);
        setPassword('');
    };

    const handleDrawTeam = async () => {
        const target = loggedInOwner || selectedOwner;
        if (!target) return;

        setIsDrawing(true);
        // Simulate animation delay
        await new Promise(r => setTimeout(r, 2000));

        try {
            const res = await fetch('/api/owners/assign-team', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ownerId: target.id }),
            });
            const data = await res.json();
            setIsDrawing(false);

            if (data.success) {
                const updatedOwner: Owner = { ...target, team_id: data.team.id };
                localStorage.setItem('sipl_owner', JSON.stringify(updatedOwner));
                setLoggedInOwner(updatedOwner);
                fetchTeamData(data.team.id);
            } else {
                alert(data.error);
            }
        } catch (error) {
            console.error("Failed to draw team:", error);
            setIsDrawing(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <RefreshCw className="w-8 h-8 animate-spin text-accent" />
        </div>
    );

    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-6 gap-8">
            <header className="w-full flex justify-between items-center max-w-5xl">
                <div className="text-left">
                    <h1 className="text-6xl font-black text-glow mb-2 uppercase tracking-tighter">Owner HQ</h1>
                    <p className="text-gray-400 max-w-md">Identify yourself to access your team's command center.</p>
                </div>
                <Link
                    href="/"
                    className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-6 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white transition-all font-bold"
                >
                    <Home className="w-5 h-5" /> Home
                </Link>
            </header>

            <AnimatePresence mode="wait">
                {loggedInOwner ? (
                    <motion.div
                        key="dashboard"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="w-full max-w-5xl"
                    >
                        {loadingTeamData ? (
                            <div className="glass-card p-12 text-center animate-pulse border-accent/20">
                                <RefreshCw className="w-12 h-12 animate-spin text-accent mx-auto mb-6 opacity-20" />
                                <h3 className="text-2xl font-black mb-2 uppercase tracking-tighter">Initializing HQ</h3>
                                <p className="text-gray-500">Synchronizing team data and assets...</p>
                            </div>
                        ) : assignedTeam ? (
                            <div className="glass-card p-12 text-center border-accent bg-gradient-to-b from-accent/10 to-transparent">
                                <div className="flex justify-between items-start mb-8 text-left">
                                    <div className="flex items-center gap-6">
                                        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-accent/20">
                                            <img
                                                src={`/assets/employee/${loggedInOwner.name.toLowerCase()}.png`}
                                                alt={loggedInOwner.name}
                                                className="w-full h-full object-cover"
                                                onError={(e) => (e.currentTarget.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + loggedInOwner.name)}
                                            />
                                        </div>
                                        <div>
                                            <h2 className="text-3xl font-black text-white">{loggedInOwner.name}</h2>
                                            <p className="text-accent uppercase tracking-widest text-sm font-bold">Authenticated Owner</p>
                                        </div>
                                    </div>
                                    <button onClick={handleLogout} className="text-gray-500 hover:text-white transition-colors">Logout</button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <section className="bg-black/40 p-8 rounded-2xl border border-white/5 text-left">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-16 h-16 rounded-xl bg-white/5 p-2 border border-white/10">
                                                <img
                                                    src={`/assets/teamlogos/${assignedTeam.name.toLowerCase().replace(' ', '_')}.png`}
                                                    alt={assignedTeam.name}
                                                    className="w-full h-full object-contain"
                                                />
                                            </div>
                                            <div>
                                                <p className="text-gray-500 text-xs uppercase tracking-widest leading-none mb-1">Assigned Team</p>
                                                <h3 className="text-2xl font-black text-white">{assignedTeam.name}</h3>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl">
                                                <span className="text-gray-400">Wallet Balance</span>
                                                <span className="text-2xl font-black text-accent flex items-center gap-1">
                                                    <Trophy className="w-5 h-5" /> {teamBalance?.toLocaleString()}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => window.location.href = '/auction'}
                                                className="btn-primary w-full py-4 flex items-center justify-center gap-2"
                                            >
                                                <Trophy className="w-5 h-5" /> Enter Auction Arena
                                            </button>
                                            <button
                                                onClick={() => window.location.href = '/owner/manage'}
                                                className="btn-primary w-full py-4 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-800"
                                            >
                                                <User className="w-5 h-5" /> Manage Team
                                            </button>
                                            <button
                                                onClick={() => window.location.href = '/league'}
                                                className="w-full bg-white/5 hover:bg-white/10 py-3 rounded-lg border border-white/10 transition-all text-sm font-bold"
                                            >
                                                View League Schedule
                                            </button>
                                        </div>
                                    </section>

                                    <section className="flex flex-col gap-4">

                                        <button
                                            onClick={() => window.location.href = '/owner/live-battle'}
                                            className={`flex-1 bg-gradient-to-br from-red-900/40 to-black border border-red-500/30 hover:border-red-500 p-8 rounded-2xl flex flex-col items-center justify-center gap-4 group transition-all ${activeMatch ? 'animate-pulse ring-2 ring-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.3)]' : ''}`}
                                        >
                                            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center group-hover:scale-110 transition-transform relative">
                                                <Shield className="w-8 h-8 text-red-500" />
                                                {activeMatch && (
                                                    <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-bounce">
                                                        LIVE
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-center">
                                                <h3 className="text-2xl font-black text-white mb-1">LIVE BATTLE</h3>
                                                <p className="text-gray-400 text-sm">Submit ideas and lead your team</p>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => window.location.href = '/owner/history'}
                                            className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 p-8 rounded-2xl flex items-center justify-between group transition-all"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                                                    <List className="w-6 h-6 text-gray-400" />
                                                </div>
                                                <div className="text-left">
                                                    <h3 className="text-xl font-bold text-white">Submission History</h3>
                                                    <p className="text-gray-500 text-xs">View past ideas and scores</p>
                                                </div>
                                            </div>
                                            <ArrowRight className="w-6 h-6 text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                                        </button>
                                    </section>
                                </div>
                            </div>
                        ) : (loggedInOwner && loggedInOwner.team_id) ? (
                            <div className="glass-card p-12 text-center border-red-500/20">
                                <Shield className="w-16 h-16 text-red-500 mx-auto mb-6 opacity-20" />
                                <h3 className="text-2xl font-black mb-2 uppercase tracking-tighter text-red-500">Synchronization Error</h3>
                                <p className="text-gray-400 mb-8 max-w-md mx-auto">
                                    We found your assigned team but couldn't retrieve the latest data. Please refresh or contact the Admin.
                                </p>
                                <button
                                    onClick={() => loggedInOwner && fetchTeamData(loggedInOwner.team_id!)}
                                    className="btn-primary px-8 py-3 flex items-center justify-center gap-2 mx-auto"
                                >
                                    <RefreshCw className="w-4 h-4" /> Retry Connection
                                </button>
                                <button onClick={handleLogout} className="mt-4 text-xs text-gray-500 hover:text-white underline">Logout</button>
                            </div>
                        ) : (
                            <div className="glass-card p-12 text-center border-dashed border-accent/20">
                                <div className="flex justify-between items-start mb-8 text-left">
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/10">
                                            <img
                                                src={`/assets/employee/${loggedInOwner.name.toLowerCase()}.png`}
                                                alt={loggedInOwner.name}
                                                className="w-full h-full object-cover"
                                                onError={(e) => (e.currentTarget.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + loggedInOwner.name)}
                                            />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black text-white">{loggedInOwner.name}</h2>
                                            <p className="text-gray-500 text-xs uppercase tracking-widest font-bold">Awaiting Team Assignment</p>
                                        </div>
                                    </div>
                                    <button onClick={handleLogout} className="text-gray-500 hover:text-white transition-colors">Logout</button>
                                </div>
                                <Trophy className="w-16 h-16 text-accent mx-auto mb-6 opacity-20" />
                                <h3 className="text-3xl font-black mb-4 uppercase tracking-tighter">Enter the Destiny Draw</h3>
                                <p className="text-gray-400 mb-8 max-w-md mx-auto">
                                    You have not been assigned a team for SIPL 2026. Draw your team now to access the HQ modules.
                                </p>
                                <button
                                    onClick={handleDrawTeam}
                                    disabled={isDrawing}
                                    className="btn-primary px-12 py-4 text-xl flex items-center justify-center gap-3 mx-auto"
                                >
                                    {isDrawing ? <RefreshCw className="animate-spin" /> : <Trophy />} {isDrawing ? 'Assigning...' : 'DRAW TEAM'}
                                </button>
                            </div>
                        )
                        }
                    </motion.div >
                ) : (
                    <motion.div
                        key="login"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl w-full"
                    >
                        <section className="glass-card p-8">
                            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                                <User className="text-accent" /> Identify Owner
                            </h2>
                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {owners.map(owner => (
                                    <button
                                        key={owner.id}
                                        onClick={() => setSelectedOwner(owner)}
                                        className={`w-full p-4 rounded-xl text-left transition-all flex items-center justify-between ${selectedOwner?.id === owner.id
                                            ? 'bg-accent/20 border-accent border'
                                            : 'bg-white/5 border border-transparent hover:border-white/20'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-accent/20">
                                                <img
                                                    src={`/assets/employee/${owner.name.toLowerCase()}.png`}
                                                    alt={owner.name}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => (e.currentTarget.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + owner.name)}
                                                />
                                            </div>
                                            <span className="font-medium text-lg">{owner.name}</span>
                                        </div>
                                        {selectedOwner?.id === owner.id && <ArrowRight className="w-5 h-5" />}
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section className="glass-card p-8 flex flex-col items-center justify-center text-center">
                            <h2 className="text-2xl font-bold mb-4">Login Securely</h2>
                            {!selectedOwner ? (
                                <p className="text-gray-500">Please select your identity to continue</p>
                            ) : (
                                <div className="space-y-6 w-full">
                                    <p className="text-gray-400">Welcome, {selectedOwner.name}. Ready to access the HQ?</p>
                                    <form onSubmit={(e) => { e.preventDefault(); handleLogin(selectedOwner); }} className="space-y-4">
                                        <div className="space-y-2 text-left">
                                            <label className="text-xs text-gray-500 uppercase font-black px-1">Access Token (Password)</label>
                                            <input
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="Enter your password"
                                                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 focus:border-accent outline-none text-white transition-all"
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            className="btn-primary w-full py-4 text-xl flex items-center justify-center gap-3 transition-transform active:scale-95"
                                        >
                                            <Shield className="w-6 h-6" /> Authenticate
                                        </button>
                                    </form>
                                </div>
                            )}
                        </section>
                    </motion.div>
                )
                }
            </AnimatePresence >

            {/* Password Reset Modal */}
            {
                showResetModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 z-50">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="glass-card p-12 max-w-md w-full border-accent hover:border-accent transition-none"
                        >
                            <h2 className="text-3xl font-black mb-2 text-glow">UPDATE PASSWORD</h2>
                            <p className="text-gray-400 mb-8">For security reasons, you must change your default Access Token on first login.</p>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs text-gray-500 uppercase font-black">New Password</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-4 focus:border-accent outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-gray-500 uppercase font-black">Confirm Password</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-4 focus:border-accent outline-none"
                                    />
                                </div>
                                <button
                                    onClick={handlePasswordUpdate}
                                    className="w-full btn-primary py-4 font-black mt-4"
                                >
                                    UPDATE & CONTINUE
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )
            }
        </main >
    );
}
