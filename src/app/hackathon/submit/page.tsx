'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Rocket,
    CheckCircle2,
    AlertCircle,
    Info,
    ArrowLeft,
    Sparkles,
    Shield,
    Users,
    FileText,
    Cpu,
    ExternalLink,
    Clock,
    Edit3,
    Trophy,
    Lock,
    Eye,
    Building2,
    Briefcase
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function formatMilestoneDate(isoString?: string): string {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatReviewRange(startIso?: string, endIso?: string): string {
    if (!startIso || !endIso) return 'Nov 3 – 7, 2026';
    const s = new Date(startIso);
    const e = new Date(endIso);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 'Nov 3 – 7, 2026';
    const sMonth = s.toLocaleDateString('en-US', { month: 'short' });
    const eMonth = e.toLocaleDateString('en-US', { month: 'short' });
    if (sMonth === eMonth) {
        return `${sMonth} ${s.getDate()} – ${e.getDate()}`;
    }
    return `${sMonth} ${s.getDate()} – ${eMonth} ${e.getDate()}`;
}

const DEFAULT_TRACKS = [
    'External Industry Solutions (Customer CX)',
    'Internal Cost & Efficiency (Operations)'
];

export default function SubmitProposalPage() {
    const router = useRouter();

    const [user, setUser] = useState<any>(null);
    const [teams, setTeams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [adminOverride, setAdminOverride] = useState(false);
    const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    const [config, setConfig] = useState<any>(null);

    // Team and Owner State (Derived automatically from user/owner details)
    const [teamId, setTeamId] = useState('');
    const [teamName, setTeamName] = useState('');
    const [ownerName, setOwnerName] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [teamMembers, setTeamMembers] = useState<string[]>([]);

    // Form State (Simplified strictly to high-level concept)
    const [title, setTitle] = useState('');
    const [track, setTrack] = useState(DEFAULT_TRACKS[0]);
    const [problemStatement, setProblemStatement] = useState('');
    const [proposedSolution, setProposedSolution] = useState('');
    const [uniconnectUsage, setUniconnectUsage] = useState('');
    const [impactValue, setImpactValue] = useState('');

    // Existing team proposals
    const [myProposals, setMyProposals] = useState<any[]>([]);
    const [editingProposalId, setEditingProposalId] = useState<string | null>(null);

    useEffect(() => {
        const briefingTimestamp = new Date('2026-10-20T00:00:00Z').getTime();
        const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const hasPreviewParam = urlParams?.get('preview') === 'true';

        const updateCountdown = () => {
            const now = new Date().getTime();
            const bTime = config?.briefing_date ? new Date(config.briefing_date).getTime() : briefingTimestamp;
            const dTime = config?.submission_deadline ? new Date(config.submission_deadline).getTime() : new Date('2026-10-30T23:59:59Z').getTime();
            const diff = bTime - now;

            if (diff > 0) {
                setCountdown({
                    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
                    seconds: Math.floor((diff % (1000 * 60)) / 1000)
                });
            } else {
                if (config?.submission_mode === 'FORCE_CLOSED') {
                    setIsUnlocked(false);
                } else if (config?.submission_mode === 'FORCE_OPEN' || now <= dTime) {
                    setIsUnlocked(true);
                }
            }
        };

        const init = async () => {
            try {
                // Fetch dynamic hackathon config to check unlock status
                try {
                    const cfgRes = await fetch('/api/hackathon/config?_=' + Date.now(), { cache: 'no-store' });
                    if (cfgRes.ok) {
                        const cfgData = await cfgRes.json();
                        if (cfgData.config) {
                            setConfig(cfgData.config);
                            if (Array.isArray(cfgData.config.tracks) && cfgData.config.tracks.length > 0) {
                                setTrack(cfgData.config.tracks[0]);
                            }
                        }
                        if (cfgData.computed?.is_submissions_open || hasPreviewParam) {
                            setIsUnlocked(true);
                        } else if (cfgData.config?.submission_mode === 'FORCE_CLOSED') {
                            setIsUnlocked(false);
                        }
                    }
                } catch (e) {
                    if (Date.now() >= briefingTimestamp || hasPreviewParam) {
                        setIsUnlocked(true);
                    }
                }

                // Fetch User
                const meRes = await fetch('/api/auth/me?_=' + Date.now(), { cache: 'no-store' });
                const meData = await meRes.json();
                let currentUser = meData.user || null;
                if (currentUser) {
                    setUser(currentUser);
                    setOwnerName(currentUser.name || '');
                    if (currentUser.email) setContactEmail(currentUser.email);
                    if (currentUser.team_id) setTeamId(currentUser.team_id);
                }

                // Fetch Teams & determine squad membership automatically
                const teamsRes = await fetch('/api/teams?_=' + Date.now(), { cache: 'no-store' });
                const teamsData = await teamsRes.json();
                if (Array.isArray(teamsData)) {
                    setTeams(teamsData);

                    let matchedTeam: any = null;
                    if (currentUser?.team_id) {
                        matchedTeam = teamsData.find(t => t.id === currentUser.team_id);
                    } else if (currentUser?.id) {
                        matchedTeam = teamsData.find(t => t.captain?.id === currentUser.id || t.owner_id === currentUser.id);
                    }

                    // If admin and no team assigned yet, default to first team
                    if (!matchedTeam && currentUser?.role === 'ADMIN' && teamsData.length > 0) {
                        matchedTeam = teamsData[0];
                    }

                    if (matchedTeam) {
                        setTeamId(matchedTeam.id);
                        setTeamName(matchedTeam.name);
                        if (!currentUser?.name && matchedTeam.captain?.name) {
                            setOwnerName(matchedTeam.captain.name);
                        }

                        // Populate ALL team members by default
                        const members: string[] = [];
                        if (matchedTeam.captain?.name) members.push(matchedTeam.captain.name);
                        if (Array.isArray(matchedTeam.players)) {
                            matchedTeam.players.forEach((p: any) => {
                                if (p.name && !members.includes(p.name)) members.push(p.name);
                            });
                        }
                        setTeamMembers(members);
                    }
                }

                // Pre-populate form fields from URL parameters if provided (e.g. from idea blueprints)
                if (urlParams) {
                    const qTitle = urlParams.get('title');
                    if (qTitle) setTitle(qTitle);
                    const qTrack = urlParams.get('track');
                    if (qTrack) setTrack(qTrack);
                    const qProblem = urlParams.get('problem');
                    if (qProblem) setProblemStatement(qProblem);
                    const qSolution = urlParams.get('solution');
                    if (qSolution) setProposedSolution(qSolution);
                    const qUsage = urlParams.get('usage');
                    if (qUsage) setUniconnectUsage(qUsage);
                    const qImpact = urlParams.get('impact');
                    if (qImpact) setImpactValue(qImpact);
                }

                // Fetch existing proposals
                fetchMyProposals();

            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        init();
        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, []);

    const fetchMyProposals = async () => {
        try {
            const res = await fetch('/api/hackathon/proposals?scope=my&_=' + Date.now(), { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                if (data.proposals) {
                    setMyProposals(data.proposals);
                }
            }
        } catch (e) {
            console.error('Failed to load existing proposals', e);
        }
    };

    const handleSelectTeam = (id: string) => {
        setTeamId(id);
        const selected = teams.find(t => t.id === id);
        if (selected) {
            setTeamName(selected.name);
            const members: string[] = [];
            if (selected.captain?.name) members.push(selected.captain.name);
            if (Array.isArray(selected.players)) {
                selected.players.forEach((p: any) => {
                    if (p.name && !members.includes(p.name)) members.push(p.name);
                });
            }
            setTeamMembers(members);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage('');
        setSuccessMessage('');

        if (!title.trim() || !problemStatement.trim() || !proposedSolution.trim() || !uniconnectUsage.trim() || !impactValue.trim()) {
            setErrorMessage('Please fill in all mandatory fields: Proposal Title, Problem Statement, Proposed Solution, How Uniconnect Will Be Used, and Expected Value / Impact.');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                id: editingProposalId || undefined,
                title: title.trim(),
                track: track || config?.tracks?.[0] || DEFAULT_TRACKS[0],
                problem_statement: problemStatement.trim(),
                proposed_solution: proposedSolution.trim(),
                uniconnect_usage: uniconnectUsage.trim(),
                impact_value: impactValue.trim(),
                team_id: teamId || null,
                team_name: teamName || (user?.teamName || 'Your Squad'),
                owner_id: user?.id || null,
                owner_name: ownerName || user?.name || 'Team Lead',
                contact_email: contactEmail.trim(),
                team_members: teamMembers
            };

            const method = editingProposalId ? 'PATCH' : 'POST';
            const res = await fetch('/api/hackathon/proposals', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to submit proposal');
            }

            setSuccessMessage(editingProposalId ? 'Proposal successfully updated!' : 'Proposal successfully submitted for SIPL Hackathon 2026!');
            setEditingProposalId(null);
            resetForm();
            fetchMyProposals();

            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });

        } catch (err: any) {
            setErrorMessage(err.message || 'An error occurred during submission.');
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setTitle('');
        setTrack(config?.tracks?.[0] || DEFAULT_TRACKS[0]);
        setProblemStatement('');
        setProposedSolution('');
        setUniconnectUsage('');
        setImpactValue('');
        setEditingProposalId(null);
    };

    const startEditing = (prop: any) => {
        setEditingProposalId(prop.id);
        setTitle(prop.title || '');
        setTrack(prop.track || config?.tracks?.[0] || DEFAULT_TRACKS[0]);
        setProblemStatement(prop.problem_statement || '');
        setProposedSolution(prop.proposed_solution || '');
        setUniconnectUsage(prop.uniconnect_usage || '');
        setImpactValue(prop.impact_value || '');
        window.scrollTo({ top: 300, behavior: 'smooth' });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#07070a] flex items-center justify-center text-white">
                <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-accent animate-spin" />
                    <span>Loading Hackathon Proposal Portal...</span>
                </div>
            </div>
        );
    }

    if (!isUnlocked && !adminOverride) {
        return (
            <main className="min-h-screen bg-[#07070a] text-white selection:bg-accent selection:text-white pb-24 flex flex-col">
                {/* Top Bar */}
                <nav className="w-full border-b border-white/10 bg-black/40 backdrop-blur-md sticky top-0 z-40">
                    <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                        <Link href="/hackathon" className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition-colors">
                            <ArrowLeft className="w-4 h-4" /> Back to Hackathon Teaser
                        </Link>
                        {user?.role === 'ADMIN' && (
                            <button
                                onClick={() => setAdminOverride(true)}
                                className="text-yellow-400 hover:text-yellow-300 text-xs font-bold flex items-center gap-1.5"
                            >
                                <Eye className="w-3.5 h-3.5" /> Admin: Unlock Form Preview
                            </button>
                        )}
                    </div>
                </nav>

                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="glass-card max-w-xl w-full p-8 sm:p-12 border-accent/40 bg-gradient-to-b from-[#131422] via-[#0d0e17] to-[#07070b] text-center shadow-[0_0_80px_rgba(65,105,225,0.25)] relative overflow-hidden">
                        <div className="w-16 h-16 rounded-3xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent mx-auto mb-6 shadow-[0_0_30px_rgba(65,105,225,0.4)]">
                            <Lock className="w-8 h-8 animate-pulse" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent block mb-2">Portal Locked</span>
                        <h2 className="text-2xl sm:text-3xl font-black uppercase text-white mb-3">
                            {config?.submission_mode === 'FORCE_CLOSED'
                                ? 'Submissions Currently Closed'
                                : `Submissions Unlock ${formatMilestoneDate(config?.briefing_date || '2026-10-20T00:00:00Z')}`}
                        </h2>
                        <p className="text-gray-300 text-xs sm:text-sm leading-relaxed max-w-md mx-auto mb-8">
                            {config?.submission_mode === 'FORCE_CLOSED' ? (
                                'The proposal submission portal has been closed by event administration.'
                            ) : (
                                <>
                                    The proposal submission portal will officially open following the <strong className="text-white">SIPL Hackathon Event Briefing</strong> on {formatMilestoneDate(config?.briefing_date || '2026-10-20T00:00:00Z')}. Teams will have until {formatMilestoneDate(config?.submission_deadline || '2026-10-30T23:59:59Z')} to submit their solutions.
                                </>
                            )}
                        </p>

                        {/* Countdown Grid */}
                        <div className="grid grid-cols-4 gap-2 max-w-xs mx-auto mb-8">
                            {[
                                { label: 'DAYS', val: countdown.days },
                                { label: 'HOURS', val: countdown.hours },
                                { label: 'MINUTES', val: countdown.minutes },
                                { label: 'SECONDS', val: countdown.seconds }
                            ].map((unit, idx) => (
                                <div key={idx} className="bg-black/60 border border-white/10 rounded-2xl p-3">
                                    <span className="text-xl sm:text-2xl font-black text-white block font-mono">{unit.val}</span>
                                    <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">{unit.label}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                            <Link
                                href="/hackathon"
                                className="btn-primary py-3 px-6 text-xs font-bold flex items-center gap-2 shadow-lg"
                            >
                                <Sparkles className="w-4 h-4" /> View Hackathon Teaser
                            </Link>
                            <a
                                href="https://uniconnect.ai"
                                target="_blank"
                                rel="noreferrer"
                                className="bg-white/10 hover:bg-white/15 text-white py-3 px-6 rounded-xl text-xs font-bold border border-white/10 transition-all flex items-center gap-1.5"
                            >
                                Discover Uniconnect AI <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                            </a>
                        </div>

                        {user?.role === 'ADMIN' && (
                            <div className="mt-8 pt-6 border-t border-white/10">
                                <button
                                    onClick={() => setAdminOverride(true)}
                                    className="text-yellow-400 hover:text-yellow-300 text-xs font-bold underline flex items-center justify-center gap-1.5 mx-auto"
                                >
                                    <Eye className="w-3.5 h-3.5" /> Admin Override: Preview & Test Submission Form
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#07070a] text-white selection:bg-accent selection:text-white pb-24">
            {/* Top Bar */}
            <nav className="w-full border-b border-white/10 bg-black/40 backdrop-blur-md sticky top-0 z-40">
                <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/hackathon" className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Back to Hackathon Details
                    </Link>

                    <div className="flex items-center gap-3 text-xs">
                        {user ? (
                            <span className="text-gray-400">
                                Submitting as <strong className="text-white">{user.name}</strong> ({user.role})
                            </span>
                        ) : (
                            <Link href="/owner/login" className="text-accent underline font-bold">
                                Log in as Owner
                            </Link>
                        )}
                    </div>
                </div>
            </nav>

            <div className="max-w-5xl mx-auto px-6 pt-10">
                {/* Header */}
                <div className="mb-8 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6 pb-8 border-b border-white/10">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 border border-accent/40 text-accent text-[11px] font-black uppercase tracking-wider mb-3">
                            <Rocket className="w-3.5 h-3.5" /> Team Proposal Submission
                        </div>
                        <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight">
                            Pitch Your Hackathon Concept
                        </h1>
                        <p className="text-gray-400 text-sm mt-2 max-w-xl">
                            Proposals close on <strong className="text-white">{formatMilestoneDate(config?.submission_deadline || '2026-10-30T23:59:59Z')}</strong>. Teams can submit multiple proposals (a max of 3 will be approved for Demo Day, earning <strong className="text-accent">+5 SIPL Leaderboard points</strong> each).
                        </p>
                    </div>

                    <div className="bg-black/60 border border-white/10 rounded-2xl p-4 text-center shrink-0 min-w-[200px]">
                        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Submission Status</span>
                        <span className="text-xs font-black text-green-400 flex items-center justify-center gap-1.5 mt-1">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Portal Open
                        </span>
                        <span className="text-[10px] text-gray-400 block mt-1">
                            Review: {formatReviewRange(config?.review_start_date, config?.review_end_date)}
                        </span>
                    </div>
                </div>

                {/* Success Alert */}
                {successMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-green-500/15 border border-green-500/30 text-green-300 p-5 rounded-2xl mb-8 flex items-start gap-3"
                    >
                        <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-bold text-sm text-white mb-1">{successMessage}</h4>
                            <p className="text-xs text-gray-300">
                                Your proposal has been received by the Technical Council. Shortlisted finalists will be announced on {formatMilestoneDate(config?.review_end_date || '2026-11-07T23:59:59Z')} for the live build phase on {formatMilestoneDate(config?.finale_date || '2026-11-17T09:00:00Z')}.
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* Error Alert */}
                {errorMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-500/15 border border-red-500/30 text-red-300 p-5 rounded-2xl mb-8 flex items-start gap-3"
                    >
                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-bold text-sm text-white mb-1">Submission Error</h4>
                            <p className="text-xs text-gray-300">{errorMessage}</p>
                        </div>
                    </motion.div>
                )}

                {/* Existing Submissions Showcase (if any) */}
                {myProposals.length > 0 && (
                    <div className="mb-10">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold uppercase tracking-tight flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-accent" /> Your Team's Submissions ({myProposals.length})
                            </h2>
                            {editingProposalId && (
                                <button
                                    onClick={resetForm}
                                    className="text-xs text-gray-400 hover:text-white underline"
                                >
                                    Cancel Editing & Create New
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {myProposals.map((prop) => (
                                <div
                                    key={prop.id}
                                    className={`glass-card p-5 border transition-all ${prop.id === editingProposalId ? 'border-accent ring-1 ring-accent' : 'border-white/10'}`}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                            prop.status === 'SHORTLISTED'
                                                ? 'bg-green-500/20 text-green-300 border border-green-500/40'
                                                : prop.status === 'REJECTED'
                                                ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                                                : 'bg-accent/20 text-accent border border-accent/40'
                                        }`}>
                                            {prop.status}
                                        </span>
                                        <span className="text-[11px] text-gray-400 font-bold">{prop.team_name}</span>
                                    </div>

                                    <h3 className="text-base font-bold text-white mb-2">{prop.title}</h3>
                                    <p className="text-xs text-gray-400 line-clamp-2 mb-4 leading-relaxed">
                                        {prop.problem_statement}
                                    </p>

                                    {prop.admin_feedback && (
                                        <div className="bg-black/50 p-3 rounded-xl border border-white/5 mb-4 text-xs">
                                            <p className="text-[10px] uppercase font-bold text-accent mb-1">Admin Feedback:</p>
                                            <p className="text-gray-300 italic">"{prop.admin_feedback}"</p>
                                            {prop.score > 0 && (
                                                <p className="text-[10px] font-black text-white mt-2">
                                                    Score: <span className="text-accent">{prop.score} / 100</span>
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-white/5">
                                        <span>Submitted {new Date(prop.created_at).toLocaleDateString()}</span>
                                        {prop.status !== 'SHORTLISTED' && (
                                            <button
                                                onClick={() => startEditing(prop)}
                                                className="text-accent hover:underline font-bold flex items-center gap-1"
                                            >
                                                <Edit3 className="w-3.5 h-3.5" /> Edit Proposal
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Team Squad Context Banner (Spacious & Clean Layout) */}
                <div className="bg-black/40 border border-white/10 rounded-3xl p-6 sm:p-7 mb-8 space-y-4 shadow-xl backdrop-blur-md">
                    {/* Top Tier: Team Identity & Lead */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent shrink-0 shadow-lg shadow-accent/10">
                                <Shield className="w-6 h-6" />
                            </div>
                            <div>
                                <span className="text-[10px] uppercase font-black tracking-widest text-accent block mb-0.5">
                                    Submitting Squad
                                </span>
                                <div className="flex flex-wrap items-center gap-3">
                                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight whitespace-nowrap">
                                        {teamName || 'Your Squad'}
                                    </h2>
                                    <span className="inline-flex items-center gap-1.5 text-xs text-gray-300 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                                        Lead: <strong className="text-white font-bold">{ownerName || user?.name || 'Owner'}</strong>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {user?.role === 'ADMIN' && teams.length > 0 && (
                            <div className="flex items-center gap-2.5 self-start sm:self-auto bg-yellow-500/10 border border-yellow-500/20 px-3.5 py-2 rounded-2xl">
                                <span className="text-[10px] text-yellow-400 font-black uppercase tracking-wider">Switch Team:</span>
                                <select
                                    value={teamId}
                                    onChange={(e) => handleSelectTeam(e.target.value)}
                                    className="bg-black/80 border border-yellow-500/40 rounded-xl px-3 py-1 text-xs text-white focus:outline-none focus:border-yellow-400 font-bold"
                                >
                                    {teams.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Bottom Tier: Squad Roster */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
                        <div className="flex items-center gap-1.5 text-gray-400 text-xs font-bold shrink-0">
                            <Users className="w-4 h-4 text-accent" />
                            <span className="text-[11px] uppercase tracking-wider">Squad Members (By Default):</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {teamMembers.length > 0 ? (
                                teamMembers.map((m, idx) => (
                                    <span
                                        key={idx}
                                        className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-200 text-xs font-semibold transition-all shadow-sm"
                                    >
                                        {m}
                                    </span>
                                ))
                            ) : (
                                <span className="text-xs text-gray-500 italic">All squad players included automatically</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Proposal Submission Form */}
                <form onSubmit={handleSubmit} className="glass-card p-6 sm:p-10 border-white/10 relative">
                    <div className="flex items-center justify-between pb-6 mb-8 border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white">
                                    {editingProposalId ? 'Edit Hackathon Proposal' : 'High-Level Concept Proposal'}
                                </h3>
                                <p className="text-xs text-gray-400">Complete the 5 high-level sections below. No complex architecture diagrams required.</p>
                            </div>
                        </div>

                        {editingProposalId && (
                            <span className="text-xs bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full font-bold border border-yellow-500/30">
                                Editing Mode
                            </span>
                        )}
                    </div>

                    <div className="space-y-8">
                        {/* 1. Proposal Title (Full Width) */}
                        <div>
                            <label className="block text-xs uppercase font-bold text-gray-400 mb-2">
                                Proposal Title <span className="text-accent">*</span>
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. OmniVoice AI: Real-Time Self-Healing IVR & Voice Agent Gateway"
                                className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-accent font-medium placeholder-gray-600"
                            />
                        </div>

                        {/* Track Selection */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-xs uppercase font-bold text-gray-400">
                                    Challenge Track <span className="text-accent">*</span>
                                </label>
                                <span className="text-[10px] text-gray-500">Select Track</span>
                            </div>

                            {/* Dual selector pills */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const ext = (config?.tracks || DEFAULT_TRACKS).find((t: string) => t.toLowerCase().includes('external')) || DEFAULT_TRACKS[0];
                                        setTrack(ext);
                                    }}
                                    className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                                        track.toLowerCase().includes('external')
                                            ? 'bg-accent/20 border-accent text-white shadow-[0_0_20px_rgba(65,105,225,0.25)] ring-1 ring-accent'
                                            : 'bg-black/40 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <Building2 className={`w-4 h-4 shrink-0 ${track.toLowerCase().includes('external') ? 'text-accent' : 'text-gray-500'}`} />
                                        <span className="text-xs font-bold truncate">External Industry Solutions</span>
                                    </div>
                                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-black/40 border border-white/10 text-accent shrink-0">
                                        Customer CX
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        const int = (config?.tracks || DEFAULT_TRACKS).find((t: string) => t.toLowerCase().includes('internal')) || DEFAULT_TRACKS[1];
                                        setTrack(int);
                                    }}
                                    className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                                        track.toLowerCase().includes('internal')
                                            ? 'bg-accent/20 border-accent text-white shadow-[0_0_20px_rgba(65,105,225,0.25)] ring-1 ring-accent'
                                            : 'bg-black/40 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <Briefcase className={`w-4 h-4 shrink-0 ${track.toLowerCase().includes('internal') ? 'text-accent' : 'text-gray-500'}`} />
                                        <span className="text-xs font-bold truncate">Internal Cost & Efficiency</span>
                                    </div>
                                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-black/40 border border-white/10 text-cyan-400 shrink-0">
                                        Operations
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* 2. The Problem Statement (Full Width) */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs uppercase font-bold text-gray-400 flex items-center gap-1.5">
                                    1. The Problem Statement <span className="text-accent">*</span>
                                </label>
                                <span className="text-[10px] text-gray-500">What customer or business friction are you addressing?</span>
                            </div>
                            <textarea
                                rows={4}
                                value={problemStatement}
                                onChange={(e) => setProblemStatement(e.target.value)}
                                placeholder="Describe the problem, pain point, or inefficiency you want to solve. Who experiences this problem and why does it matter?"
                                className="w-full bg-black/60 border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-accent leading-relaxed custom-scrollbar placeholder-gray-600"
                            />
                        </div>

                        {/* 3. Proposed Solution (High-Level Idea) (Full Width) */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs uppercase font-bold text-gray-400 flex items-center gap-1.5">
                                    2. Proposed Solution (High-Level Idea) <span className="text-accent">*</span>
                                </label>
                                <span className="text-[10px] text-accent font-semibold">High-level concept only — no detailed architecture required</span>
                            </div>
                            <textarea
                                rows={4}
                                value={proposedSolution}
                                onChange={(e) => setProposedSolution(e.target.value)}
                                placeholder="Summarize your high-level idea: what is your proposed solution, what will it do, and how will it improve the customer or agent experience?"
                                className="w-full bg-black/60 border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-accent leading-relaxed custom-scrollbar placeholder-gray-600"
                            />
                        </div>

                        {/* 4. How Uniconnect Will Be Used (High-Level Overview) (Full Width) */}
                        <div className="bg-accent/5 border border-accent/20 rounded-2xl p-5">
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs uppercase font-bold text-accent flex items-center gap-1.5">
                                    <Cpu className="w-4 h-4" /> 3. How Uniconnect Will Be Used (High-Level) <span className="text-accent">*</span>
                                </label>
                                <span className="text-[10px] text-gray-400">High-level fit only</span>
                            </div>
                            <p className="text-xs text-gray-300 mb-3">
                                Give a high-level explanation of how Uniconnect fits into your idea (e.g. using Uniconnect Voice Agents, Chat Assistants, Telephony events, CRM records, or automation tools). <em>Detailed architectural diagrams or low-level technical specs are not required at this proposal stage.</em>
                            </p>
                            <textarea
                                rows={3}
                                value={uniconnectUsage}
                                onChange={(e) => setUniconnectUsage(e.target.value)}
                                placeholder="High-level idea: e.g. We plan to use Uniconnect AI Voice Agents to automatically answer after-hours inquiries and create follow-up tickets in the Uniconnect CRM."
                                className="w-full bg-black/70 border border-accent/40 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-accent leading-relaxed custom-scrollbar placeholder-gray-500"
                            />
                        </div>

                        {/* 5. Expected Value / Business Impact (Mandatory, Full Width Box) */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs uppercase font-bold text-gray-400 flex items-center gap-1.5">
                                    4. Expected Value / Business Impact <span className="text-accent">*</span>
                                </label>
                                <span className="text-[10px] text-accent font-semibold">Mandatory</span>
                            </div>
                            <textarea
                                rows={3}
                                value={impactValue}
                                onChange={(e) => setImpactValue(e.target.value)}
                                placeholder="Describe the expected business or operational value (e.g. 50% faster first-call resolution, 24/7 automated triage, agent workload reduction, or higher CSAT)."
                                className="w-full bg-black/60 border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-accent leading-relaxed custom-scrollbar placeholder-gray-600"
                            />
                        </div>
                    </div>

                    {/* Submit Actions */}
                    <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Info className="w-4 h-4 text-accent shrink-0" />
                            <span>Proposals can be edited until the submission window closes on {formatMilestoneDate(config?.submission_deadline) || 'Oct 30, 2026'}.</span>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            {editingProposalId && (
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="bg-white/10 hover:bg-white/20 text-white px-5 py-3 rounded-xl text-xs font-bold transition-all"
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={submitting}
                                className="btn-primary flex-1 sm:flex-initial py-3.5 px-8 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-accent/20"
                            >
                                {submitting ? (
                                    <>
                                        <Sparkles className="w-4 h-4 animate-spin" /> Submitting...
                                    </>
                                ) : (
                                    <>
                                        <Rocket className="w-4 h-4" /> {editingProposalId ? 'Update Proposal' : 'Submit Hackathon Proposal'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </main>
    );
}
