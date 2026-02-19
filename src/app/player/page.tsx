'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, Shield, LogOut, Zap, BarChart3, Clock, User, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PlayerDashboard() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [team, setTeam] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [activeBattle, setActiveBattle] = useState<any>(null);
    const [hasSubmitted, setHasSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [battleStep, setBattleStep] = useState<'lobby' | 'question' | 'result'>('lobby');
    const [battleQuestions, setBattleQuestions] = useState<any[]>([]);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [battleScore, setBattleScore] = useState(0);

    const [stats, setStats] = useState<any>(null);
    const [teamStats, setTeamStats] = useState<any>(null);
    const [questionStartTime, setQuestionStartTime] = useState<number>(0);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    const shuffleArray = <T,>(array: T[]): T[] => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = shuffled[i];
            shuffled[i] = shuffled[j];
            shuffled[j] = temp;
        }
        return shuffled;
    };

    // --- REAL-TIME UPDATES (SSE) ---
    useEffect(() => {
        let eventSource: EventSource | null = null;

        const connectStream = () => {
            if (activeBattle?.id) return; // Optional: Only connect if needed, or always keep open

            // Use a robust SSE connection
            eventSource = new EventSource(`/api/stream?playerId=${user?.id || ''}`);

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.type === 'HEARTBEAT') {
                        // Update critical state from stream
                        setHasSubmitted(data.hasSubmitted);
                        if (JSON.stringify(activeBattle) !== JSON.stringify(data.battle)) {
                            setActiveBattle(data.battle);
                        }
                    }
                } catch (e) {
                    console.error("Stream parse error", e);
                }
            };

            eventSource.onerror = () => {
                eventSource?.close();
                // Fallback to polling is handled by the existing interval if stream dies
            };
        };

        // Only connect if we have a user
        if (user?.id) {
            connectStream();
        }

        return () => {
            eventSource?.close();
        };
    }, [user?.id, activeBattle]); // Re-connect if user changes

    // --- FALLBACK POLLING (Existing Logic, but slower) ---
    useEffect(() => {
        const fetchHeartbeat = async (mode: 'full' | 'status_check' = 'full') => {
            // ... (keep existing fetch logic)
            // Optimization: Pause polling if tab is hidden and we are just checking status
            if (mode === 'status_check' && typeof document !== 'undefined' && document.hidden) return;

            try {
                const url = mode === 'status_check' ? '/api/player/heartbeat?action=status_check' : '/api/player/heartbeat';
                const res = await fetch(url);

                if (res.ok) {
                    const data = await res.json();

                    // Always update critical battle state
                    setHasSubmitted(data.hasSubmitted);

                    // Only update heavy stats on full load
                    if (!data.isPartial) {
                        setUser(data.player);
                        setStats(data.stats);
                        setTeamStats(data.teamStats);
                    }

                    if (data.battle) {
                        const prevBattleId = activeBattle?.id;
                        // ... (rest of battle logic)
                        if (JSON.stringify(activeBattle) !== JSON.stringify(data.battle)) {
                            setActiveBattle(data.battle);
                        }

                        // Fetch questions if new battle or questions not loaded
                        let questions = battleQuestions;
                        const answeredIds = data.answeredQuestionIds || [];

                        if (prevBattleId !== data.battle.id || battleQuestions.length === 0) {
                            const qRes = await fetch(`/api/player/battles/questions?battleId=${data.battle.id}`);
                            const rawQuestions = await qRes.json();

                            // ... (transform logic)
                            const transformed = rawQuestions.map((q: any) => ({
                                ...q,
                                shuffledOptions: shuffleArray(q.options.map((opt: string, idx: number) => ({
                                    text: opt,
                                    originalIndex: idx
                                })))
                            }));

                            const remaining = transformed.filter((q: any) => !answeredIds.includes(q.id));
                            questions = shuffleArray(remaining);
                            setBattleQuestions(questions);
                            setCurrentQuestion(0);
                        }

                        if (questions.length > 0) {
                            if (battleStep === 'lobby' || (!activeBattle)) {
                                setBattleStep('question');
                                setTimeLeft(data.battle.question_timer || 10);
                                setQuestionStartTime(Date.now());
                                setHasSubmitted(false);
                            }
                        } else {
                            if (activeBattle && !hasSubmitted) {
                                setHasSubmitted(true);
                                setBattleStep('result');
                            }
                        }

                    } else {
                        if (activeBattle) {
                            setActiveBattle(null);
                            setBattleQuestions([]);
                        }
                    }

                    // Fetch team details once if not already fetched
                    if (!data.isPartial && data.player.team_id && !team) {
                        const teamRes = await fetch(`/api/teams?id=${data.player.team_id}`);
                        if (teamRes.ok) {
                            const teamData = await teamRes.json();
                            setTeam(teamData);
                        }
                    }

                } else if (res.status === 401) {
                    router.push('/player/login');
                }
            } catch (e) {
                console.error("Heartbeat failed", e);
            } finally {
                setLoading(false);
            }
        };

        // Initial Load
        if (!user) fetchHeartbeat('full');

        // Adaptive Polling (Slower now due to SSE)
        const isWaiting = battleStep === 'lobby' || battleStep === 'result';
        // Relaxed intervals because SSE handles the fast path: 3s waiting, 8s idle
        const pollInterval = isWaiting ? 3000 : 8000;

        const interval = setInterval(() => fetchHeartbeat('status_check'), pollInterval);
        return () => clearInterval(interval);
    }, [activeBattle?.id, team?.id, battleStep, currentQuestion, hasSubmitted, user]);

    const [timeLeft, setTimeLeft] = useState(10);
    const [answerFeedback, setAnswerFeedback] = useState<any>(null);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (battleStep === 'question' && timeLeft > 0 && !answerFeedback && !isSubmitting) {
            timer = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && battleStep === 'question' && !answerFeedback && !isSubmitting) {
            handleAnswer(-1); // Auto-fail if time runs out
        }
        return () => clearInterval(timer);
    }, [battleStep, timeLeft, answerFeedback, isSubmitting]);

    const handleAnswer = async (index: number) => {
        if (answerFeedback || isSubmitting) return;

        setSelectedIndex(index);
        const endTime = Date.now();
        const startTime = questionStartTime;

        // Find the original index if we are clicking a shuffled option
        const selectedOptionObj = index !== -1 ? battleQuestions[currentQuestion].shuffledOptions[index] : null;

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/player/battles/submit-answer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    battleId: activeBattle.id,
                    questionId: battleQuestions[currentQuestion].id,
                    selectedOption: selectedOptionObj ? selectedOptionObj.originalIndex : -1,
                    answer: selectedOptionObj ? selectedOptionObj.text : 'TIMEOUT',
                    startTime,
                    endTime
                })
            });

            if (res.ok) {
                const data = await res.json();
                setAnswerFeedback({ ...data, isTimeout: index === -1 });
                setBattleScore(prev => prev + (data.runsAwarded || 0));

                // Wait 2 seconds before next question
                setTimeout(() => {
                    setAnswerFeedback(null);
                    setSelectedIndex(null);
                    if (currentQuestion < battleQuestions.length - 1) {
                        setCurrentQuestion(prev => prev + 1);
                        setTimeLeft(activeBattle.question_timer || 10);
                        setQuestionStartTime(Date.now());
                    } else {
                        setBattleStep('result');
                    }
                }, 2000);
            }
        } catch (e) {
            console.error("Failed to submit answer", e);
        }
        setIsSubmitting(false);
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/');
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-black">
            <Zap className="w-8 h-8 text-accent animate-pulse" />
        </div>
    );

    return (
        <main className="min-h-screen p-4 md:p-6 bg-animate text-white pb-20">
            <header className="max-w-7xl mx-auto flex justify-between items-center mb-6 md:mb-12">
                <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden border-2 border-accent/20">
                        <img
                            src={`/assets/employee/${user?.name?.toLowerCase()}.png`}
                            alt={user?.name}
                            className="w-full h-full object-cover"
                            onError={(e) => (e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`)}
                        />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-3xl font-black uppercase tracking-tighter italic">Player Hub</h1>
                        <p className="text-accent text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase">{user?.name} • {team?.name || 'Free Agent'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 md:gap-6">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-bold text-[10px] md:text-xs uppercase tracking-widest"
                    >
                        <Home className="w-4 h-4" /> <span className="hidden md:inline">Home</span>
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-bold text-[10px] md:text-xs uppercase tracking-widest"
                    >
                        <LogOut className="w-4 h-4" /> <span className="hidden md:inline">Logout</span>
                    </button>
                </div>
            </header>

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                {/* Profile Card */}
                <div className="glass-card p-6 md:p-8 border-accent/10 relative overflow-hidden group order-2 lg:order-1">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
                        <User className="w-24 h-24" />
                    </div>
                    <h3 className="text-lg md:text-xl font-bold mb-6 flex items-center gap-2">
                        <Trophy className="text-accent w-5 h-5" /> Professional Profile
                    </h3>
                    <div className="space-y-6 relative z-10">
                        <div className="flex justify-between items-end border-b border-white/5 pb-4">
                            <div>
                                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Base Rating</p>
                                <div className="flex gap-1 mt-1">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className={`w-4 h-4 ${i < (user?.rating || 0) ? 'text-accent fill-accent' : 'text-white/10'}`} />
                                    ))}
                                </div>
                            </div>
                            <span className="text-2xl font-black text-white">{user?.rating || 0}.0</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-white/5 pb-4">
                            <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Auction Pool</p>
                            <span className="text-xl font-bold text-accent italic">Pool {user?.pool || '?'}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-white/5 pb-4">
                            <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Total Earned Points</p>
                            <span className="text-xl font-bold text-green-500">{stats?.totalPoints?.toLocaleString() || '0'}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-white/5 pb-4">
                            <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Global Rank</p>
                            <span className="text-xl font-bold text-white">#{stats?.rank || '?'} <span className="text-[10px] text-gray-500 font-normal">/ {stats?.totalPlayers}</span></span>
                        </div>
                        <div className="flex justify-between items-center">
                            <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Signed Price</p>
                            <span className="text-xl font-bold text-white">{user?.sold_price?.toLocaleString() || 'N/A'}</span>
                        </div>
                    </div>
                </div>

                {/* Team Info Card */}
                <div className="glass-card p-6 md:p-8 border-purple-500/10 relative overflow-hidden group order-3 lg:order-2">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity text-purple-500">
                        <Shield className="w-24 h-24" />
                    </div>
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-purple-400">
                        <Shield className="w-5 h-5" /> Team Standing
                    </h3>
                    {team ? (
                        <div className="space-y-6">
                            <div className="text-center py-4">
                                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Assigned To</p>
                                <h4 className="text-4xl font-black italic uppercase tracking-tighter text-glow-purple">{team.name}</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 rounded-xl p-4 text-center">
                                    <p className="text-[10px] text-gray-500 uppercase font-black">Points</p>
                                    <p className="text-xl font-bold text-white">{teamStats?.points || '0'}</p>
                                </div>
                                <div className="bg-white/5 rounded-xl p-4 text-center">
                                    <p className="text-[10px] text-gray-500 uppercase font-black">NRR</p>
                                    <p className="text-xl font-bold text-white">{teamStats?.nrr > 0 ? '+' : ''}{teamStats?.nrr || '0.000'}</p>
                                </div>
                            </div>
                            <div className="text-center">
                                {team.captain_id === user.id ? (
                                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/20 border border-accent/20 rounded-full">
                                        <Trophy className="w-4 h-4 text-accent" />
                                        <span className="text-xs font-black uppercase text-accent tracking-widest">Team Captain</span>
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Squad Member</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center py-8 opacity-40">
                            <Shield className="w-12 h-12 mb-4" />
                            <p className="text-xs font-bold uppercase tracking-widest mb-2">Unassigned</p>
                            <p className="text-[10px] text-gray-600">Waiting for Auction completion</p>
                        </div>
                    )}
                </div>

                {/* Individual Battles Card */}
                <div className="glass-card p-6 md:p-8 border-green-500/10 relative overflow-hidden group bg-green-500/5 order-1 lg:order-3">
                    <div className="absolute top-0 right-0 p-4 opacity-10 animate-pulse text-green-500">
                        <Zap className="w-24 h-24" />
                    </div>
                    <h3 className="text-lg md:text-xl font-bold mb-6 flex items-center gap-2 text-green-400">
                        <Zap className="w-5 h-5 fill-green-400" /> War Zone
                    </h3>

                    <div className="space-y-6 relative z-10 min-h-[250px] flex flex-col justify-between">
                        {activeBattle ? (
                            hasSubmitted || battleStep === 'result' ? (
                                <div className="text-center space-y-4">
                                    <Clock className="w-12 h-12 text-gray-500 mx-auto" />
                                    <h4 className="text-xl font-bold uppercase italic">Response Recorded</h4>
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Awaiting final results from Admin</p>
                                </div>
                            ) : battleStep === 'lobby' ? (
                                <div className="space-y-4">
                                    <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] font-black bg-green-500/20 text-green-500 px-2 py-0.5 rounded uppercase">
                                                {activeBattle.mode === 'TEAM' ? 'Team Battle' : 'Individual'}
                                            </span>
                                            {activeBattle.battle_type && (
                                                <span className="text-[10px] font-black bg-blue-500/20 text-blue-500 px-2 py-0.5 rounded uppercase ml-2">
                                                    {activeBattle.battle_type.replace('_', ' ')}
                                                </span>
                                            )}
                                        </div>
                                        <h4 className="text-lg font-black uppercase text-green-500">{activeBattle.title}</h4>
                                        <p className="text-xs text-gray-400 mt-2">{activeBattle.description}</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setBattleStep('question');
                                            setTimeLeft(activeBattle.question_timer || 10);
                                            setQuestionStartTime(Date.now());
                                        }}
                                        className="w-full btn-primary py-4 text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-accent/20"
                                    >
                                        Join Battle
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-6 relative">
                                    {/* Timer Bar */}
                                    <div className="absolute -top-6 md:-top-12 left-0 right-0 h-1 bg-white/5 rounded-full overflow-hidden">
                                        <motion.div
                                            className={`h-full ${timeLeft <= 3 ? 'bg-red-500' : 'bg-accent'}`}
                                            initial={{ width: '100%' }}
                                            animate={{ width: `${(timeLeft / (activeBattle.question_timer || 10)) * 100}%` }}
                                            transition={{ duration: 1, ease: 'linear' }}
                                        />
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Question {currentQuestion + 1} / {battleQuestions.length}</span>
                                        <div className="flex items-center gap-2">
                                            <Clock className={`w-3 h-3 ${timeLeft <= 3 ? 'text-red-500 animate-pulse' : 'text-gray-500'}`} />
                                            <span className={`text-xs font-black ${timeLeft <= 3 ? 'text-red-500' : 'text-accent'}`}>{timeLeft}s</span>
                                        </div>
                                    </div>

                                    <h4 className="text-lg md:text-xl font-bold leading-tight min-h-[60px]">{battleQuestions[currentQuestion]?.question}</h4>

                                    <div className="grid grid-cols-1 gap-3 relative">
                                        {battleQuestions[currentQuestion]?.shuffledOptions?.map((opt: any, i: number) => {
                                            const isSelected = selectedIndex === i;
                                            const isCorrect = answerFeedback && opt.originalIndex === answerFeedback.correctOption;
                                            const isWrongSelection = isSelected && answerFeedback && !answerFeedback.isCorrect;

                                            return (
                                                <button
                                                    key={i}
                                                    disabled={!!answerFeedback || isSubmitting}
                                                    onClick={() => handleAnswer(i)}
                                                    className={`w-full text-left p-4 rounded-xl border transition-all text-sm font-bold relative overflow-hidden ${isSelected ? 'border-accent bg-accent/10' : 'border-white/10 bg-white/5'} ${answerFeedback
                                                        ? isCorrect
                                                            ? 'bg-green-500/20 border-green-500 text-green-400'
                                                            : isWrongSelection
                                                                ? 'bg-red-500/20 border-red-500 text-red-400'
                                                                : 'opacity-40'
                                                        : 'hover:border-accent hover:bg-accent/5'
                                                        } ${isSubmitting && !answerFeedback ? 'opacity-50 cursor-wait' : ''}`}
                                                >
                                                    {opt.text}
                                                    {isSelected && isSubmitting && !answerFeedback && (
                                                        <span className="absolute right-4 top-1/2 -translate-y-1/2">
                                                            <Zap className="w-4 h-4 text-accent animate-pulse" />
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}

                                        {/* Answer Feedback Overlay */}
                                        {answerFeedback && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-xl z-20"
                                            >
                                                <div className="text-center px-4">
                                                    {answerFeedback.isCorrect ? (
                                                        <div className="space-y-1">
                                                            <div className="text-green-500 font-black text-4xl italic uppercase tracking-tighter shadow-green-500/20 drop-shadow-lg">CORRECT!</div>
                                                            <div className="text-white font-bold text-lg flex items-center justify-center gap-2">
                                                                <Zap className="w-5 h-5 text-accent fill-accent" /> +{answerFeedback.runsAwarded} RUNS
                                                            </div>
                                                            {answerFeedback.rank && <div className="text-accent text-[10px] font-black uppercase tracking-widest">RANK: #{answerFeedback.rank}</div>}
                                                        </div>
                                                    ) : (
                                                        answerFeedback.isTimeout ? (
                                                            <div className="space-y-1">
                                                                <div className="text-orange-500 font-black text-4xl italic uppercase tracking-tighter">TIMEOUT</div>
                                                                <div className="text-gray-400 font-bold text-xs uppercase tracking-widest">Too slow!</div>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-1">
                                                                <div className="text-red-500 font-black text-4xl italic uppercase tracking-tighter">INCORRECT</div>
                                                                <div className="text-gray-400 font-bold text-xs uppercase tracking-widest">Better luck next time!</div>
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>
                                </div>
                            )
                        ) : (
                            <div className="text-center space-y-4 opacity-40">
                                <Clock className="w-12 h-12 text-gray-600 mx-auto animate-spin-slow" />
                                <h4 className="text-xl font-bold uppercase italic text-gray-500">No Active Battle</h4>
                                <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Stay tuned for the next call</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Performance Section */}
            <section className="max-w-7xl mx-auto mt-12 h-64 glass-card border-white/5 p-8 flex flex-col justify-center items-center opacity-30">
                <BarChart3 className="w-12 h-12 text-gray-600 mb-4" />
                <h3 className="text-xl font-black uppercase tracking-tighter italic">Battle History</h3>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-2">No individual battles recorded yet</p>
            </section >
        </main >
    );
}
