'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, User, ArrowRight, RefreshCw, CheckCircle, Shield, List } from 'lucide-react';

interface Captain {
    id: string;
    name: string;
    team_id: string | null;
}

export default function CaptainPage() {
    const [captains, setCaptains] = useState<Captain[]>([]);
    const [selectedCaptain, setSelectedCaptain] = useState<Captain | null>(null);
    const [assignedTeam, setAssignedTeam] = useState<{ id: string, name: string } | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loggedInCaptain, setLoggedInCaptain] = useState<Captain | null>(null);
    const [teamBalance, setTeamBalance] = useState<number | null>(null);
    const [password, setPassword] = useState('');
    const [showResetModal, setShowResetModal] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loadingTeamData, setLoadingTeamData] = useState(false);

    // Battle State
    const [activeMatch, setActiveMatch] = useState<any>(null);
    const [ideas, setIdeas] = useState<any[]>([]);
    const [ideaInput, setIdeaInput] = useState('');
    const [lastResult, setLastResult] = useState<any>(null);
    const [pendingIdeas, setPendingIdeas] = useState<any[]>([]);

    // History State
    const [historyIdeas, setHistoryIdeas] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [timeLeft, setTimeLeft] = useState<string>('');

    // Timer Effect
    useEffect(() => {
        if (!activeMatch?.start_time || !activeMatch?.end_time) {
            setTimeLeft('');
            return;
        }

        const tick = () => {
            const now = new Date();
            const start = new Date(activeMatch.start_time);
            const end = new Date(activeMatch.end_time);

            // Time remaining for the countdown
            const diffRemaining = end.getTime() - now.getTime();

            // Time elapsed for the overs calculation
            const elapsedMs = now.getTime() - start.getTime();
            const elapsedSecs = Math.max(0, Math.floor(elapsedMs / 1000));
            const totalBalls = Math.floor(elapsedSecs / 10);
            const overs = Math.floor(totalBalls / 6);
            const balls = totalBalls % 6;

            const cricketTime = `${Math.min(20, overs)}.${balls} ov`;

            if (diffRemaining <= 0) {
                setTimeLeft('20.0 ov');
                return;
            }

            const mins = Math.floor(diffRemaining / 60000);
            const secs = Math.floor((diffRemaining % 60000) / 1000);
            const mmss = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

            setTimeLeft(`${cricketTime} (${mmss} left)`);
        };

        tick();
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, [activeMatch?.start_time, activeMatch?.end_time]);

    useEffect(() => {
        const fetchStatus = async () => {
            if (!loggedInCaptain) return;
            try {
                const res = await fetch('/api/battle/status');
                const data = await res.json();
                if (data.match) {
                    setActiveMatch(data.match);
                    setIdeas(data.ideas);
                } else {
                    setActiveMatch(null);
                }
            } catch (e) {
                console.error('Status fetch error:', e);
            }
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, [loggedInCaptain]);

    useEffect(() => {
        const storedCaptain = localStorage.getItem('sipl_captain');
        if (storedCaptain) {
            const captainData = JSON.parse(storedCaptain);
            setLoggedInCaptain(captainData);
            if (captainData.team_id) {
                fetchTeamData(captainData.team_id);
            }
            if (captainData.password_reset_required) {
                setShowResetModal(true);
            }
        }
        fetchCaptains();
    }, []);

    const fetchCaptains = async () => {
        const res = await fetch('/api/captains');
        const data = await res.json();
        setCaptains(data);
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

    const fetchHistory = async () => {
        if (!loggedInCaptain?.team_id) return;
        setLoadingHistory(true);
        try {
            const res = await fetch(`/api/captain/ideas?teamId=${loggedInCaptain.team_id}`);
            const data = await res.json();
            setHistoryIdeas(data);
        } catch (e) {
            console.error('History fetch error:', e);
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        if (loggedInCaptain?.team_id) {
            fetchHistory();
        }
    }, [loggedInCaptain, activeMatch]); // Refresh history when match status changes

    const handlePostIdea = async () => {
        if (!ideaInput.trim() || !activeMatch || !loggedInCaptain) return;

        const currentIdea = ideaInput;
        const tempId = crypto.randomUUID();

        // Instant Feedback: Add to pending and clear input
        setPendingIdeas(prev => [{
            id: tempId,
            content: currentIdea,
            isPending: true,
            created_at: new Date().toISOString()
        }, ...prev]);
        setIdeaInput('');

        try {
            const res = await fetch('/api/battle/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    matchId: activeMatch.id,
                    teamId: loggedInCaptain.team_id,
                    captainId: loggedInCaptain.id,
                    content: currentIdea
                }),
            });
            const data = await res.json();
            if (data.success) {
                setLastResult(data);
                // Remove from pending as it will be caught by status polling shortly
                setTimeout(() => {
                    setPendingIdeas(prev => prev.filter(i => i.id !== tempId));
                }, 2000);
            } else {
                alert(data.error || 'Submission failed');
                setPendingIdeas(prev => prev.filter(i => i.id !== tempId));
            }
        } catch (error) {
            alert('Error submitting idea');
            setPendingIdeas(prev => prev.filter(i => i.id !== tempId));
        }
    };

    const handleLogin = async (captain: Captain) => {
        if (!password) {
            alert('Please enter your password');
            return;
        }

        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: captain.id, password, type: 'captain' }),
        });
        const data = await res.json();

        if (data.success) {
            localStorage.setItem('sipl_captain', JSON.stringify(data.user));
            setLoggedInCaptain(data.user);
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
            body: JSON.stringify({ id: loggedInCaptain?.id, newPassword }),
        });
        const data = await res.json();

        if (data.success) {
            alert('Password updated successfully!');
            const updated = { ...loggedInCaptain!, password_reset_required: 0 };
            localStorage.setItem('sipl_captain', JSON.stringify(updated));
            setLoggedInCaptain(updated);
            setShowResetModal(false);
            setNewPassword('');
            setConfirmPassword('');
        } else {
            alert(data.error);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('sipl_captain');
        setLoggedInCaptain(null);
        setAssignedTeam(null);
        setSelectedCaptain(null);
        setPassword('');
    };

    const handleDrawTeam = async () => {
        const target = loggedInCaptain || selectedCaptain;
        if (!target) return;

        setIsDrawing(true);
        // Simulate animation delay
        await new Promise(r => setTimeout(r, 2000));

        try {
            const res = await fetch('/api/captains/assign-team', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ captainId: target.id }),
            });
            const data = await res.json();
            setIsDrawing(false);

            if (data.success) {
                const updatedCaptain: Captain = { ...target, team_id: data.team.id };
                localStorage.setItem('sipl_captain', JSON.stringify(updatedCaptain));
                setLoggedInCaptain(updatedCaptain);
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
            <header className="text-center">
                <h1 className="text-6xl font-black text-glow mb-2 uppercase tracking-tighter">Captain HQ</h1>
                <p className="text-gray-400 max-w-md">Identify yourself to access your team's command center.</p>
            </header>

            <AnimatePresence mode="wait">
                {loggedInCaptain ? (
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
                                                src={`/assets/employee/${loggedInCaptain.name.toLowerCase()}.png`}
                                                alt={loggedInCaptain.name}
                                                className="w-full h-full object-cover"
                                                onError={(e) => (e.currentTarget.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + loggedInCaptain.name)}
                                            />
                                        </div>
                                        <div>
                                            <h2 className="text-3xl font-black text-white">{loggedInCaptain.name}</h2>
                                            <p className="text-accent uppercase tracking-widest text-sm font-bold">Authenticated Captain</p>
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
                                                onClick={() => window.location.href = '/league'}
                                                className="w-full bg-white/5 hover:bg-white/10 py-3 rounded-lg border border-white/10 transition-all text-sm font-bold"
                                            >
                                                View League Schedule
                                            </button>
                                        </div>
                                    </section>

                                    <section className="col-span-1 md:col-span-2">
                                        {activeMatch ? (
                                            <div className="glass-card p-8 border-red-500/30 bg-red-500/5 relative overflow-hidden">
                                                <div className="absolute top-0 right-0 p-4">
                                                    <div className="flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full text-[10px] font-black animate-pulse">
                                                        <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                                                        LIVE BATTLE
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                                    <div className="lg:col-span-2 space-y-6">
                                                        <div>
                                                            <h4 className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Case Study</h4>
                                                            <div className="bg-black/60 border border-white/10 rounded-xl p-6 text-white text-sm leading-relaxed min-h-[120px]">
                                                                {activeMatch.case_description}
                                                            </div>
                                                        </div>

                                                        {((activeMatch.team1_id === loggedInCaptain.team_id && activeMatch.wickets1 < 10) ||
                                                            (activeMatch.team2_id === loggedInCaptain.team_id && activeMatch.wickets2 < 10)) && (
                                                                <div className="space-y-3">
                                                                    <h4 className="text-[10px] text-gray-500 uppercase font-black tracking-widest px-1">Innovation Submission</h4>
                                                                    <div className="relative">
                                                                        <textarea
                                                                            value={ideaInput}
                                                                            onChange={(e) => setIdeaInput(e.target.value)}
                                                                            placeholder="Describe your innovative solution here..."
                                                                            className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 pr-24 focus:border-red-500 outline-none text-white text-sm min-h-[100px] transition-all"
                                                                        />
                                                                        <button
                                                                            onClick={handlePostIdea}
                                                                            disabled={!ideaInput.trim()}
                                                                            className="absolute bottom-4 right-4 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-6 py-2 rounded-xl text-xs font-black uppercase transition-all shadow-lg"
                                                                        >
                                                                            POST IDEA
                                                                        </button>
                                                                    </div>
                                                                    {lastResult && (
                                                                        <motion.div
                                                                            initial={{ opacity: 0, y: 10 }}
                                                                            animate={{ opacity: 1, y: 0 }}
                                                                            className={`p-4 rounded-xl border flex items-center justify-between ${lastResult.wicket ? 'bg-red-500/10 border-red-500/20' : 'bg-green-500/10 border-green-500/20'
                                                                                }`}
                                                                        >
                                                                            <div className="flex items-center gap-3">
                                                                                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${lastResult.wicket ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                                                                                    }`}>
                                                                                    {lastResult.wicket ? 'W' : lastResult.runs}
                                                                                </span>
                                                                                <div>
                                                                                    <p className="text-xs font-bold text-white">
                                                                                        {lastResult.wicket ? 'OUT!' : `${lastResult.runs} RUNS!`}
                                                                                    </p>
                                                                                    <p className="text-[10px] text-gray-500 mt-0.5">
                                                                                        {lastResult.message || `Score: ${Number(lastResult.score).toFixed(2)}%`}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                            {!lastResult.wicket && lastResult.breakdown && (
                                                                                <div className="flex flex-wrap gap-1 max-w-[200px] justify-end">
                                                                                    {Object.entries(lastResult.breakdown).map(([k, v]: [string, any]) => (
                                                                                        <div key={k} className="text-[8px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-gray-400">
                                                                                            <span className="uppercase opacity-50 mr-1">{k.slice(0, 3)}:</span>
                                                                                            <span className="font-bold text-accent">{Number(v).toFixed(2)}</span>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </motion.div>
                                                                    )}
                                                                </div>
                                                            )}
                                                    </div>

                                                    <div className="space-y-6">
                                                        <div className="bg-black/80 rounded-2xl border border-white/10 p-6">
                                                            <div className="flex justify-between items-center mb-6">
                                                                <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Scoreboard</span>
                                                                <div className="flex items-center gap-2 text-red-500 font-mono text-xs">
                                                                    {timeLeft && <span className="mr-2 text-white bg-red-500/20 px-2 py-0.5 rounded animate-pulse">{timeLeft}</span>}
                                                                    <RefreshCw className="w-3 h-3 animate-spin" /> LIVE
                                                                </div>
                                                            </div>

                                                            <div className="space-y-4">
                                                                <div className="flex justify-between items-end">
                                                                    <div>
                                                                        <p className="text-[10px] text-gray-500 uppercase mb-1">{activeMatch.team1Name}</p>
                                                                        <p className="text-2xl font-black text-white">{activeMatch.score1}/{activeMatch.wickets1}</p>
                                                                    </div>
                                                                    <p className="text-xs text-gray-600 font-mono mb-1">{Number(activeMatch.overs1).toFixed(1)} ov</p>
                                                                </div>
                                                                <div className="w-full h-px bg-white/5"></div>
                                                                <div className="flex justify-between items-end">
                                                                    <div>
                                                                        <p className="text-[10px] text-gray-500 uppercase mb-1">{activeMatch.team2Name}</p>
                                                                        <p className="text-2xl font-black text-white">{activeMatch.score2}/{activeMatch.wickets2}</p>
                                                                    </div>
                                                                    <p className="text-xs text-gray-600 font-mono mb-1">{Number(activeMatch.overs2).toFixed(1)} ov</p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                                                            <h5 className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-4">Live Activity</h5>
                                                            <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                                                {[...pendingIdeas, ...ideas]
                                                                    .filter(idea => idea.team_id === loggedInCaptain.team_id || idea.isPending)
                                                                    .slice(0, 10)
                                                                    .map((idea: any) => (
                                                                        <div key={idea.id} className={`flex items-center justify-between p-2 rounded-lg bg-black/20 border ${idea.isPending ? 'border-accent/40 animate-pulse' : 'border-white/5'}`}>
                                                                            <div className="flex items-center gap-2">
                                                                                <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-black ${idea.isPending ? 'bg-gray-700' : idea.is_wicket ? 'bg-red-500' : 'bg-green-500'
                                                                                    }`}>
                                                                                    {idea.isPending ? '...' : idea.is_wicket ? 'W' : idea.runs}
                                                                                </div>
                                                                                <p className="text-[10px] text-gray-400 truncate max-w-[100px]">{idea.content}</p>
                                                                            </div>
                                                                            <span className="text-[8px] text-gray-600">
                                                                                {idea.isPending ? 'Pending' : new Date(idea.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="glass-card p-12 text-center border-dashed border-white/10 opacity-60">
                                                <RefreshCw className="w-12 h-12 text-gray-600 mx-auto mb-4 opacity-20" />
                                                <h4 className="text-xl font-bold text-gray-500">Awaiting Match Orders</h4>
                                                <p className="text-sm text-gray-600">The Admin has not initiated any live Match Battles yet.</p>
                                            </div>
                                        )}
                                    </section>
                                </div>

                                {/* History Section */}
                                <section className="mt-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-xl font-black uppercase tracking-widest flex items-center gap-2">
                                            <List className="text-accent w-5 h-5" /> Idea Submission History
                                        </h3>
                                        <button
                                            onClick={fetchHistory}
                                            className="text-[10px] text-gray-500 hover:text-white uppercase font-bold flex items-center gap-1 transition-all"
                                        >
                                            <RefreshCw className={`w-3 h-3 ${loadingHistory ? 'animate-spin' : ''}`} /> Refresh History
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        {historyIdeas.map((idea) => (
                                            <motion.div
                                                key={idea.id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="glass-card p-5 border-white/5 hover:border-accent/10 transition-all"
                                            >
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="px-2 py-0.5 rounded bg-accent/20 text-accent text-[9px] font-black uppercase">
                                                            {idea.match_type}
                                                        </div>
                                                        <div className="text-[10px] text-gray-500 font-mono">
                                                            VS {idea.team_id === activeMatch?.team1_id ? idea.team2_name : idea.team1_name}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`px-2 py-0.5 rounded text-[9px] font-black ${idea.is_wicket ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}>
                                                            {idea.is_wicket ? 'WICKET' : `+${idea.runs} RUNS`}
                                                        </div>
                                                        <span className="text-[10px] font-mono text-gray-600">
                                                            {new Date(idea.created_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>

                                                <p className="text-gray-300 text-sm italic mb-3">
                                                    "{idea.content}"
                                                </p>

                                                {idea.feedback && (() => {
                                                    let feedbackObj = null;
                                                    try {
                                                        feedbackObj = JSON.parse(idea.feedback);
                                                    } catch (e) { }

                                                    return feedbackObj ? (
                                                        <div className="flex flex-wrap gap-2 mt-2">
                                                            {Object.entries(feedbackObj).map(([key, value]: [string, any]) => (
                                                                <div key={key} className="px-2 py-0.5 rounded bg-white/5 border border-white/10 flex items-center gap-2">
                                                                    <span className="text-[8px] uppercase font-bold text-gray-500">{key}</span>
                                                                    <span className={`text-[9px] font-black ${value >= 80 ? 'text-green-500' : value >= 60 ? 'text-accent' : 'text-orange-500'}`}>
                                                                        {Number(value).toFixed(2)}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="bg-black/40 p-3 rounded-lg border border-white/5 flex items-start gap-2">
                                                            <CheckCircle className="w-3 h-3 text-accent mt-0.5 shrink-0" />
                                                            <p className="text-[10px] text-gray-400 leading-normal">
                                                                <span className="text-accent font-bold uppercase mr-1">Feedback:</span> {idea.feedback}
                                                            </p>
                                                        </div>
                                                    );
                                                })()}
                                            </motion.div>
                                        ))}

                                        {historyIdeas.length === 0 && !loadingHistory && (
                                            <div className="py-12 text-center glass-card border-dashed border-white/10 opacity-60">
                                                <p className="text-sm text-gray-600">No submission history found for your team.</p>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            </div>
                        ) : (loggedInCaptain && loggedInCaptain.team_id) ? (
                            <div className="glass-card p-12 text-center border-red-500/20">
                                <Shield className="w-16 h-16 text-red-500 mx-auto mb-6 opacity-20" />
                                <h3 className="text-2xl font-black mb-2 uppercase tracking-tighter text-red-500">Synchronization Error</h3>
                                <p className="text-gray-400 mb-8 max-w-md mx-auto">
                                    We found your assigned team but couldn't retrieve the latest data. Please refresh or contact the Admin.
                                </p>
                                <button
                                    onClick={() => loggedInCaptain && fetchTeamData(loggedInCaptain.team_id!)}
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
                                                src={`/assets/employee/${loggedInCaptain.name.toLowerCase()}.png`}
                                                alt={loggedInCaptain.name}
                                                className="w-full h-full object-cover"
                                                onError={(e) => (e.currentTarget.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + loggedInCaptain.name)}
                                            />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black text-white">{loggedInCaptain.name}</h2>
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
                                <User className="text-accent" /> Identify Captain
                            </h2>
                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {captains.map(captain => (
                                    <button
                                        key={captain.id}
                                        onClick={() => setSelectedCaptain(captain)}
                                        className={`w-full p-4 rounded-xl text-left transition-all flex items-center justify-between ${selectedCaptain?.id === captain.id
                                            ? 'bg-accent/20 border-accent border'
                                            : 'bg-white/5 border border-transparent hover:border-white/20'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-accent/20">
                                                <img
                                                    src={`/assets/employee/${captain.name.toLowerCase()}.png`}
                                                    alt={captain.name}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => (e.currentTarget.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + captain.name)}
                                                />
                                            </div>
                                            <span className="font-medium text-lg">{captain.name}</span>
                                        </div>
                                        {selectedCaptain?.id === captain.id && <ArrowRight className="w-5 h-5" />}
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section className="glass-card p-8 flex flex-col items-center justify-center text-center">
                            <h2 className="text-2xl font-bold mb-4">Login Securely</h2>
                            {!selectedCaptain ? (
                                <p className="text-gray-500">Please select your identity to continue</p>
                            ) : (
                                <div className="space-y-6 w-full">
                                    <p className="text-gray-400">Welcome, {selectedCaptain.name}. Ready to access the HQ?</p>
                                    <form onSubmit={(e) => { e.preventDefault(); handleLogin(selectedCaptain); }} className="space-y-4">
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
                )}
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
