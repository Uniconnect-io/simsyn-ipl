'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Clock, Send, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Captain {
    id: string;
    name: string;
    team_id: string | null;
}

export default function LiveBattlePage() {
    const router = useRouter();
    const [captain, setCaptain] = useState<Captain | null>(null);
    const [activeMatch, setActiveMatch] = useState<any>(null);
    const [timeLeft, setTimeLeft] = useState<string>('');
    const [ideaInput, setIdeaInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [lastResult, setLastResult] = useState<any>(null);
    const [feedItems, setFeedItems] = useState<any[]>([]);
    const [pendingIdeas, setPendingIdeas] = useState<any[]>([]);

    useEffect(() => {
        const stored = localStorage.getItem('sipl_captain');
        if (!stored) {
            router.push('/captain');
            return;
        }
        setCaptain(JSON.parse(stored));
    }, []);

    // Timer & Status Polling
    useEffect(() => {
        if (!captain) return;

        const tick = () => {
            if (!activeMatch?.start_time) return;

            const now = new Date();
            const start = new Date(activeMatch.start_time);
            const end = new Date(activeMatch.end_time);
            const diff = end.getTime() - now.getTime();

            if (diff <= 0) {
                setTimeLeft('MATCH ENDED');
                return;
            }

            const mins = Math.floor(diff / 60000);
            const secs = Math.floor((diff % 60000) / 1000);
            setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
        };

        const fetchStatus = async () => {
            try {
                const res = await fetch(`/api/battle/status?captainId=${captain.id}`);
                const data = await res.json();
                if (data.match) {
                    setActiveMatch(data.match);

                    // Hydrate feed with virtual dot balls
                    const myTeamId = captain.team_id;
                    const isTeam1 = data.match.team1_id === myTeamId;
                    // balls1/balls2 now accurately reflect the number of balls bowled (time-based)
                    const ballsBowled = isTeam1 ? data.match.balls1 : data.match.balls2;

                    const realIdeas = data.ideas.filter((i: any) => i.team_id === myTeamId);

                    const hydratedFeed: any[] = [];
                    // Generate items for all balls bowled so far
                    for (let i = 0; i < ballsBowled; i++) {
                        // Find if we have a real submission for this ball index
                        const existing = realIdeas.find((idea: any) => idea.ball_index === i);
                        if (existing) {
                            hydratedFeed.push(existing);
                        } else {
                            // Virtual Dot Ball
                            hydratedFeed.push({
                                id: `virtual-dot-${i}`,
                                content: 'Dot ball',
                                runs: 0,
                                is_wicket: false,
                                score: 0,
                                ball_index: i,
                                team_id: myTeamId,
                                feedback: JSON.stringify({ message: "Dot Ball", reason: "Auto-generated" }),
                                created_at: new Date().toISOString()
                            });
                        }
                    }

                    // Sort descending (newest first)
                    hydratedFeed.sort((a, b) => b.ball_index - a.ball_index);
                    setFeedItems(hydratedFeed);

                    // Remove any pending items that are now covered in the feed
                    // (Matching by ball_index is hard for pending, but content/id helps)
                    setPendingIdeas(prev => prev.filter(p => !hydratedFeed.some((i: any) => i.content === p.content)));

                } else {
                    setActiveMatch(null);
                }
            } catch (e) {
                console.error("Status fetch error", e);
            }
        };

        fetchStatus();
        const interval = setInterval(() => {
            tick();
            fetchStatus();
        }, 1000);

        return () => clearInterval(interval);
    }, [captain]);

    const handleSubmit = async () => {
        if (!ideaInput.trim() || !activeMatch || !captain) return;

        // Non-blocking submission
        const currentIdea = ideaInput;
        setIdeaInput(''); // Optimistic clear instantly

        // Add to pending
        const tempId = Date.now().toString();
        const pendingItem = {
            id: tempId,
            content: currentIdea,
            isProcessing: true,
            ball_index: 999999, // Hack to keep at top/left until real update
            runs: 0,
            is_wicket: false
        };
        setPendingIdeas(prev => [pendingItem, ...prev]);

        try {
            // Process in background (no await blocking user input loop effectively)
            fetch('/api/battle/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    matchId: activeMatch.id,
                    teamId: captain.team_id,
                    captainId: captain.id,
                    content: currentIdea
                }),
            }).then(async (res) => {
                const data = await res.json();
                if (data.success) {
                    setLastResult(data);
                    // Remove this specific pending item from list (polling will add real one)
                    setPendingIdeas(prev => prev.filter(p => p.id !== tempId));
                } else {
                    setLastResult({ error: data.error || 'Submission blocked' });
                    setPendingIdeas(prev => prev.filter(p => p.id !== tempId)); // Remove on error too

                    if (data.error !== 'Match has ended' && data.error !== 'All wickets lost. Submission blocked.') {
                        console.warn("Submission failed:", data.error);
                    }
                }
                // Clear result message after 5 seconds
                setTimeout(() => setLastResult(null), 5000);
            });

        } catch (e) {
            console.error("Network submit error", e);
            setPendingIdeas(prev => prev.filter(p => p.id !== tempId));
        }
    };

    if (!captain) return null;

    if (!activeMatch) {
        return (
            <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-black text-white">
                <div className="glass-card p-12 text-center border-dashed border-white/10 opacity-60">
                    <RefreshCw className="w-12 h-12 text-gray-600 mx-auto mb-4 opacity-50 animate-spin-slow" />
                    <h4 className="text-xl font-bold text-gray-500">No Active Battle</h4>
                    <p className="text-sm text-gray-600 mb-6">Waiting for the Admin to start a match...</p>
                    <button onClick={() => router.push('/captain')} className="text-accent underline text-sm">Return to HQ</button>
                </div>
            </main>
        );
    }

    // Merge Feed Items with Pending Items
    // Pending items should be at top (first) if descending sort
    const mergedFeed = [...pendingIdeas, ...feedItems];

    const myTeamId = captain.team_id;
    const isTeam1 = activeMatch.team1_id === myTeamId;
    const myScore = isTeam1 ? activeMatch.score1 : activeMatch.score2;
    const myWickets = isTeam1 ? activeMatch.wickets1 : activeMatch.wickets2;
    const myOvers = isTeam1 ? activeMatch.overs1 : activeMatch.overs2;

    const oppScore = isTeam1 ? activeMatch.score2 : activeMatch.score1;
    const oppWickets = isTeam1 ? activeMatch.wickets2 : activeMatch.wickets1;
    const oppOvers = isTeam1 ? activeMatch.overs2 : activeMatch.overs1;
    const oppName = isTeam1 ? activeMatch.team2Name : activeMatch.team1Name;

    return (
        <main className="h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-black text-white flex flex-col relative">
            {/* Header / Timer Bar */}
            <header className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-white/5 backdrop-blur-md z-10 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/captain')} className="text-gray-400 hover:text-white transition-colors">
                        &larr; HQ
                    </button>
                    <h1 className="text-xl font-black uppercase tracking-tighter text-glow flex flex-col">
                        <span>Battle Arena</span>
                        {/* Team Name */}
                        {activeMatch && captain.team_id && (
                            <span className="text-[10px] text-accent tracking-widest">
                                {activeMatch.team1_id === captain.team_id ? activeMatch.team1Name : activeMatch.team2Name}
                            </span>
                        )}
                    </h1>
                </div>

                <div className="flex items-center gap-6">
                    {/* Opponent score removed from here */}
                    <div className="h-8 w-px bg-white/10"></div>
                    <div className="flex items-center gap-2 text-3xl font-black font-mono text-accent">
                        <Clock className="w-6 h-6 animate-pulse" />
                        {timeLeft}
                    </div>
                </div>
            </header>

            {/* Main Grid */}
            <div className="flex-1 grid grid-cols-12 gap-0 overflow-hidden">
                {/* Left: Case Study (4 cols) */}
                <section className="col-span-4 border-r border-white/10 bg-black/40 flex flex-col h-full">
                    {/* Top: Scoreboard / Case Study */}
                    <div className="flex-1 p-4 flex flex-col h-full overflow-hidden">
                        <div className="bg-white/5 rounded-2xl p-6 border border-white/10 overflow-y-auto custom-scrollbar h-full flex flex-col">
                            <h3 className="text-xs font-bold text-gray-500 uppercase mb-4 sticky top-0 bg-black/0 backdrop-blur-sm py-2">Current Challenge</h3>
                            <p className="text-base text-gray-300 leading-relaxed font-serif">
                                {activeMatch.case_description}
                            </p>
                        </div>
                    </div>
                </section>

                {/* Right: Action Area (8 cols) */}
                <section className="col-span-8 flex flex-col h-full bg-gradient-to-br from-black to-gray-900">
                    {/* Upper: Scoreboard & Status */}
                    {/* Upper: Scoreboard (Compact Split View) */}
                    <div className="flex-1 min-h-[120px] p-4 flex items-center justify-between border-b border-white/5 relative overflow-hidden shrink-0">
                        <div className="absolute inset-0 bg-accent/5 pointer-events-none"></div>

                        {/* My Team (Left) */}
                        <div className="z-10 flex flex-col items-center w-1/2 border-r border-white/10">
                            <h2 className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">My Score</h2>
                            <div className="text-5xl font-black text-white tracking-tighter flex items-baseline gap-2">
                                <span>{myScore}</span>
                                <span className="text-2xl text-gray-600 font-bold">/{myWickets}</span>
                            </div>
                            <div className="text-sm text-accent font-mono font-bold">
                                {Number(myOvers).toFixed(1)} Overs
                            </div>
                        </div>

                        {/* Opponent (Right) */}
                        <div className="z-10 flex flex-col items-center w-1/2">
                            <h2 className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Opponent ({oppName})</h2>
                            <div className="text-5xl font-black text-gray-400 tracking-tighter flex items-baseline gap-2">
                                <span>{oppScore}</span>
                                <span className="text-2xl text-gray-700 font-bold">/{oppWickets}</span>
                            </div>
                            <div className="text-sm text-gray-500 font-mono font-bold">
                                {Number(oppOvers).toFixed(1)} Overs
                            </div>
                        </div>
                    </div>

                    {/* Middle: Feed (Recent Balls) */}
                    <div className="h-[35dvh] shrink-0 overflow-hidden flex flex-col min-h-0 bg-black/20">
                        {/* SCORECARD TICKER (Latest Left) */}
                        <div className="h-12 bg-black/60 border-b border-white/10 flex items-center px-4 overflow-x-auto custom-scrollbar gap-2 shrink-0 z-20">
                            {(() => {
                                // Sort by ball_index DESCENDING (Latest Left)
                                const sortedIdeas = [...mergedFeed].sort((a, b) => b.ball_index - a.ball_index);
                                return sortedIdeas.map((idea, idx) => (
                                    <div key={idea.id} className="flex items-center">
                                        <div
                                            title={`Ball ${idea.ball_index}: ${idea.content}`}
                                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black mr-1 border ${idea.isProcessing ? 'bg-gray-800 text-gray-400 border-gray-700 animate-pulse' :
                                                idea.is_wicket ? 'bg-red-600 text-white border-red-500' :
                                                    idea.is_extra ? 'bg-blue-600 text-white border-blue-500' :
                                                        idea.runs === 0 ? 'bg-gray-700 text-gray-400 border-gray-600' :
                                                            idea.runs === 4 ? 'bg-purple-600 text-white border-purple-500' :
                                                                idea.runs === 6 ? 'bg-yellow-600 text-white border-yellow-500' :
                                                                    'bg-green-600 text-white border-green-500'
                                                }`}>
                                            {idea.isProcessing ? '...' : (idea.is_wicket ? 'W' : idea.is_extra ? 'NB' : idea.runs)}
                                        </div>
                                        {/* Separator if needed, checks next item since we are desc */}
                                        {idx < sortedIdeas.length - 1 && idea.ball_index % 6 === 0 && sortedIdeas[idx + 1].ball_index !== idea.ball_index && (
                                            <div className="h-6 w-px bg-white/20 mx-2"></div>
                                        )}
                                    </div>
                                ));
                            })()}
                        </div>

                        {/* Feed Section (Latest Top) */}
                        <div className="flex-1 relative overflow-hidden flex flex-col">
                            {/* Gradient at Bottom now since list starts at top */}
                            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/80 to-transparent z-10 pointer-events-none"></div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                                <div className="flex flex-col gap-3">
                                    {/* Sort DESC by ball_index or ID to show latest first */}
                                    {mergedFeed.slice().sort((a, b) => b.ball_index - a.ball_index).slice(0, 50).map((item: any) => (
                                        <motion.div
                                            key={item.id}
                                            initial={{ opacity: 0, y: -20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`p-3 rounded-xl border flex items-center justify-between ${item.isProcessing ? 'bg-white/5 border-dashed border-white/20' :
                                                item.is_wicket ? 'bg-red-500/10 border-red-500/20' :
                                                    item.is_extra ? 'bg-blue-500/10 border-blue-500/20' :
                                                        'bg-white/5 border-white/5'
                                                }`}
                                        >
                                            <div className="flex items-center gap-4 overflow-hidden w-full">
                                                {/* Over.Ball Indicator */}
                                                <div className="w-8 shrink-0 flex items-center justify-center">
                                                    <span className="text-[10px] font-mono text-gray-500 font-bold">
                                                        {item.isProcessing ? '...' : `${Math.floor(item.ball_index / 6)}.${(item.ball_index % 6) + 1}`}
                                                    </span>
                                                </div>
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black shrink-0 ${item.isProcessing ? 'bg-gray-800 text-gray-400 animate-spin-slow' :
                                                    item.is_wicket ? 'bg-red-500 text-white' :
                                                        item.is_extra ? 'bg-blue-500 text-white' :
                                                            'bg-green-500 text-black'
                                                    }`}>
                                                    {item.isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : (item.is_wicket ? 'W' : item.runs)}
                                                </div>
                                                <div className="overflow-hidden flex-1">
                                                    <p className="text-sm text-gray-300 truncate">{item.content}</p>
                                                    {/* Rating Breakdown & Commentary */}
                                                    <div className="mt-2">
                                                        {(() => {
                                                            try {
                                                                const feedback = JSON.parse(item.feedback);
                                                                const breakdown = feedback.breakdown;

                                                                return (
                                                                    <>
                                                                        {breakdown && (
                                                                            <div className="grid grid-cols-5 gap-1 mb-2">
                                                                                {['alignment', 'feasibility', 'innovation', 'value', 'effort'].map((key) => {
                                                                                    const score = breakdown[key] || 0;
                                                                                    return (
                                                                                        <div key={key} className="flex flex-col gap-0.5 group/bar cursor-help" title={`${key}: ${Math.round(score)}`}>
                                                                                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                                                                <div
                                                                                                    className={`h-full ${score > 70 ? 'bg-green-500' : score > 40 ? 'bg-yellow-500' : 'bg-red-500'} transition-all`}
                                                                                                    style={{ width: `${score}%` }}
                                                                                                />
                                                                                            </div>
                                                                                            <span className="text-[8px] text-gray-600 uppercase tracking-tighter truncate group-hover/bar:text-white transition-colors">
                                                                                                {key.slice(0, 3)}
                                                                                            </span>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        )}

                                                                        <p className="text-[10px] text-gray-400 font-mono italic opacity-80 leading-tight">
                                                                            {feedback.commentary || feedback.reason || feedback.message || "Processed"}
                                                                        </p>
                                                                    </>
                                                                );
                                                            } catch {
                                                                return <span className="text-[10px] text-gray-500">Processed</span>;
                                                            }
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-[10px] uppercase font-bold text-gray-500 shrink-0 ml-2">
                                                {item.isProcessing ? 'SENDING' : (item.is_extra ? 'NO BALL' : item.is_wicket ? 'OUT' : 'RUNS')}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Lower: Input Area */}
                    <div className="flex-none p-4 bg-black/40 border-t border-white/10 relative shrink-0">
                        {myWickets >= 10 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-red-500">
                                <AlertTriangle className="w-12 h-12 mb-2 opacity-50" />
                                <h3 className="text-xl font-black uppercase">All Out!</h3>
                                <p className="text-sm opacity-70">You have lost all your wickets. Wait for the match to end.</p>
                            </div>
                        ) : (
                            <div className="relative">
                                <textarea
                                    value={ideaInput}
                                    onChange={(e) => setIdeaInput(e.target.value)}
                                    placeholder="Type your innovation here... (Enter to submit)"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 pr-32 focus:border-accent outline-none text-white text-lg min-h-[100px] resize-none transition-all placeholder:text-gray-600"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSubmit();
                                        }
                                    }}
                                // DISABLED REMOVED
                                />
                                <div className="absolute right-4 bottom-4 flex items-center gap-3">
                                    <span className="text-xs text-gray-500 font-mono hidden md:block">
                                        {1000 - ideaInput.length} chars
                                    </span>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={!ideaInput.trim()}
                                        className="bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-black px-6 py-2 rounded-xl font-black uppercase flex items-center gap-2 transition-all shadow-lg hover:shadow-accent/20"
                                    >
                                        <Send className="w-4 h-4" />
                                        Submit
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Status Message Overlay */}
                        <AnimatePresence>
                            {lastResult && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className={`absolute -top-16 left-6 right-6 p-3 rounded-lg flex items-center justify-center gap-3 shadow-2xl backdrop-blur-md ${lastResult.wicket ? 'bg-red-500/90 text-white' :
                                        lastResult.isExtra ? 'bg-blue-500/90 text-white' :
                                            lastResult.error ? 'bg-orange-500/90 text-white' :
                                                'bg-green-500/90 text-black'
                                        }`}
                                >
                                    {lastResult.wicket ? <AlertTriangle className="w-5 h-5" /> :
                                        lastResult.error ? <AlertTriangle className="w-5 h-5" /> :
                                            <CheckCircle className="w-5 h-5" />}
                                    <span className="font-bold uppercase tracking-wide flex flex-col items-center">
                                        <span>{lastResult.message || (lastResult.error ? lastResult.error : `${lastResult.runs} Runs Scored!`)}</span>
                                        {lastResult.commentary && <span className="text-[10px] font-normal opacity-80 mt-1">"{lastResult.commentary}"</span>}
                                        {lastResult.wicketReason && <span className="text-[10px] font-normal opacity-80">({lastResult.wicketReason})</span>}
                                    </span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </section>
            </div>
        </main>
    );
}
