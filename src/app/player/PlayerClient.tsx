'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, Shield, LogOut, Zap, BarChart3, Clock, User, Home, Lightbulb, Send, CheckCircle2, ChevronRight, Trash2, Users, List, FileText, CheckCircle, Award } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { FEATURE_CARDS, MOSCOW_MAP, TSHIRT_MAP } from '@/lib/roadmapData';

interface PlayerClientProps {
    user: any; // Initial user data from server
}

export default function PlayerClient({ user: initialUser }: PlayerClientProps) {
    const router = useRouter();
    const [user, setUser] = useState<any>(initialUser);
    const [team, setTeam] = useState<any>(null);
    const [loading, setLoading] = useState(true); // Still loading stats/battle

    const [activeBattle, setActiveBattle] = useState<any>(null);
    const loadedBattleIdRef = useRef<string | null>(null);
    const isFetchingQuestionsRef = useRef(false);

    const [hasSubmitted, setHasSubmitted] = useState(false);
    const isRoadmapLoadedRef = useRef(false);
    const lastRoundRef = useRef<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [battleStep, setBattleStep] = useState<'lobby' | 'question' | 'result'>('lobby');
    const battleStepRef = useRef<'lobby' | 'question' | 'result'>('lobby');

    useEffect(() => {
        battleStepRef.current = battleStep;
    }, [battleStep]);

    const [battleQuestions, setBattleQuestions] = useState<any[]>([]);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [battleScore, setBattleScore] = useState(0);

    const [stats, setStats] = useState<any>(null);
    const [teamStats, setTeamStats] = useState<any>(null);
    const [battleHistory, setBattleHistory] = useState<any[]>([]);
    const [questionStartTime, setQuestionStartTime] = useState<number>(0);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    // --- ROADMAP TOURNAMENT STATE ---
    const [roadmapSelections, setRoadmapSelections] = useState<Record<string, { value: string; effort: string }>>({});
    const [roadmapTimeLeft, setRoadmapTimeLeft] = useState<number>(300);
    const [teams, setTeams] = useState<any[]>([]);

    // --- INNOVATION HUB STATE ---
    const [myIdeas, setMyIdeas] = useState<any[]>([]);
    const [ideaTitle, setIdeaTitle] = useState('');
    const [ideaContent, setIdeaContent] = useState('');
    const [editingIdeaId, setEditingIdeaId] = useState<string | null>(null);
    const [isIdeaSubmitting, setIsIdeaSubmitting] = useState(false);
    const [ideaMessage, setIdeaMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const fetchMyIdeas = async () => {
        try {
            const res = await fetch('/api/ideas/my');
            if (res.ok) {
                const data = await res.json();
                setMyIdeas(data);
            }
        } catch (e) {
            console.error("Failed to fetch ideas", e);
        }
    };

    const handleIdeaSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ideaTitle || !ideaContent) return;

        setIsIdeaSubmitting(true);
        setIdeaMessage(null);

        try {
            const res = await fetch('/api/ideas/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: editingIdeaId, title: ideaTitle, content: ideaContent })
            });

            const data = await res.json();
            if (res.ok) {
                setIdeaMessage({ type: 'success', text: editingIdeaId ? `Idea updated and re-evaluated! New Score: ${data.score}/6. ${data.feedback}` : `Submission Received! Initial Score: ${data.score}/6. ${data.feedback}` });
                setIdeaTitle('');
                setIdeaContent('');
                setEditingIdeaId(null);
                fetchMyIdeas();
            } else {
                setIdeaMessage({ type: 'error', text: data.error || 'Failed to submit idea' });
            }
        } catch (e) {
            setIdeaMessage({ type: 'error', text: 'Something went wrong during submission' });
        } finally {
            setIsIdeaSubmitting(false);
        }
    };

    const handleEditIdea = (idea: any) => {
        setEditingIdeaId(idea.id);
        setIdeaTitle(idea.title);
        setIdeaContent(idea.content);
        setIdeaMessage(null);
        // Scroll to form
        const element = document.getElementById('innovation-hub');
        if (element) element.scrollIntoView({ behavior: 'smooth' });
    };

    const cancelEdit = () => {
        setEditingIdeaId(null);
        setIdeaTitle('');
        setIdeaContent('');
        setIdeaMessage(null);
    };

    const handleDeleteIdea = async (id: string) => {
        if (!confirm('Are you sure you want to delete this idea?')) return;

        try {
            const res = await fetch(`/api/ideas/my?id=${id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                fetchMyIdeas();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete idea');
            }
        } catch (e) {
            console.error("Error deleting idea:", e);
            alert('Error deleting idea');
        }
    };

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

    // --- PERSISTENT TIMER LOGIC ---
    const getStoredStartTime = (battleId: string, questionId: string) => {
        if (typeof window === 'undefined' || !battleId || !questionId) return null;
        const key = `sipl_qstart_${battleId}_${questionId}`;
        const stored = sessionStorage.getItem(key);
        return stored ? parseInt(stored) : null;
    };

    const setStoredStartTime = (battleId: string, questionId: string, time: number) => {
        if (typeof window === 'undefined' || !battleId || !questionId) return;
        const key = `sipl_qstart_${battleId}_${questionId}`;
        sessionStorage.setItem(key, time.toString());
    };

    const clearStoredStartTime = (battleId: string, questionId: string) => {
        if (typeof window === 'undefined' || !battleId || !questionId) return;
        const key = `sipl_qstart_${battleId}_${questionId}`;
        sessionStorage.removeItem(key);
    };

    // --- REAL-TIME DATA SYNC ---
    async function fetchHeartbeat(isPartialUpdate = false) {
        if (typeof document !== 'undefined' && document.hidden) return;

        // CRITICAL: If the user is actively in a question session, we FREEZE heartbeats.
        // This prevents 'individual_battle_answers' updates (from other players) 
        // from triggering layout shifts or question jumps for this user.
        if (battleStepRef.current === 'question') {
            return;
        }

        try {
            const url = isPartialUpdate ? '/api/player/heartbeat?action=status_check' : '/api/player/heartbeat';
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();

                // 1. Update Critical State (Server is Truth)
                setHasSubmitted(data.hasSubmitted);

                if (data.savedSelections && Array.isArray(data.savedSelections) && !isRoadmapLoadedRef.current) {
                    const selectionsDict: Record<string, { value: string; effort: string }> = {};
                    data.savedSelections.forEach((item: any) => {
                        selectionsDict[item.cardId] = {
                            value: item.value || '',
                            effort: item.effort || ''
                        };
                    });
                    setRoadmapSelections(selectionsDict);
                    isRoadmapLoadedRef.current = true;
                }

                // 2. Update stats (only if provided in full update)
                if (!data.isPartial) {
                    setUser(data.player);
                    setStats(data.stats);
                    setTeamStats(data.teamStats);
                    setBattleHistory(data.battleHistory || []);
                } else if (data.player) {
                    // Update player basic info even in partial
                    setUser((prev: any) => ({ ...prev, ...data.player }));
                }

                if (data.battle) {
                    const currentBattleId = data.battle.id;

                    // 1. Only update battle object if ID, Status, or Round changed
                    if (!activeBattle || activeBattle.id !== data.battle.id || activeBattle.status !== data.battle.status || activeBattle.current_round !== data.battle.current_round) {
                        setActiveBattle(data.battle);

                        // If the round has advanced, clear previous round's selections
                        if (data.battle.type === 'ROADMAP' && lastRoundRef.current !== null && lastRoundRef.current !== data.battle.current_round) {
                            setRoadmapSelections({});
                            isRoadmapLoadedRef.current = false;
                        }
                        lastRoundRef.current = data.battle.current_round ?? null;
                    }

                    // --- EXPIRY CHECK ---
                    const now = Date.now();
                    const startTime = new Date(data.battle.start_time).getTime();
                    const totalQuestionsCount = data.battle.total_questions || 10;
                    const perQuestionTime = data.battle.question_timer || 10;
                    const totalDurationMs = totalQuestionsCount * (perQuestionTime + 2) * 1000; // +2s for transitions
                    const buffer = 20000; // 20s grace period

                    if (data.battle.type !== 'ROADMAP' && data.battle.start_time && now > (startTime + totalDurationMs + buffer)) {
                        console.warn("Battle session expired based on start time");
                        setHasSubmitted(true);
                        setBattleStep('result');
                        return;
                    }
                    // --------------------

                    const answeredIds = data.answeredQuestionIds || [];

                    // 1. Fetch questions if new battle ID or empty
                    if (currentBattleId !== loadedBattleIdRef.current || battleQuestions.length === 0) {
                        if (isFetchingQuestionsRef.current) return;
                        isFetchingQuestionsRef.current = true;

                        try {
                            const qRes = await fetch(`/api/player/battles/questions?battleId=${currentBattleId}`);
                            if (!qRes.ok) throw new Error("Failed to fetch questions");
                            const rawQuestions = await qRes.json();

                            // Transform & Shuffle
                            const transformed = rawQuestions.map((q: any) => ({
                                ...q,
                                shuffledOptions: shuffleArray(q.options.map((opt: string, idx: number) => ({
                                    text: opt,
                                    originalIndex: idx
                                })))
                            }));

                            const isNewBattle = currentBattleId !== loadedBattleIdRef.current;
                            if (isNewBattle) {
                                isRoadmapLoadedRef.current = false;
                            }
                            // Set all questions (don't filter, to keep total count stable)
                            setBattleQuestions(transformed);
                            loadedBattleIdRef.current = currentBattleId;

                            // On initial load of a battle, find where to start
                            const nextUnansweredIndex = transformed.findIndex((q: any) => !answeredIds.includes(q.id));
                            if (nextUnansweredIndex !== -1) {
                                const qId = transformed[nextUnansweredIndex].id;
                                const storedStart = getStoredStartTime(currentBattleId, qId);
                                const now = Date.now();
                                const perQTime = (data.battle.question_timer || 10);

                                if (storedStart) {
                                    const elapsed = (now - storedStart) / 1000;
                                    if (elapsed >= perQTime) {
                                        // It timed out while they were offline/refreshing
                                        setCurrentQuestion(nextUnansweredIndex);
                                        setQuestionStartTime(storedStart);
                                        setTimeLeft(0);
                                        handleAnswer(-1); // Trigger the submission
                                    } else {
                                        // Resume with remaining time
                                        setCurrentQuestion(nextUnansweredIndex);
                                        setQuestionStartTime(storedStart);
                                        setTimeLeft(Math.max(1, Math.floor(perQTime - elapsed)));
                                    }
                                } else {
                                    setCurrentQuestion(nextUnansweredIndex);
                                }
                            } else if (transformed.length > 0) {
                                // All answered? 
                                setHasSubmitted(true);
                                setBattleStep('result');
                            }

                            // Only reset timer if we are truly starting a new battle
                            if (isNewBattle) {
                                setTimeLeft(data.battle.question_timer || 10);
                                const qId = transformed[nextUnansweredIndex]?.id;
                                const now = Date.now();
                                setQuestionStartTime(now);
                                if (qId) setStoredStartTime(currentBattleId, qId, now);
                                setAnswerFeedback(null);
                                setBattleScore(0); // Reset session score for new battle
                            }
                        } catch (err) {
                            console.error("Error loading questions:", err);
                        } finally {
                            isFetchingQuestionsRef.current = false;
                        }
                    } else if (battleStep !== 'question' || (!answerFeedback && !isSubmitting)) {
                        // CRITICAL: If we are ALREADY in 'question' mode, we DON'T want the heartbeat
                        // to touch our state unless we are idle. This prevents the "refresh" jitter.
                        // Only sync the index if the user is in lobby or just finished a question.
                        const nextUnansweredIndex = battleQuestions.findIndex((q: any) => !answeredIds.includes(q.id));
                        if (nextUnansweredIndex !== -1 && nextUnansweredIndex > currentQuestion) {
                            // Only jump FORWARD via heartbeat, never backward while playing
                            setCurrentQuestion(nextUnansweredIndex);
                        }
                    }

                    // 2. Step Transition Logic (Only move to 'question' if in 'lobby')
                    if (battleQuestions.length > 0 || currentBattleId !== loadedBattleIdRef.current) {
                        if (battleStep === 'lobby' && !data.hasSubmitted && (data.battle?.type !== 'ROADMAP' || data.battle?.status === 'ACTIVE')) {
                            setBattleStep('question');
                            const qId = battleQuestions[currentQuestion]?.id;
                            const now = Date.now();
                            const perQTime = (activeBattle?.question_timer || 10);

                            const storedStart = getStoredStartTime(currentBattleId, qId);
                            if (storedStart) {
                                const elapsed = (now - storedStart) / 1000;
                                if (elapsed >= perQTime) {
                                    setTimeLeft(0);
                                    handleAnswer(-1);
                                } else {
                                    setTimeLeft(Math.floor(perQTime - elapsed));
                                    setQuestionStartTime(storedStart);
                                }
                            } else {
                                setTimeLeft(perQTime);
                                setQuestionStartTime(now);
                                if (currentBattleId && qId) setStoredStartTime(currentBattleId, qId, now);
                            }
                            setAnswerFeedback(null);
                        }
                    } else if (activeBattle && data.hasSubmitted && !answerFeedback) {
                        setBattleStep('result');
                    }

                } else {
                    // No active battle - use a small delay or check to avoid flickering
                    // Only clear if we've officially ended
                    if (activeBattle) {
                        setActiveBattle(null);
                        // Don't immediately clear questions to avoid UI jump if heartbeat flickers
                        // setBattleQuestions([]);
                        setBattleStep('lobby');
                    }
                }

                // 4. Team Logic (only in full update)
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

    // Supabase Realtime Subscription
    useEffect(() => {
        // Initial fetch (Full)
        fetchHeartbeat(false);
        fetchMyIdeas();

        const fetchTeams = async () => {
            try {
                const res = await fetch('/api/teams');
                if (res.ok) {
                    setTeams(await res.json());
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchTeams();

        const channel = supabase
            .channel('player_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
                console.log('Match update detected via Realtime');
                fetchHeartbeat(true); // Partial is enough to check battle status
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'battle_questions' }, () => {
                console.log('Question update detected via Realtime');
                fetchHeartbeat(true);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'individual_battle_answers' }, () => {
                console.log('Answer update detected via Realtime');
                fetchHeartbeat(true);
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'players', filter: `id=eq.${user?.id}` }, () => {
                console.log('Player update detected via Realtime');
                fetchHeartbeat(false); // Player info needs full refresh for stats
            })
            .subscribe((status) => {
                console.log('Realtime subscription status:', status);
            });

        // Fallback polling (Much slower: 30s)
        const interval = setInterval(() => fetchHeartbeat(false), 30000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, [user?.id]); // Only re-subscribe if user ID changes (e.g. login/logout)

    // Roadmap Timer Countdown (Round 1 only — Round 3 is admin-controlled)
    useEffect(() => {
        if (activeBattle?.type === 'ROADMAP') {
            // Round 3 (Team Huddle) has no timer — admin ends it manually
            if (activeBattle.current_round === 3) return;

            const updateTimer = () => {
                if (activeBattle.status !== 'ACTIVE') {
                    // Match is paused or pending. Do not tick or auto-submit.
                    return;
                }
                const now = Date.now();
                const startTime = new Date(activeBattle.start_time).getTime();
                if (!startTime || isNaN(startTime)) {
                    return;
                }
                const durationSec = (activeBattle.question_timer || 5) * 60;
                const elapsed = Math.floor((now - startTime) / 1000);
                const remaining = Math.max(0, durationSec - elapsed);
                setRoadmapTimeLeft(remaining);

                if (remaining <= 0 && !hasSubmitted) {
                    handleRoadmapAutoSubmit();
                }
            };

            updateTimer();
            const t = setInterval(updateTimer, 1000);
            return () => clearInterval(t);
        }
    }, [activeBattle, hasSubmitted]);

    const [timeLeft, setTimeLeft] = useState(10);
    const [answerFeedback, setAnswerFeedback] = useState<any>(null);

    // Use a ref for handleAnswer to avoid stale closure issues in setInterval
    const handleAnswerRef = useRef(handleAnswer);
    useEffect(() => {
        handleAnswerRef.current = handleAnswer;
    }, [handleAnswer]);

    useEffect(() => {
        let timer: NodeJS.Timeout;

        // Timer only runs if we are in 'question' step, the clock is ticking, and no result is being shown
        if (battleStep === 'question' && timeLeft > 0 && !answerFeedback && !isSubmitting) {
            timer = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        // Trigger timeout answer
                        handleAnswerRef.current(-1);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => clearInterval(timer);
    }, [battleStep, !!answerFeedback, isSubmitting]); // Removed timeLeft dependency to prevent refresh jitter

    // Session Expiry Tracker (Precise)
    useEffect(() => {
        const timer = setInterval(() => {
            if (activeBattle && battleStep === 'question' && activeBattle.start_time) {
                const now = Date.now();
                const startTime = new Date(activeBattle.start_time).getTime();
                const totalQuestions = activeBattle.total_questions || 10;
                const perQuestionTime = activeBattle.question_timer || 10;
                const totalDurationMs = totalQuestions * (perQuestionTime + 2) * 1000;
                const buffer = 20000; // 20s grace period

                if (now > (startTime + totalDurationMs + buffer)) {
                    console.warn("Battle session expired (active tracker)");
                    setHasSubmitted(true);
                    setBattleStep('result');
                }
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [activeBattle, battleStep]);

    async function handleAnswer(index: number) {
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
                        const nextIndex = currentQuestion + 1;
                        const nextQId = battleQuestions[nextIndex].id;
                        const now = Date.now();

                        setCurrentQuestion(nextIndex);
                        setTimeLeft(activeBattle.question_timer || 10);
                        setQuestionStartTime(now);
                        if (activeBattle.id && nextQId) setStoredStartTime(activeBattle.id, nextQId, now);
                    } else {
                        setBattleStep('result');
                    }
                }, 2000);
            } else if (res.status === 403) {
                // Battle ended by admin
                console.warn("Battle ended by admin");
                setBattleStep('result');
            }
        } catch (e) {
            console.error("Failed to submit answer", e);
        }
        setIsSubmitting(false);
    };

    const handleSelectChange = (featId: string, type: 'value' | 'effort', val: string) => {
        if (activeBattle?.status !== 'ACTIVE') return;
        const currentSel = roadmapSelections[featId] || { value: '', effort: '' };
        const updatedSel = { ...currentSel, [type]: val };
        const updatedSelectionsDict = {
            ...roadmapSelections,
            [featId]: updatedSel
        };
        
        setRoadmapSelections(updatedSelectionsDict);

        const features = battleQuestions.length > 0 ? battleQuestions : FEATURE_CARDS;
        const ballot = features.map(c => {
            const sel = updatedSelectionsDict[c.id] || { value: '', effort: '' };
            return {
                cardId: c.id,
                value: sel.value,
                effort: sel.effort
            };
        }).filter(item => item.value || item.effort);

        submitRoadmapBallotQuietly(ballot);
    };

    async function submitRoadmapBallotQuietly(ballot: any[]) {
        try {
            const round = activeBattle.current_round === 3 ? 2 : 1;
            await fetch('/api/roadmap/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    matchId: activeBattle.id,
                    round,
                    submissions: ballot,
                    isFinal: true
                })
            });
        } catch (e) {
            console.error("Autosave failed:", e);
        }
    }

    async function handleRoadmapAutoSubmit() {
        if (hasSubmitted) return;
        setHasSubmitted(true);
        const features = battleQuestions.length > 0 ? battleQuestions : FEATURE_CARDS;
        const ballot = features.map(c => {
            const sel = roadmapSelections[c.id] || { value: 'W', effort: 'XL' };
            return {
                cardId: c.id,
                value: sel.value,
                effort: sel.effort
            };
        });
        await submitRoadmapBallot(ballot, true);
    }

    async function submitRoadmapBallot(ballot: any[], isFinal = false) {
        setIsSubmitting(true);
        try {
            const round = activeBattle.current_round === 3 ? 2 : 1;
            const res = await fetch('/api/roadmap/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    matchId: activeBattle.id,
                    round,
                    submissions: ballot,
                    isFinal
                })
            });
            if (res.ok) {
                if (isFinal) {
                    setHasSubmitted(true);
                }
                fetchHeartbeat(true);
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to submit ballot');
            }
        } catch (e) {
            console.error("Roadmap submit error:", e);
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/');
    };

    const renderRoadmapWarZone = () => {
        const round = activeBattle.current_round || 1;
        const features = battleQuestions.length > 0 ? battleQuestions : FEATURE_CARDS;

        // Round 1 (Solo Active)
        if (round === 1) {
            const answeredCount = features.filter(f => {
                const sel = roadmapSelections[f.id];
                return sel && sel.value && sel.effort;
            }).length;
            const progressPercent = (answeredCount / features.length) * 100;
            const playerScores = activeBattle.roadmap_results?.round1?.playerScores || [];

            return (
                <div className="space-y-6">
                    <div className="flex justify-between items-center bg-black/40 border border-white/10 p-4 rounded-2xl">
                        <div className="space-y-1">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Ballot Progress</span>
                            <div className="flex items-center gap-2">
                                <div className="text-sm font-black text-white">{answeredCount} / {features.length} Cards</div>
                                <div className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded font-black">{progressPercent.toFixed(0)}%</div>
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-accent transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                    </div>

                    {/* Feature Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[calc(100vh-300px)] overflow-y-auto p-1 pr-2 custom-scrollbar">
                        {features.map((feat, idx) => {
                            const currentSel = roadmapSelections[feat.id] || { value: '', effort: '' };
                            return (
                                <div key={feat.id} className={`p-4 rounded-2xl border transition-all space-y-3 ${currentSel.value && currentSel.effort ? 'border-green-500/20 bg-green-500/5' : 'border-white/5 bg-black/20'}`}>
                                    <div className="flex items-start gap-2.5">
                                        <span className="text-[10px] font-black bg-white/5 text-gray-400 w-5 h-5 rounded-full flex items-center justify-center italic shrink-0">
                                            {idx + 1}
                                        </span>
                                        <div>
                                            <h5 className="font-bold text-sm text-white leading-tight">{feat.question || feat.title}</h5>
                                            <p className="text-[11px] text-gray-500 leading-normal mt-1">{feat.options?.[0] || feat.description}</p>
                                        </div>
                                    </div>

                                    {/* Dropdowns */}
                                    <div className="grid grid-cols-2 gap-2">
                                        {/* Value Dropdown */}
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-gray-500 uppercase">Value (MoSCoW)</label>
                                            <select
                                                value={currentSel.value}
                                                onChange={e => handleSelectChange(feat.id, 'value', e.target.value)}
                                                className={`w-full bg-black/60 border rounded-lg p-2 text-xs font-bold focus:outline-none focus:border-accent ${
                                                    currentSel.value === 'M' ? 'border-red-500/30 text-red-400' :
                                                    currentSel.value === 'S' ? 'border-orange-500/30 text-orange-400' :
                                                    currentSel.value === 'C' ? 'border-blue-500/30 text-blue-400' :
                                                    currentSel.value === 'W' ? 'border-gray-500/30 text-gray-400' : 'border-white/10 text-gray-500'
                                                }`}
                                            >
                                                <option className="bg-[#121212] text-white" value="" disabled>Select Value</option>
                                                <option className="bg-[#121212] text-white" value="M">M - Must (13)</option>
                                                <option className="bg-[#121212] text-white" value="S">S - Should (8)</option>
                                                <option className="bg-[#121212] text-white" value="C">C - Could (3)</option>
                                                <option className="bg-[#121212] text-white" value="W">W - Won't (1)</option>
                                            </select>
                                        </div>

                                        {/* Effort Dropdown */}
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-gray-500 uppercase">Effort (T-Shirt)</label>
                                            <select
                                                value={currentSel.effort}
                                                onChange={e => handleSelectChange(feat.id, 'effort', e.target.value)}
                                                className={`w-full bg-black/60 border rounded-lg p-2 text-xs font-bold focus:outline-none focus:border-accent ${
                                                    currentSel.effort === 'XL' ? 'border-red-500/30 text-red-400' :
                                                    currentSel.effort === 'L' ? 'border-orange-500/30 text-orange-400' :
                                                    currentSel.effort === 'M' ? 'border-yellow-500/30 text-yellow-400' :
                                                    currentSel.effort === 'S' ? 'border-blue-500/30 text-blue-400' :
                                                    currentSel.effort === 'XS' ? 'border-green-500/30 text-green-400' : 'border-white/10 text-gray-500'
                                                }`}
                                            >
                                                <option className="bg-[#121212] text-white" value="" disabled>Select Effort</option>
                                                <option className="bg-[#121212] text-white" value="XS">XS - X-Small (1)</option>
                                                <option className="bg-[#121212] text-white" value="S">S - Small (2)</option>
                                                <option className="bg-[#121212] text-white" value="M">M - Medium (3)</option>
                                                <option className="bg-[#121212] text-white" value="L">L - Large (5)</option>
                                                <option className="bg-[#121212] text-white" value="XL">XL - X-Large (8)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Live Leaderboard (Round 1 Averages) */}
                    <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
                        <h4 className="text-sm font-black uppercase tracking-widest text-accent flex items-center gap-2">
                            <Zap className="w-4 h-4 text-accent fill-accent animate-pulse" /> Live Leaderboard (Round 1 Averages)
                        </h4>
                        <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                            {playerScores.length === 0 ? (
                                <div className="text-center text-xs text-gray-500 py-6 uppercase font-bold">No submissions yet...</div>
                            ) : (
                                playerScores.map((ps: any, idx: number) => {
                                    const isCurrentUser = ps.playerId === user?.id;
                                    const choices = ps.choices || {};
                                    const totalChoices = Object.keys(choices).length || 1;
                                    let agreed = 0;
                                    Object.values(choices).forEach((ch: any) => {
                                        if (ch.points > 0) agreed++;
                                    });
                                    const agreePct = Math.round((agreed / totalChoices) * 100);
                                    const disagreePct = 100 - agreePct;

                                    return (
                                        <div key={ps.playerId} className={`flex justify-between items-center p-3 rounded-xl border text-sm font-bold transition-all ${isCurrentUser ? 'border-accent bg-accent/10 text-white' : 'border-white/5 bg-black/20 text-gray-300'}`}>
                                            <div className="flex items-center gap-3">
                                                <span className={`text-xs font-black w-6 h-6 rounded-full flex items-center justify-center ${idx === 0 ? 'bg-yellow-500 text-black' : idx === 1 ? 'bg-slate-300 text-black' : idx === 2 ? 'bg-amber-600 text-black' : 'bg-white/10 text-gray-500'}`}>
                                                    {idx + 1}
                                                </span>
                                                <div>
                                                    <div>{ps.playerName}</div>
                                                    <div className="text-[10px] text-gray-500 uppercase font-black">
                                                        {teams.find(t => t.id === ps.teamId)?.name || 'No Team'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right flex items-center gap-3">
                                                <div className="text-right border-r border-white/10 pr-3 mr-1 text-gray-500 font-mono text-xs">
                                                    <div>{ps.score} pts</div>
                                                    <div className="text-[7px] uppercase tracking-widest text-gray-600 font-black">Score</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-base font-black italic text-green-400 leading-none">{agreePct}%</div>
                                                    <div className="text-[8px] text-gray-500 font-black uppercase tracking-widest mt-0.5">Agree</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-base font-black italic text-red-400 leading-none">{disagreePct}%</div>
                                                    <div className="text-[8px] text-gray-500 font-black uppercase tracking-widest mt-0.5">Disagree</div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        // Round 2 (Solo Results Display)
        if (round === 2) {
            const r1Results = activeBattle.roadmap_results?.round1;
            const playerScores = r1Results?.playerScores || [];
            const myResult = playerScores.find((ps: any) => ps.playerId === user?.id);

            return (
                <div className="space-y-6">
                    <div className="text-center py-4 bg-accent/10 border border-accent/20 rounded-2xl">
                        <Award className="w-10 h-10 text-accent mx-auto mb-1 animate-pulse" />
                        <h4 className="text-lg font-black uppercase text-accent font-black">Round 1 Standings</h4>
                        {myResult ? (
                            <p className="text-xs text-white font-bold mt-1 uppercase">
                                You scored <span className="text-accent font-black">{myResult.score} / 20.0</span> points! (Rank #{playerScores.findIndex((ps: any) => ps.playerId === user?.id) + 1})
                            </p>
                        ) : (
                            <p className="text-xs text-gray-500 font-bold mt-1 uppercase">Solo round results are in!</p>
                        )}
                    </div>

                    <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
                        <h4 className="text-sm font-black uppercase tracking-widest text-accent flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-accent" /> Leaderboard Rankings
                        </h4>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {playerScores.map((ps: any, idx: number) => {
                                const isCurrentUser = ps.playerId === user?.id;
                                return (
                                    <div key={ps.playerId} className={`flex justify-between items-center p-3 rounded-xl border text-sm font-bold ${isCurrentUser ? 'border-accent bg-accent/10 text-white' : 'border-white/5 bg-black/20 text-gray-300'}`}>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-xs font-black w-6 h-6 rounded-full flex items-center justify-center ${idx === 0 ? 'bg-yellow-500 text-black' : idx === 1 ? 'bg-gray-300 text-black' : idx === 2 ? 'bg-amber-600 text-black' : 'bg-white/10 text-gray-500'}`}>
                                                {idx + 1}
                                            </span>
                                            <div>
                                                <div>{ps.playerName}</div>
                                                <div className="text-[10px] text-gray-500 uppercase font-black">
                                                    {teams.find(t => t.id === ps.teamId)?.name || 'No Team'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-accent font-mono font-black">{ps.score} pts</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            );
        }

        // Round 3 (Team Collaborative strategy)
        if (round === 3) {
            const isOwner = user?.role === 'OWNER';

            if (!isOwner) {
                // Team Member Spectator View
                return (
                    <div className="space-y-6 text-center py-10">
                        <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
                            <Users className="w-8 h-8 text-accent" />
                        </div>
                        <h4 className="text-xl font-bold uppercase italic">Team Huddle In Progress</h4>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider max-w-sm mx-auto leading-relaxed">
                            Your Team Owner is currently negotiating and submitting the final consensus ballot. Help them discuss and strategize!
                        </p>
                        <div className="pt-6 border-t border-white/5 mt-6 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                            <h5 className="text-xs text-left font-black uppercase text-gray-500 mb-3 tracking-widest">Roadmap Feature List</h5>
                            {features.map((feat, idx) => (
                                <div key={feat.id} className="flex justify-between items-center text-left py-2 border-b border-white/5 text-xs text-gray-300">
                                    <span className="font-bold">{idx + 1}. {feat.question || feat.title}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            }

            // Team Owner Edit & Submit Ballot View
            if (hasSubmitted) {
                return (
                    <div className="text-center py-10 space-y-4 animate-pulse">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                        <h4 className="text-xl font-bold uppercase italic">Team Ballot Submitted!</h4>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Awaiting administrator to close the match and compile team scores.</p>
                    </div>
                );
            }

            const answeredCount = features.filter(f => {
                const sel = roadmapSelections[f.id];
                return sel && sel.value && sel.effort;
            }).length;
            const progressPercent = (answeredCount / features.length) * 100;
            const timerMin = Math.floor(roadmapTimeLeft / 60);
            const timerSec = roadmapTimeLeft % 60;

            return (
                <div className="space-y-6">
                    <div className="bg-accent/10 border border-accent/20 p-4 rounded-2xl text-xs text-accent font-bold uppercase leading-relaxed">
                        ⚠️ <span className="font-black">Team Owner Console:</span> You are submitting the final consensus decisions for your entire team. Ensure your team is fully aligned!
                    </div>

                    <div className="flex justify-between items-center bg-black/40 border border-white/10 p-4 rounded-2xl">
                        <div className="space-y-1">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Consensus Ballot Progress</span>
                            <div className="flex items-center gap-2">
                                <div className="text-sm font-black text-white">{answeredCount} / {features.length} Cards</div>
                                <div className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded font-black">{progressPercent.toFixed(0)}%</div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[calc(100vh-300px)] overflow-y-auto p-1 pr-2 custom-scrollbar">
                        {features.map((feat, idx) => {
                            const currentSel = roadmapSelections[feat.id] || { value: '', effort: '' };
                            return (
                                <div key={feat.id} className={`p-4 rounded-2xl border transition-all space-y-3 ${currentSel.value && currentSel.effort ? 'border-green-500/20 bg-green-500/5' : 'border-white/5 bg-black/20'}`}>
                                    <div className="flex items-start gap-2.5">
                                        <span className="text-[10px] font-black bg-white/5 text-gray-400 w-5 h-5 rounded-full flex items-center justify-center italic shrink-0">
                                            {idx + 1}
                                        </span>
                                        <div>
                                            <h5 className="font-bold text-sm text-white leading-tight">{feat.question || feat.title}</h5>
                                            <p className="text-[11px] text-gray-500 leading-normal mt-1">{feat.options?.[0] || feat.description}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-gray-500 uppercase">Value (MoSCoW)</label>
                                            <select
                                                value={currentSel.value}
                                                onChange={e => handleSelectChange(feat.id, 'value', e.target.value)}
                                                className={`w-full bg-black/60 border rounded-lg p-2 text-xs font-bold focus:outline-none focus:border-accent ${
                                                    currentSel.value === 'M' ? 'border-red-500/30 text-red-400' :
                                                    currentSel.value === 'S' ? 'border-orange-500/30 text-orange-400' :
                                                    currentSel.value === 'C' ? 'border-blue-500/30 text-blue-400' :
                                                    currentSel.value === 'W' ? 'border-gray-500/30 text-gray-400' : 'border-white/10 text-gray-500'
                                                }`}
                                            >
                                                <option className="bg-[#121212] text-white" value="" disabled>Select Value</option>
                                                <option className="bg-[#121212] text-white" value="M">M - Must (13)</option>
                                                <option className="bg-[#121212] text-white" value="S">S - Should (8)</option>
                                                <option className="bg-[#121212] text-white" value="C">C - Could (3)</option>
                                                <option className="bg-[#121212] text-white" value="W">W - Won't (1)</option>
                                            </select>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-gray-500 uppercase">Effort (T-Shirt)</label>
                                            <select
                                                value={currentSel.effort}
                                                onChange={e => handleSelectChange(feat.id, 'effort', e.target.value)}
                                                className={`w-full bg-black/60 border rounded-lg p-2 text-xs font-bold focus:outline-none focus:border-accent ${
                                                    currentSel.effort === 'XL' ? 'border-red-500/30 text-red-400' :
                                                    currentSel.effort === 'L' ? 'border-orange-500/30 text-orange-400' :
                                                    currentSel.effort === 'M' ? 'border-yellow-500/30 text-yellow-400' :
                                                    currentSel.effort === 'S' ? 'border-blue-500/30 text-blue-400' :
                                                    currentSel.effort === 'XS' ? 'border-green-500/30 text-green-400' : 'border-white/10 text-gray-500'
                                                }`}
                                            >
                                                <option className="bg-[#121212] text-white" value="" disabled>Select Effort</option>
                                                <option className="bg-[#121212] text-white" value="XS">XS - X-Small (1)</option>
                                                <option className="bg-[#121212] text-white" value="S">S - Small (2)</option>
                                                <option className="bg-[#121212] text-white" value="M">M - Medium (3)</option>
                                                <option className="bg-[#121212] text-white" value="L">L - Large (5)</option>
                                                <option className="bg-[#121212] text-white" value="XL">XL - X-Large (8)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }

        // Round 4 (Tournament Completed Results)
        if (round === 4) {
            const r2Results = activeBattle.roadmap_results?.round2;
            const teamScores = r2Results?.teamScores || [];
            const myTeamResult = teamScores.find((ts: any) => ts.teamId === user?.team_id);

            return (
                <div className="space-y-6">
                    <div className="text-center py-4 bg-green-500/10 border border-green-500/20 rounded-2xl">
                        <Award className="w-10 h-10 text-green-500 mx-auto mb-1 animate-pulse" />
                        <h4 className="text-lg font-black uppercase text-green-500">Tournament Completed</h4>
                        {myTeamResult ? (
                            <p className="text-xs text-white font-bold mt-1 uppercase leading-normal">
                                Your Team Total Score: <span className="text-green-400 font-black">{myTeamResult.totalScore} pts</span><br />
                                (Consensus: {myTeamResult.consensusPoints} pts, Collaboration Bonus: +{myTeamResult.collaborationBonus} pts)
                            </p>
                        ) : (
                            <p className="text-xs text-gray-500 font-bold mt-1 uppercase">Final Team Scores Compiled!</p>
                        )}
                    </div>

                    <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
                        <h4 className="text-sm font-black uppercase tracking-widest text-accent flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-accent" /> Team Leaderboard
                        </h4>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {teamScores.map((ts: any, idx: number) => {
                                const isMyTeam = ts.teamId === user?.team_id;
                                return (
                                    <div key={ts.teamId} className={`flex justify-between items-center p-3 rounded-xl border text-sm font-bold ${isMyTeam ? 'border-accent bg-accent/10 text-white' : 'border-white/5 bg-black/20 text-gray-300'}`}>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-xs font-black w-6 h-6 rounded-full flex items-center justify-center ${idx === 0 ? 'bg-yellow-500 text-black' : idx === 1 ? 'bg-gray-300 text-black' : idx === 2 ? 'bg-amber-600 text-black' : 'bg-white/10 text-gray-500'}`}>
                                                {idx + 1}
                                            </span>
                                            <div>
                                                <div>{ts.teamName}</div>
                                                <div className="text-[10px] text-gray-500 uppercase font-black">
                                                    deviation: {(ts.avgMemberDeviation * 100).toFixed(0)}%
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-accent font-mono font-black">{ts.totalScore} pts</div>
                                            <div className="text-[9px] text-gray-500 uppercase">League Points: +{ts.awardedPoints}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            );
        }

        return null;
    };

    if (loading && !user) return (
        <div className="min-h-screen flex items-center justify-center bg-black">
            <Zap className="w-8 h-8 text-accent animate-pulse" />
        </div>
    );

    return (
        <main className="min-h-screen p-4 md:p-6 xl:p-10 bg-animate text-white pb-20">
            <header className="max-w-screen-2xl mx-auto flex justify-between items-center mb-6 md:mb-12">
                <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden border-2 border-accent/20">
                        <img
                            src={`/assets/employee/thumb/${user?.name?.toLowerCase()}.png`}
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

            <div className="max-w-screen-2xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_1fr_2fr] xl:grid-cols-[320px_320px_1fr] gap-6 md:gap-8 xl:gap-10 items-start">
                {/* Profile Card */}
                <div className="glass-card p-6 md:p-8 xl:p-10 border-accent/10 relative overflow-hidden group order-2 lg:order-1">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
                        <User className="w-24 h-24" />
                    </div>
                    <h3 className="text-lg md:text-xl font-bold mb-6 flex items-center gap-2">
                        <Trophy className="text-accent w-5 h-5" /> Professional Profile
                    </h3>
                    <div className="space-y-6 relative z-10">
                        {user.role !== 'OWNER' && (
                            <>
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
                            </>
                        )}
                        <div className="flex justify-between items-center border-b border-white/5 pb-4">
                            <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Total Earned Points</p>
                            <span className="text-xl font-bold text-green-500">{stats?.totalPoints?.toLocaleString() || '0'}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-white/5 pb-4">
                            <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Global Rank</p>
                            <span className="text-xl font-bold text-white">#{stats?.rank || '?'} <span className="text-[10px] text-gray-500 font-normal">/ {stats?.totalPlayers}</span></span>
                        </div>
                        {user.role !== 'OWNER' && (
                            <div className="flex justify-between items-center">
                                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Signed Price</p>
                                <span className="text-xl font-bold text-white">{user?.sold_price?.toLocaleString() || 'N/A'}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Team Info Card */}
                <div className="glass-card p-6 md:p-8 xl:p-10 border-purple-500/10 relative overflow-hidden group order-3 lg:order-2">
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
                            <p className="text-xs text-gray-600">Waiting for Auction completion</p>
                        </div>
                    )}
                </div>

                {/* Individual Battles Card */}
                <div className="glass-card p-6 md:p-8 xl:p-10 border-green-500/10 relative overflow-hidden group bg-green-500/5 order-1 lg:order-3">
                    {/* <div className="absolute top-0 right-0 p-4 opacity-10 animate-pulse text-green-500">
                        <Zap className="w-24 h-24" />
                    </div> */}
                    <h3 className="text-lg md:text-xl font-bold mb-6 flex items-center gap-2 text-green-400">
                        <Zap className="w-5 h-5 fill-green-400" /> War Zone
                    </h3>

                    <div className="space-y-6 relative z-10 min-h-[250px] flex flex-col justify-between">
                        {activeBattle ? (
                            activeBattle.type === 'ROADMAP' ? (
                                renderRoadmapWarZone()
                            ) : hasSubmitted || battleStep === 'result' ? (
                                <div className="text-center space-y-4 flex-1 flex flex-col justify-center">
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
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-lg font-black uppercase text-green-500">{activeBattle.title}</h4>
                                            {activeBattle.is_test && (
                                                <span className="text-[10px] font-black bg-red-500/20 text-red-500 px-2 py-0.5 rounded border border-red-500/20 animate-pulse">MOCK</span>
                                            )}
                                        </div>
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
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Question {currentQuestion + 1} / {battleQuestions.length}</span>
                                            {activeBattle.is_test && (
                                                <span className="text-[8px] font-black bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded border border-red-500/20">MOCK</span>
                                            )}
                                        </div>
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
                            <div className="text-center space-y-4 opacity-40 flex-1 flex flex-col justify-center">
                                <Clock className="w-12 h-12 text-gray-600 mx-auto animate-spin-slow" />
                                <h4 className="text-xl font-bold uppercase italic text-gray-500">No Active Battle</h4>
                                <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Stay tuned for the next call</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Innovation Hub Section */}
            <section id="innovation-hub" className="max-w-screen-2xl mx-auto mt-12 mb-20 px-4 md:px-0">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter italic">Innovation Hub</h3>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Submit your ideas for UniConnect Roadmap</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Submission Form */}
                    <div className="glass-card p-6 md:p-8 border-accent/10">
                        <h4 className="text-lg font-bold mb-6 flex items-center justify-between gap-2">
                            <span className="flex items-center gap-2">
                                <Lightbulb className="text-accent w-5 h-5" /> {editingIdeaId ? 'Update Your Idea' : 'Pitch New Idea'}
                            </span>
                            {editingIdeaId && (
                                <button
                                    onClick={cancelEdit}
                                    className="text-[10px] font-black text-gray-400 hover:text-white transition-colors uppercase tracking-[0.1em]"
                                >
                                    Cancel
                                </button>
                            )}
                        </h4>
                        <form onSubmit={handleIdeaSubmit} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Idea Title</label>
                                <input
                                    type="text"
                                    value={ideaTitle}
                                    onChange={(e) => setIdeaTitle(e.target.value)}
                                    placeholder="e.g. AI-driven sentiment analysis for call transcripts"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-accent outline-none transition-colors"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Detailed Description</label>
                                <textarea
                                    value={ideaContent}
                                    onChange={(e) => setIdeaContent(e.target.value)}
                                    placeholder="Describe your idea, its impact on customer engagement, and how it aligns with UniConnect..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-accent outline-none transition-colors min-h-[150px] resize-none"
                                    required
                                />
                            </div>

                            {ideaMessage && (
                                <div className={`p-4 rounded-xl text-xs font-bold flex items-start gap-2 ${ideaMessage.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                    {ideaMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <Zap className="w-4 h-4 shrink-0" />}
                                    {ideaMessage.text}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isIdeaSubmitting}
                                className="w-full btn-primary py-4 text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2"
                            >
                                {isIdeaSubmitting ? 'Evaluating...' : (
                                    <>
                                        {editingIdeaId ? 'Update & Re-evaluate' : 'Submit Idea'} <Send className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* My Ideas List */}
                    <div className="glass-card p-6 md:p-8 border-white/5">
                        <h4 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <Clock className="text-gray-400 w-5 h-5" /> My Submissions
                        </h4>
                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                            {myIdeas.length > 0 ? (
                                myIdeas.map((idea, idx) => (
                                    <div key={idx} className={`bg-white/5 border rounded-xl p-4 transition-colors ${editingIdeaId === idea.id ? 'border-accent shadow-[0_0_15px_rgba(249,115,22,0.1)]' : 'border-white/5 hover:border-white/10'}`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex flex-col">
                                                <h5 className="font-bold text-sm text-accent">{idea.title}</h5>
                                                {idea.status && idea.status !== 'PENDING' && (
                                                    <span className={`text-[8px] font-black uppercase tracking-widest mt-0.5 
                                                        ${idea.status === 'APPROVED' ? 'text-green-500' :
                                                            idea.status === 'DEVELOPMENT' ? 'text-blue-500' :
                                                            idea.status === 'NEEDS_IMPROVEMENT' ? 'text-yellow-500' : 'text-red-500'}
                                                    `}>
                                                        {idea.status.replace('_', ' ')}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-[10px] font-black bg-white/10 px-2 py-0.5 rounded text-gray-400 uppercase shrink-0">
                                                {idea.admin_score > 0 ? `Final: ${idea.admin_score}` : `Initial: ${idea.initial_score}`}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-400 line-clamp-2 mb-3">{idea.content}</p>
                                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                                            <span className="text-[9px] text-gray-500 font-bold uppercase">{new Date(idea.created_at).toLocaleDateString()}</span>
                                            <div className="flex items-center gap-3">
                                                {idea.is_featured === 1 && (
                                                    <span className="text-[9px] text-yellow-500 font-black uppercase flex items-center gap-1">
                                                        <Star className="w-2.5 h-2.5 fill-yellow-500" /> Featured
                                                    </span>
                                                )}
                                                <div className="flex gap-2">
                                                    {(idea.status === 'PENDING' || idea.status === 'NEEDS_IMPROVEMENT') && (
                                                        <button
                                                            onClick={() => handleEditIdea(idea)}
                                                            className="text-[9px] font-black text-accent hover:underline uppercase tracking-widest"
                                                        >
                                                            Edit
                                                        </button>
                                                    )}
                                                    {idea.status === 'PENDING' && (
                                                        <button
                                                            onClick={() => handleDeleteIdea(idea.id)}
                                                            className="text-[9px] font-black text-red-500 hover:underline uppercase tracking-widest"
                                                        >
                                                            Delete
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        {idea.feedback && (
                                            <div className="mt-3 p-2 bg-accent/5 rounded-lg border border-accent/10">
                                                <p className="text-[10px] text-gray-400 italic font-medium leading-relaxed">
                                                    "{idea.feedback}"
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center py-12 opacity-30">
                                    <Lightbulb className="w-12 h-12 mb-4" />
                                    <p className="text-xs font-bold uppercase tracking-widest">No ideas yet</p>
                                    <p className="text-[10px] mt-1">Start pitching to earn points!</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Recent Performance Section */}
            <section className="max-w-7xl mx-auto mt-12 mb-20">
                <div className="flex items-center justify-between mb-8 px-4 md:px-0">
                    <div>
                        <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter italic">Battle History</h3>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Your recent combat performance</p>
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent ml-8 hidden md:block" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 md:px-0">
                    {battleHistory.length > 0 ? (
                        battleHistory.map((h, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="glass-card p-6 border-white/5 relative overflow-hidden group"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                    {h.type === 'HUB' ? <Lightbulb className="w-12 h-12" /> : <Trophy className="w-12 h-12" />}
                                </div>
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest italic ${h.type === 'HUB' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-accent/20 text-accent'}`}>
                                        {h.type === 'HUB' ? 'Innovation' : (h.type || 'BATTLE')}
                                    </span>
                                    <span className="text-[10px] font-bold text-gray-500">{new Date(h.created_at).toLocaleDateString()}</span>
                                </div>
                                <h4 className="text-lg font-bold mb-4 line-clamp-1">{h.title}</h4>
                                <div className="flex items-center gap-6">
                                    <div>
                                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Score</p>
                                        <div className="flex items-center gap-1">
                                            <Zap className="w-3 h-3 text-accent fill-accent" />
                                            <span className="text-xl font-black">{h.score}</span>
                                        </div>
                                    </div>
                                    <div className="w-px h-8 bg-white/5" />
                                    <div>
                                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Points</p>
                                        <span className="text-xl font-black text-green-400">+{h.points || 0}</span>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <div className="col-span-full h-64 glass-card border-white/5 p-8 flex flex-col justify-center items-center opacity-30">
                            <BarChart3 className="w-12 h-12 text-gray-600 mb-4" />
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-2">No individual battles recorded yet</p>
                        </div>
                    )}
                </div>
            </section>
        </main >
    );
}
