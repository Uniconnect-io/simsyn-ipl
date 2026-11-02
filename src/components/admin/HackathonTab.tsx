'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Rocket,
    Search,
    RefreshCw,
    Trophy,
    CheckCircle2,
    XCircle,
    Clock,
    AlertCircle,
    ExternalLink,
    Filter,
    FileSpreadsheet,
    Eye,
    Save,
    X,
    Cpu,
    Sparkles,
    Trash2,
    ChevronRight,
    Users,
    Sliders,
    Settings,
    Calendar,
    Lock,
    Unlock,
    Plus,
    ToggleLeft,
    ToggleRight,
    HelpCircle,
    Check
} from 'lucide-react';

interface HackathonProposal {
    id: string;
    team_id: string | null;
    owner_id: string | null;
    team_name: string;
    owner_name: string;
    contact_email?: string;
    title: string;
    track: string;
    problem_statement: string;
    proposed_solution: string;
    uniconnect_usage: string;
    impact_value?: string;
    tech_stack?: string;
    repo_or_demo_url?: string;
    team_members?: string[] | any;
    status: 'SUBMITTED' | 'UNDER_REVIEW' | 'SHORTLISTED' | 'REJECTED';
    score: number;
    score_breakdown?: {
        problem_clarity?: number;
        uniconnect_alignment?: number;
        technical_feasibility?: number;
        innovation?: number;
        demo_polish?: number;
    };
    admin_feedback?: string;
    reviewed_by?: string;
    reviewed_at?: string;
    created_at: string;
    updated_at: string;
}

interface HackathonConfig {
    id: string;
    briefing_date: string;
    submission_deadline: string;
    review_start_date: string;
    review_end_date: string;
    finale_date: string;
    submission_mode: 'AUTO_BY_DATE' | 'FORCE_OPEN' | 'FORCE_CLOSED';
    teaser_popup_enabled: boolean;
    results_published: boolean;
    event_title: string;
    event_subtitle: string;
    teaser_headline: string;
    teaser_description: string;
    meeting_url: string;
    tracks: string[];
    rubric: {
        problem_clarity: number;
        uniconnect_alignment: number;
        technical_feasibility: number;
        innovation: number;
        demo_polish: number;
    };
    max_team_size: number;
    uniconnect_docs_url: string;
}

const DEFAULT_CONFIG: HackathonConfig = {
    id: 'default',
    briefing_date: '2026-10-20T00:00:00.000Z',
    submission_deadline: '2026-10-30T23:59:59.000Z',
    review_start_date: '2026-11-03T00:00:00.000Z',
    review_end_date: '2026-11-07T23:59:59.000Z',
    finale_date: '2026-11-17T09:00:00.000Z',
    submission_mode: 'AUTO_BY_DATE',
    teaser_popup_enabled: true,
    results_published: false,
    event_title: 'SIPL × UNICONNECT AI HACKATHON 2026',
    event_subtitle: 'Simsyn Innovation Premier League 2026',
    teaser_headline: 'SOMETHING BIG IS BREWING.',
    teaser_description: 'A revolutionary new challenge is coming to the Simsyn Innovation Premier League in collaboration with Uniconnect AI. Squads will go head-to-head to build, battle, and breakthrough.',
    meeting_url: '',
    tracks: [
        'External Industry Solutions (Customer CX)',
        'Internal Cost & Efficiency (Operations)'
    ],
    rubric: {
        problem_clarity: 20,
        uniconnect_alignment: 25,
        technical_feasibility: 20,
        innovation: 20,
        demo_polish: 15
    },
    max_team_size: 4,
    uniconnect_docs_url: 'https://uniconnect.cx'
};

export default function HackathonTab() {
    // Sub tabs: 'proposals' | 'config'
    const [activeSubTab, setActiveSubTab] = useState<'proposals' | 'config'>('proposals');

    // Proposals State
    const [proposals, setProposals] = useState<HackathonProposal[]>([]);
    const [stats, setStats] = useState({ total: 0, submitted: 0, under_review: 0, shortlisted: 0, rejected: 0 });
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [trackFilter, setTrackFilter] = useState('ALL');

    // Review Modal State
    const [selectedProposal, setSelectedProposal] = useState<HackathonProposal | null>(null);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [savingReview, setSavingReview] = useState(false);

    // Review Form State
    const [reviewStatus, setReviewStatus] = useState<string>('SUBMITTED');
    const [adminFeedback, setAdminFeedback] = useState<string>('');
    const [scores, setScores] = useState({
        problem_clarity: 15,
        uniconnect_alignment: 20,
        technical_feasibility: 15,
        innovation: 15,
        demo_polish: 10
    });

    // Config State
    const [config, setConfig] = useState<HackathonConfig>(DEFAULT_CONFIG);
    const [loadingConfig, setLoadingConfig] = useState(false);
    const [savingConfig, setSavingConfig] = useState(false);
    const [configSavedSuccess, setConfigSavedSuccess] = useState(false);
    const [newTrackInput, setNewTrackInput] = useState('');

    const totalReviewScore = 
        (scores.problem_clarity || 0) +
        (scores.uniconnect_alignment || 0) +
        (scores.technical_feasibility || 0) +
        (scores.innovation || 0) +
        (scores.demo_polish || 0);

    const rubricWeightsTotal = 
        Number(config.rubric?.problem_clarity || 0) +
        Number(config.rubric?.uniconnect_alignment || 0) +
        Number(config.rubric?.technical_feasibility || 0) +
        Number(config.rubric?.innovation || 0) +
        Number(config.rubric?.demo_polish || 0);

    const fetchProposals = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchTerm) params.set('search', searchTerm);
            if (statusFilter !== 'ALL') params.set('status', statusFilter);
            if (trackFilter !== 'ALL') params.set('track', trackFilter);

            const res = await fetch(`/api/hackathon/proposals?${params.toString()}&_=${Date.now()}`);
            if (res.ok) {
                const data = await res.json();
                setProposals(data.proposals || []);
                if (data.stats) setStats(data.stats);
            }
        } catch (error) {
            console.error('Error loading hackathon proposals:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchConfig = async () => {
        setLoadingConfig(true);
        try {
            const res = await fetch(`/api/hackathon/config?_=${Date.now()}`);
            if (res.ok) {
                const data = await res.json();
                if (data.config) {
                    setConfig({
                        ...DEFAULT_CONFIG,
                        ...data.config,
                        tracks: Array.isArray(data.config.tracks) ? data.config.tracks : DEFAULT_CONFIG.tracks,
                        rubric: data.config.rubric || DEFAULT_CONFIG.rubric
                    });
                }
            }
        } catch (error) {
            console.error('Error loading hackathon config:', error);
        } finally {
            setLoadingConfig(false);
        }
    };

    useEffect(() => {
        fetchProposals();
        fetchConfig();
    }, [statusFilter, trackFilter]);

    const handleSaveConfig = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setSavingConfig(true);
        setConfigSavedSuccess(false);

        try {
            const res = await fetch('/api/hackathon/config', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });

            if (res.ok) {
                setConfigSavedSuccess(true);
                setTimeout(() => setConfigSavedSuccess(false), 3500);
                fetchConfig();
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to save hackathon configuration');
            }
        } catch (error) {
            console.error('Failed to save config:', error);
            alert('An error occurred while saving configuration');
        } finally {
            setSavingConfig(false);
        }
    };

    const handleAddTrack = () => {
        const trimmed = newTrackInput.trim();
        if (!trimmed) return;
        if (config.tracks.includes(trimmed)) {
            alert('Track already exists');
            return;
        }
        setConfig(prev => ({
            ...prev,
            tracks: [...prev.tracks, trimmed]
        }));
        setNewTrackInput('');
    };

    const handleRemoveTrack = (trackToRemove: string) => {
        if (config.tracks.length <= 1) {
            alert('Must have at least one track.');
            return;
        }
        setConfig(prev => ({
            ...prev,
            tracks: prev.tracks.filter(t => t !== trackToRemove)
        }));
    };

    const openReviewModal = (proposal: HackathonProposal) => {
        setSelectedProposal(proposal);
        setReviewStatus(proposal.status || 'SUBMITTED');
        setAdminFeedback(proposal.admin_feedback || '');

        const b = proposal.score_breakdown || {};
        setScores({
            problem_clarity: b.problem_clarity ?? 15,
            uniconnect_alignment: b.uniconnect_alignment ?? 20,
            technical_feasibility: b.technical_feasibility ?? 15,
            innovation: b.innovation ?? 15,
            demo_polish: b.demo_polish ?? 10
        });
        setIsReviewModalOpen(true);
    };

    const handleSaveReview = async () => {
        if (!selectedProposal) return;
        setSavingReview(true);

        try {
            const res = await fetch('/api/hackathon/proposals', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: selectedProposal.id,
                    status: reviewStatus,
                    score: totalReviewScore,
                    score_breakdown: scores,
                    admin_feedback: adminFeedback
                })
            });

            if (res.ok) {
                setIsReviewModalOpen(false);
                fetchProposals();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to update proposal review');
            }
        } catch (err) {
            console.error(err);
            alert('Error updating review');
        } finally {
            setSavingReview(false);
        }
    };

    const handleQuickStatus = async (proposalId: string, newStatus: string) => {
        try {
            const res = await fetch('/api/hackathon/proposals', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: proposalId,
                    status: newStatus
                })
            });
            if (res.ok) {
                fetchProposals();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (proposalId: string) => {
        if (!confirm('Are you sure you want to permanently delete this proposal?')) return;
        try {
            const res = await fetch(`/api/hackathon/proposals?id=${proposalId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                fetchProposals();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const exportToCSV = (onlyShortlisted: boolean = false) => {
        const list = onlyShortlisted ? proposals.filter(p => p.status === 'SHORTLISTED') : proposals;
        if (list.length === 0) {
            alert('No proposals available to export.');
            return;
        }

        const headers = ['Team Name', 'Owner / Lead', 'Title', 'Track', 'Status', 'Score', 'Uniconnect Usage', 'Problem Statement', 'Solution', 'Submitted At'];
        const rows = list.map(p => [
            `"${(p.team_name || '').replace(/"/g, '""')}"`,
            `"${(p.owner_name || '').replace(/"/g, '""')}"`,
            `"${(p.title || '').replace(/"/g, '""')}"`,
            `"${(p.track || '').replace(/"/g, '""')}"`,
            p.status,
            p.score || 0,
            `"${(p.uniconnect_usage || '').replace(/"/g, '""')}"`,
            `"${(p.problem_statement || '').replace(/"/g, '""')}"`,
            `"${(p.proposed_solution || '').replace(/"/g, '""')}"`,
            p.created_at
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', onlyShortlisted ? 'sipl_hackathon_shortlist.csv' : 'sipl_hackathon_all_proposals.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Helper: format ISO date to datetime-local input format (YYYY-MM-DDTHH:MM)
    const toInputDateTime = (isoString?: string) => {
        if (!isoString) return '';
        try {
            const d = new Date(isoString);
            if (isNaN(d.getTime())) return '';
            const pad = (n: number) => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        } catch {
            return '';
        }
    };

    // Helper: format datetime-local input to ISO string
    const fromInputDateTime = (localString: string) => {
        if (!localString) return '';
        try {
            const d = new Date(localString);
            return isNaN(d.getTime()) ? '' : d.toISOString();
        } catch {
            return '';
        }
    };

    // Helper: format ISO date to short display label (e.g. OCT 30, NOV 1)
    const formatMilestoneLabel = (isoString?: string, fallback: string = '') => {
        if (!isoString) return fallback;
        try {
            const d = new Date(isoString);
            if (isNaN(d.getTime())) return fallback;
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
        } catch {
            return fallback;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header & Sub-Tab Switcher */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-black/40 border border-white/10 p-6 rounded-3xl backdrop-blur-md">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Rocket className="w-5 h-5 text-accent" />
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">
                            Hackathon Operations & Control Console
                        </h2>
                    </div>
                    <p className="text-xs text-gray-400">
                        Manage SIPL × Uniconnect AI Hackathon event configurations, timeline dates, and review team submissions.
                    </p>
                </div>

                {/* Sub Tab Buttons */}
                <div className="flex items-center gap-2 bg-black/60 p-1.5 rounded-2xl border border-white/10">
                    <button
                        onClick={() => setActiveSubTab('proposals')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                            activeSubTab === 'proposals'
                                ? 'bg-accent text-white shadow-lg'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        Proposals ({stats.total})
                    </button>
                    <button
                        onClick={() => setActiveSubTab('config')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                            activeSubTab === 'config'
                                ? 'bg-accent text-white shadow-lg'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <Settings className="w-4 h-4" />
                        Event Configuration
                    </button>
                </div>
            </div>

            {/* Quick Live Preview Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-white/[0.03] border border-white/5 rounded-2xl text-xs">
                <div className="flex items-center gap-3">
                    <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Quick Access:</span>
                    <a
                        href="/hackathon"
                        target="_blank"
                        rel="noreferrer"
                        className="text-gray-300 hover:text-accent font-semibold flex items-center gap-1 transition-colors"
                    >
                        Public Event Hub <ExternalLink className="w-3 h-3" />
                    </a>
                    <span className="text-gray-600">•</span>
                    <a
                        href="/hackathon/submit"
                        target="_blank"
                        rel="noreferrer"
                        className="text-gray-300 hover:text-accent font-semibold flex items-center gap-1 transition-colors"
                    >
                        Submission Form <ExternalLink className="w-3 h-3" />
                    </a>
                    <span className="text-gray-600">•</span>
                    <a
                        href="/?show_teaser=true"
                        target="_blank"
                        rel="noreferrer"
                        className="text-gray-300 hover:text-accent font-semibold flex items-center gap-1 transition-colors"
                    >
                        Landing Popup Teaser <ExternalLink className="w-3 h-3" />
                    </a>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-gray-500">Submission Mode:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase ${
                        config.submission_mode === 'FORCE_OPEN'
                            ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                            : config.submission_mode === 'FORCE_CLOSED'
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    }`}>
                        {config.submission_mode === 'AUTO_BY_DATE' ? `Auto (${formatMilestoneLabel(config.briefing_date, 'Oct 20')} Briefing)` : config.submission_mode}
                    </span>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* SUBTAB 1: EVENT CONFIGURATION & TIMELINE                                  */}
            {/* ========================================================================= */}
            {activeSubTab === 'config' && (
                <div className="space-y-6">
                    {/* Save Banner */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-accent/10 via-purple-500/10 to-transparent border border-accent/30">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                                <Settings className="w-5 h-5 text-accent" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white">Event Timeline & Rules Management</h3>
                                <p className="text-xs text-gray-400">
                                    Updates here take immediate effect across the landing teaser popup, event hub, and submission portal.
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            disabled={savingConfig}
                            onClick={() => handleSaveConfig()}
                            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-accent hover:bg-accent/80 text-white font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-accent/20"
                        >
                            {savingConfig ? (
                                <>
                                    <Sparkles className="w-4 h-4 animate-spin" /> Saving...
                                </>
                            ) : configSavedSuccess ? (
                                <>
                                    <Check className="w-4 h-4 text-green-300" /> Saved Successfully!
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" /> Save Configuration
                                </>
                            )}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* 1. Milestone Timeline Dates */}
                        <div className="glass-card p-6 border border-white/10 rounded-2xl space-y-4">
                            <div className="flex items-center gap-2 pb-3 border-b border-white/5">
                                <Calendar className="w-4 h-4 text-accent" />
                                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                                    Milestones & Key Event Deadlines
                                </h4>
                            </div>

                            <div className="space-y-4 text-xs">
                                <div>
                                    <label className="block text-gray-400 font-bold uppercase text-[10px] mb-1">
                                        {formatMilestoneLabel(config.briefing_date, 'OCT 20')} — Briefing & Challenge Reveal Date
                                    </label>
                                    <p className="text-[11px] text-gray-500 mb-1.5">
                                        The countdown timer in Teaser mode counts down to this moment. Proposal submission opens once this passes.
                                    </p>
                                    <input
                                        type="datetime-local"
                                        value={toInputDateTime(config.briefing_date)}
                                        onChange={e => setConfig(prev => ({ ...prev, briefing_date: fromInputDateTime(e.target.value) }))}
                                        className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-accent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-400 font-bold uppercase text-[10px] mb-1">
                                        {formatMilestoneLabel(config.submission_deadline, 'OCT 30')} — Proposal Submission Deadline
                                    </label>
                                    <p className="text-[11px] text-gray-500 mb-1.5">
                                        After this timestamp, teams cannot submit new proposals unless submission mode is forced open.
                                    </p>
                                    <input
                                        type="datetime-local"
                                        value={toInputDateTime(config.submission_deadline)}
                                        onChange={e => setConfig(prev => ({ ...prev, submission_deadline: fromInputDateTime(e.target.value) }))}
                                        className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-accent"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-gray-400 font-bold uppercase text-[10px] mb-1">
                                            {formatMilestoneLabel(config.review_start_date, 'NOV 3')} — Review Window Start
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={toInputDateTime(config.review_start_date)}
                                            onChange={e => setConfig(prev => ({ ...prev, review_start_date: fromInputDateTime(e.target.value) }))}
                                            className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-accent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-400 font-bold uppercase text-[10px] mb-1">
                                            {formatMilestoneLabel(config.review_end_date, 'NOV 7')} — Shortlist Announcement
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={toInputDateTime(config.review_end_date)}
                                            onChange={e => setConfig(prev => ({ ...prev, review_end_date: fromInputDateTime(e.target.value) }))}
                                            className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-accent"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-gray-400 font-bold uppercase text-[10px] mb-1">
                                        {formatMilestoneLabel(config.finale_date, 'NOV 17')} — Grand Finale Build & Demo Day
                                    </label>
                                    <p className="text-[11px] text-gray-500 mb-1.5">
                                        Live build day where shortlisted teams install Uniconnect, build working prototypes, and demo to judges.
                                    </p>
                                    <input
                                        type="datetime-local"
                                        value={toInputDateTime(config.finale_date)}
                                        onChange={e => setConfig(prev => ({ ...prev, finale_date: fromInputDateTime(e.target.value) }))}
                                        className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-accent"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 2. Access Gate & Phase Controls */}
                        <div className="glass-card p-6 border border-white/10 rounded-2xl space-y-4">
                            <div className="flex items-center gap-2 pb-3 border-b border-white/5">
                                <Sliders className="w-4 h-4 text-accent" />
                                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                                    Gates & Phase Controls
                                </h4>
                            </div>

                            <div className="space-y-5 text-xs">
                                {/* Submission Mode Selector */}
                                <div>
                                    <label className="block text-gray-400 font-bold uppercase text-[10px] mb-2">
                                        Proposal Submission Gate Mode
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setConfig(prev => ({ ...prev, submission_mode: 'AUTO_BY_DATE' }))}
                                            className={`p-3 rounded-xl border text-left transition-all ${
                                                config.submission_mode === 'AUTO_BY_DATE'
                                                    ? 'bg-blue-500/20 border-blue-500 text-white'
                                                    : 'bg-black/40 border-white/10 text-gray-400 hover:border-white/20'
                                            }`}
                                        >
                                            <div className="font-bold flex items-center gap-1.5 mb-1">
                                                <Clock className="w-3.5 h-3.5 text-blue-400" /> Auto by Date
                                            </div>
                                            <p className="text-[10px] text-gray-400">Locked until {formatMilestoneLabel(config.briefing_date, 'Oct 20')} briefing</p>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setConfig(prev => ({ ...prev, submission_mode: 'FORCE_OPEN' }))}
                                            className={`p-3 rounded-xl border text-left transition-all ${
                                                config.submission_mode === 'FORCE_OPEN'
                                                    ? 'bg-green-500/20 border-green-500 text-white'
                                                    : 'bg-black/40 border-white/10 text-gray-400 hover:border-white/20'
                                            }`}
                                        >
                                            <div className="font-bold flex items-center gap-1.5 mb-1">
                                                <Unlock className="w-3.5 h-3.5 text-green-400" /> Force Open
                                            </div>
                                            <p className="text-[10px] text-gray-400">Unlock immediately for test</p>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setConfig(prev => ({ ...prev, submission_mode: 'FORCE_CLOSED' }))}
                                            className={`p-3 rounded-xl border text-left transition-all ${
                                                config.submission_mode === 'FORCE_CLOSED'
                                                    ? 'bg-red-500/20 border-red-500 text-white'
                                                    : 'bg-black/40 border-white/10 text-gray-400 hover:border-white/20'
                                            }`}
                                        >
                                            <div className="font-bold flex items-center gap-1.5 mb-1">
                                                <Lock className="w-3.5 h-3.5 text-red-400" /> Force Closed
                                            </div>
                                            <p className="text-[10px] text-gray-400">Freeze all submissions</p>
                                        </button>
                                    </div>
                                </div>

                                {/* Teaser Modal Toggle */}
                                <div className="flex items-center justify-between p-3.5 bg-black/40 rounded-xl border border-white/10">
                                    <div>
                                        <div className="font-bold text-white flex items-center gap-2">
                                            Landing Page Teaser Modal
                                        </div>
                                        <p className="text-[11px] text-gray-400 mt-0.5">
                                            Controls if the popup automatically appears to users on the homepage.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setConfig(prev => ({ ...prev, teaser_popup_enabled: !prev.teaser_popup_enabled }))}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            config.teaser_popup_enabled
                                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                                : 'bg-white/10 text-gray-400 border border-white/10'
                                        }`}
                                    >
                                        {config.teaser_popup_enabled ? 'Active / Visible' : 'Disabled'}
                                    </button>
                                </div>

                                {/* Results Visibility Toggle */}
                                <div className="flex items-center justify-between p-3.5 bg-black/40 rounded-xl border border-white/10">
                                    <div>
                                        <div className="font-bold text-white flex items-center gap-2">
                                            Public Finalists & Results Display
                                        </div>
                                        <p className="text-[11px] text-gray-400 mt-0.5">
                                            Show shortlisted teams on the public `/hackathon` showcase section.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setConfig(prev => ({ ...prev, results_published: !prev.results_published }))}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            config.results_published
                                                ? 'bg-accent/20 text-accent border border-accent/30'
                                                : 'bg-white/10 text-gray-400 border border-white/10'
                                        }`}
                                    >
                                        {config.results_published ? 'Published' : 'Hidden (Draft)'}
                                    </button>
                                </div>

                                {/* Max Team Size & Meeting Link */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                    <div>
                                        <label className="block text-gray-400 font-bold uppercase text-[10px] mb-1">
                                            Max Team Members
                                        </label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={10}
                                            value={config.max_team_size || 4}
                                            onChange={e => setConfig(prev => ({ ...prev, max_team_size: parseInt(e.target.value, 10) || 4 }))}
                                            className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-accent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-400 font-bold uppercase text-[10px] mb-1">
                                            Uniconnect Docs / Portal URL
                                        </label>
                                        <input
                                            type="url"
                                            value={config.uniconnect_docs_url || ''}
                                            onChange={e => setConfig(prev => ({ ...prev, uniconnect_docs_url: e.target.value }))}
                                            placeholder="https://uniconnect.cx"
                                            className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-accent"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Event Challenge Tracks */}
                        <div className="glass-card p-6 border border-white/10 rounded-2xl space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-white/5">
                                <div className="flex items-center gap-2">
                                    <Cpu className="w-4 h-4 text-accent" />
                                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                                        Challenge Tracks ({config.tracks?.length || 0})
                                    </h4>
                                </div>
                            </div>

                            <p className="text-xs text-gray-400">
                                Categories that team owners can select from when proposing high-level Uniconnect AI solutions.
                            </p>

                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newTrackInput}
                                        onChange={e => setNewTrackInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTrack())}
                                        placeholder="Add new hackathon track (e.g. Multi-agent Workflows)..."
                                        className="flex-1 bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-accent"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddTrack}
                                        className="bg-accent hover:bg-accent/80 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add
                                    </button>
                                </div>

                                <div className="flex flex-wrap gap-2 pt-2">
                                    {(config.tracks || []).map((t, idx) => (
                                        <span
                                            key={idx}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-gray-200"
                                        >
                                            {t}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveTrack(t)}
                                                className="text-gray-500 hover:text-red-400 transition-colors"
                                                title="Remove Track"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* 4. 100-Point Evaluation Rubric Weights */}
                        <div className="glass-card p-6 border border-white/10 rounded-2xl space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-white/5">
                                <div className="flex items-center gap-2">
                                    <Trophy className="w-4 h-4 text-accent" />
                                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                                        Evaluation Rubric Weights
                                    </h4>
                                </div>
                                <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                                    rubricWeightsTotal === 100 
                                        ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                                        : 'bg-red-500/20 text-red-300 border border-red-500/30'
                                }`}>
                                    Total: {rubricWeightsTotal} / 100 pts
                                </span>
                            </div>

                            <p className="text-xs text-gray-400">
                                High-level proposal evaluation criteria. Configures the scoring scale when evaluating proposals.
                            </p>

                            <div className="space-y-3 text-xs">
                                <div className="flex items-center justify-between gap-4 p-2.5 bg-black/40 rounded-xl border border-white/5">
                                    <div>
                                        <div className="font-bold text-white">Problem Clarity & Business Value</div>
                                        <div className="text-[10px] text-gray-400">Clear problem description and practical relevance</div>
                                    </div>
                                    <input
                                        type="number"
                                        min={0}
                                        max={50}
                                        value={config.rubric?.problem_clarity || 20}
                                        onChange={e => setConfig(prev => ({ ...prev, rubric: { ...prev.rubric, problem_clarity: parseInt(e.target.value, 10) || 0 } }))}
                                        className="w-20 bg-black/60 border border-white/10 rounded-lg p-2 text-right text-white font-mono focus:border-accent"
                                    />
                                </div>

                                <div className="flex items-center justify-between gap-4 p-2.5 bg-black/40 rounded-xl border border-white/5">
                                    <div>
                                        <div className="font-bold text-accent">Uniconnect AI Alignment</div>
                                        <div className="text-[10px] text-gray-400">Effective adoption of Uniconnect capabilities & APIs</div>
                                    </div>
                                    <input
                                        type="number"
                                        min={0}
                                        max={50}
                                        value={config.rubric?.uniconnect_alignment || 25}
                                        onChange={e => setConfig(prev => ({ ...prev, rubric: { ...prev.rubric, uniconnect_alignment: parseInt(e.target.value, 10) || 0 } }))}
                                        className="w-20 bg-black/60 border border-white/10 rounded-lg p-2 text-right text-white font-mono focus:border-accent"
                                    />
                                </div>

                                <div className="flex items-center justify-between gap-4 p-2.5 bg-black/40 rounded-xl border border-white/5">
                                    <div>
                                        <div className="font-bold text-white">Feasibility & Approach</div>
                                        <div className="text-[10px] text-gray-400">Viability of building a working demo on {formatMilestoneLabel(config.finale_date, 'Nov 17')}</div>
                                    </div>
                                    <input
                                        type="number"
                                        min={0}
                                        max={50}
                                        value={config.rubric?.technical_feasibility || 20}
                                        onChange={e => setConfig(prev => ({ ...prev, rubric: { ...prev.rubric, technical_feasibility: parseInt(e.target.value, 10) || 0 } }))}
                                        className="w-20 bg-black/60 border border-white/10 rounded-lg p-2 text-right text-white font-mono focus:border-accent"
                                    />
                                </div>

                                <div className="flex items-center justify-between gap-4 p-2.5 bg-black/40 rounded-xl border border-white/5">
                                    <div>
                                        <div className="font-bold text-white">Innovation & Originality</div>
                                        <div className="text-[10px] text-gray-400">Novel perspective and creative differentiation</div>
                                    </div>
                                    <input
                                        type="number"
                                        min={0}
                                        max={50}
                                        value={config.rubric?.innovation || 20}
                                        onChange={e => setConfig(prev => ({ ...prev, rubric: { ...prev.rubric, innovation: parseInt(e.target.value, 10) || 0 } }))}
                                        className="w-20 bg-black/60 border border-white/10 rounded-lg p-2 text-right text-white font-mono focus:border-accent"
                                    />
                                </div>

                                <div className="flex items-center justify-between gap-4 p-2.5 bg-black/40 rounded-xl border border-white/5">
                                    <div>
                                        <div className="font-bold text-white">Pitch, Presentation & Demo Polish</div>
                                        <div className="text-[10px] text-gray-400">Demo presentation execution readiness</div>
                                    </div>
                                    <input
                                        type="number"
                                        min={0}
                                        max={50}
                                        value={config.rubric?.demo_polish || 15}
                                        onChange={e => setConfig(prev => ({ ...prev, rubric: { ...prev.rubric, demo_polish: parseInt(e.target.value, 10) || 0 } }))}
                                        className="w-20 bg-black/60 border border-white/10 rounded-lg p-2 text-right text-white font-mono focus:border-accent"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 5. Teaser & Briefing Content Copy */}
                        <div className="lg:col-span-2 glass-card p-6 border border-white/10 rounded-2xl space-y-4">
                            <div className="flex items-center gap-2 pb-3 border-b border-white/5">
                                <Sparkles className="w-4 h-4 text-accent" />
                                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                                    Event Branding, Briefing Link & Teaser Copy
                                </h4>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                <div>
                                    <label className="block text-gray-400 font-bold uppercase text-[10px] mb-1">
                                        Event Title
                                    </label>
                                    <input
                                        type="text"
                                        value={config.event_title || ''}
                                        onChange={e => setConfig(prev => ({ ...prev, event_title: e.target.value }))}
                                        className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-accent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-400 font-bold uppercase text-[10px] mb-1">
                                        Briefing Meeting Link / Location (MS Teams / Auditorium)
                                    </label>
                                    <input
                                        type="text"
                                        value={config.meeting_url || ''}
                                        onChange={e => setConfig(prev => ({ ...prev, meeting_url: e.target.value }))}
                                        placeholder="https://teams.microsoft.com/l/meetup-join/..."
                                        className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-accent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-400 font-bold uppercase text-[10px] mb-1">
                                        Teaser Modal Headline
                                    </label>
                                    <input
                                        type="text"
                                        value={config.teaser_headline || ''}
                                        onChange={e => setConfig(prev => ({ ...prev, teaser_headline: e.target.value }))}
                                        className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-accent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-400 font-bold uppercase text-[10px] mb-1">
                                        Teaser Modal Description
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={config.teaser_description || ''}
                                        onChange={e => setConfig(prev => ({ ...prev, teaser_description: e.target.value }))}
                                        className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-accent"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end pt-3">
                                <button
                                    type="button"
                                    disabled={savingConfig}
                                    onClick={() => handleSaveConfig()}
                                    className="px-6 py-3 rounded-xl bg-accent hover:bg-accent/80 text-white font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2"
                                >
                                    {savingConfig ? <Sparkles className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save All Hackathon Configuration
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* SUBTAB 2: PROPOSALS REVIEW & SHORTLIST                                    */}
            {/* ========================================================================= */}
            {activeSubTab === 'proposals' && (
                <div className="space-y-6">
                    {/* Action Bar */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={() => exportToCSV(false)}
                                className="bg-white/10 hover:bg-white/20 text-white text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 font-bold transition-all border border-white/10"
                            >
                                <FileSpreadsheet className="w-3.5 h-3.5 text-green-400" /> Export CSV
                            </button>
                            <button
                                onClick={() => exportToCSV(true)}
                                className="bg-green-500/20 hover:bg-green-500/30 text-green-300 text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 font-bold transition-all border border-green-500/30"
                            >
                                <Trophy className="w-3.5 h-3.5 text-green-400" /> Export Shortlisted
                            </button>
                            <button
                                onClick={fetchProposals}
                                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-gray-400 hover:text-white transition-all"
                                title="Refresh"
                            >
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>

                    {/* Metrics Chips */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <div
                            onClick={() => setStatusFilter('ALL')}
                            className={`glass-card p-4 border cursor-pointer transition-all ${statusFilter === 'ALL' ? 'border-accent ring-1 ring-accent' : 'border-white/10 hover:border-white/20'}`}
                        >
                            <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Total Proposals</span>
                            <span className="text-2xl font-black text-white">{stats.total}</span>
                        </div>

                        <div
                            onClick={() => setStatusFilter('SUBMITTED')}
                            className={`glass-card p-4 border cursor-pointer transition-all ${statusFilter === 'SUBMITTED' ? 'border-blue-500 ring-1 ring-blue-500' : 'border-white/10 hover:border-white/20'}`}
                        >
                            <span className="text-[10px] uppercase font-bold text-blue-400 block mb-1">Pending Review</span>
                            <span className="text-2xl font-black text-blue-300">{stats.submitted}</span>
                        </div>

                        <div
                            onClick={() => setStatusFilter('UNDER_REVIEW')}
                            className={`glass-card p-4 border cursor-pointer transition-all ${statusFilter === 'UNDER_REVIEW' ? 'border-yellow-500 ring-1 ring-yellow-500' : 'border-white/10 hover:border-white/20'}`}
                        >
                            <span className="text-[10px] uppercase font-bold text-yellow-400 block mb-1">In Review</span>
                            <span className="text-2xl font-black text-yellow-300">{stats.under_review}</span>
                        </div>

                        <div
                            onClick={() => setStatusFilter('SHORTLISTED')}
                            className={`glass-card p-4 border cursor-pointer transition-all ${statusFilter === 'SHORTLISTED' ? 'border-green-500 ring-1 ring-green-500' : 'border-white/10 hover:border-white/20'}`}
                        >
                            <span className="text-[10px] uppercase font-bold text-green-400 block mb-1">Shortlisted ({formatMilestoneLabel(config.finale_date, 'Nov 17')})</span>
                            <span className="text-2xl font-black text-green-300">{stats.shortlisted}</span>
                        </div>

                        <div
                            onClick={() => setStatusFilter('REJECTED')}
                            className={`glass-card p-4 border cursor-pointer transition-all ${statusFilter === 'REJECTED' ? 'border-red-500 ring-1 ring-red-500' : 'border-white/10 hover:border-white/20'}`}
                        >
                            <span className="text-[10px] uppercase font-bold text-red-400 block mb-1">Rejected</span>
                            <span className="text-2xl font-black text-red-300">{stats.rejected}</span>
                        </div>
                    </div>

                    {/* Search & Filters */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by team, title, or problem statement..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && fetchProposals()}
                                className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent"
                            />
                        </div>

                        <div className="flex gap-2">
                            <select
                                value={trackFilter}
                                onChange={(e) => setTrackFilter(e.target.value)}
                                className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accent"
                            >
                                <option value="ALL">All Tracks</option>
                                {(config.tracks || []).map((t, i) => (
                                    <option key={i} value={t}>{t}</option>
                                ))}
                            </select>

                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accent"
                            >
                                <option value="ALL">All Statuses</option>
                                <option value="SUBMITTED">Submitted</option>
                                <option value="UNDER_REVIEW">Under Review</option>
                                <option value="SHORTLISTED">Shortlisted</option>
                                <option value="REJECTED">Rejected</option>
                            </select>
                        </div>
                    </div>

                    {/* Proposals Table */}
                    <div className="glass-card border border-white/10 rounded-2xl overflow-hidden">
                        {loading ? (
                            <div className="p-12 text-center text-gray-400 text-xs">
                                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-accent" />
                                Loading proposals...
                            </div>
                        ) : proposals.length === 0 ? (
                            <div className="p-12 text-center text-gray-400 text-xs">
                                No proposals found matching your criteria.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-white/5 border-b border-white/10 text-gray-400 text-[10px] uppercase tracking-wider font-bold">
                                        <tr>
                                            <th className="p-4">Team & Owner</th>
                                            <th className="p-4">Proposal Concept</th>
                                            <th className="p-4">Track</th>
                                            <th className="p-4">Status</th>
                                            <th className="p-4 text-center">Score</th>
                                            <th className="p-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {proposals.map((p) => {
                                            const statusColors: Record<string, string> = {
                                                SUBMITTED: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
                                                UNDER_REVIEW: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
                                                SHORTLISTED: 'bg-green-500/20 text-green-300 border-green-500/30',
                                                REJECTED: 'bg-red-500/20 text-red-300 border-red-500/30'
                                            };

                                            return (
                                                <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                                                    <td className="p-4">
                                                        <div className="font-bold text-white text-sm">{p.team_name}</div>
                                                        <div className="text-[11px] text-gray-400 flex items-center gap-1.5 mt-0.5">
                                                            <Users className="w-3 h-3" />
                                                            {p.owner_name}
                                                        </div>
                                                        {p.contact_email && (
                                                            <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                                                                {p.contact_email}
                                                            </div>
                                                        )}
                                                    </td>

                                                    <td className="p-4 max-w-md">
                                                        <div className="font-bold text-white text-xs mb-1 line-clamp-1">{p.title}</div>
                                                        <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
                                                            {p.problem_statement}
                                                        </p>
                                                    </td>

                                                    <td className="p-4 whitespace-nowrap">
                                                        <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-gray-300">
                                                            {p.track}
                                                        </span>
                                                    </td>

                                                    <td className="p-4 whitespace-nowrap">
                                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${statusColors[p.status] || 'bg-gray-500/20 text-gray-300'}`}>
                                                            {p.status.replace('_', ' ')}
                                                        </span>
                                                    </td>

                                                    <td className="p-4 text-center whitespace-nowrap">
                                                        <span className={`font-mono font-black text-sm ${p.score >= 75 ? 'text-green-400' : p.score >= 50 ? 'text-yellow-400' : 'text-gray-400'}`}>
                                                            {p.score || 0}
                                                        </span>
                                                        <span className="text-[10px] text-gray-500 block">/ 100</span>
                                                    </td>

                                                    <td className="p-4 text-right whitespace-nowrap">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button
                                                                onClick={() => openReviewModal(p)}
                                                                className="px-3 py-1.5 bg-accent/20 hover:bg-accent text-accent hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 border border-accent/30"
                                                            >
                                                                <Eye className="w-3.5 h-3.5" /> Evaluate
                                                            </button>

                                                            {p.status !== 'SHORTLISTED' && (
                                                                <button
                                                                    onClick={() => handleQuickStatus(p.id, 'SHORTLISTED')}
                                                                    className="p-1.5 hover:bg-green-500/20 text-gray-400 hover:text-green-400 rounded-lg transition-all"
                                                                    title="Quick Shortlist"
                                                                >
                                                                    <Trophy className="w-4 h-4" />
                                                                </button>
                                                            )}

                                                            <button
                                                                onClick={() => handleDelete(p.id)}
                                                                className="p-1.5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-lg transition-all"
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* EVALUATION / REVIEW MODAL                                                 */}
            {/* ========================================================================= */}
            <AnimatePresence>
                {isReviewModalOpen && selectedProposal && (
                    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-[#0c0d12] border border-white/20 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b border-white/10 flex items-center justify-between">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-accent block">
                                        Proposal Evaluation
                                    </span>
                                    <h3 className="text-xl font-black text-white">{selectedProposal.title}</h3>
                                    <div className="text-xs text-gray-400 flex items-center gap-2 mt-1">
                                        <span>Team: <strong>{selectedProposal.team_name}</strong></span>
                                        <span>•</span>
                                        <span>Lead: <strong>{selectedProposal.owner_name}</strong></span>
                                        <span>•</span>
                                        <span className="text-accent">{selectedProposal.track}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsReviewModalOpen(false)}
                                    className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar text-xs">
                                {/* Proposal Details Card */}
                                <div className="space-y-4 bg-white/5 border border-white/10 p-5 rounded-2xl">
                                    <div>
                                        <h4 className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">
                                            Problem Statement
                                        </h4>
                                        <p className="text-gray-200 leading-relaxed whitespace-pre-line">
                                            {selectedProposal.problem_statement}
                                        </p>
                                    </div>

                                    <div>
                                        <h4 className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">
                                            Proposed Solution (High-Level Idea)
                                        </h4>
                                        <p className="text-gray-200 leading-relaxed whitespace-pre-line">
                                            {selectedProposal.proposed_solution}
                                        </p>
                                    </div>

                                    <div className="p-3 bg-accent/10 border border-accent/20 rounded-xl">
                                        <h4 className="text-[10px] font-black uppercase tracking-wider text-accent mb-1 flex items-center gap-1.5">
                                            <Cpu className="w-3.5 h-3.5" /> How Uniconnect AI Will Be Used
                                        </h4>
                                        <p className="text-gray-200 leading-relaxed whitespace-pre-line">
                                            {selectedProposal.uniconnect_usage}
                                        </p>
                                    </div>

                                    {selectedProposal.impact_value && (
                                        <div>
                                            <h4 className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">
                                                Expected Impact & Value
                                            </h4>
                                            <p className="text-gray-300 leading-relaxed">
                                                {selectedProposal.impact_value}
                                            </p>
                                        </div>
                                    )}

                                    {selectedProposal.repo_or_demo_url && (
                                        <div>
                                            <h4 className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">
                                                Reference / Mockup Link
                                            </h4>
                                            <a
                                                href={selectedProposal.repo_or_demo_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-accent underline flex items-center gap-1"
                                            >
                                                {selectedProposal.repo_or_demo_url} <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </div>
                                    )}
                                </div>

                                {/* Scoring Rubric */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                                            <Trophy className="w-4 h-4 text-accent" />
                                            100-Point Scoring Rubric
                                        </h4>
                                        <div className="text-right">
                                            <span className="text-xs text-gray-400">Total Score: </span>
                                            <span className={`text-xl font-black font-mono ${totalReviewScore >= 75 ? 'text-green-400' : 'text-accent'}`}>
                                                {totalReviewScore} / 100
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-3 bg-black/40 p-4 rounded-2xl border border-white/10">
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-gray-300">Problem Clarity & Scope</span>
                                                <span className="font-bold text-white">{scores.problem_clarity} / {config.rubric?.problem_clarity || 20} pts</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max={config.rubric?.problem_clarity || 20}
                                                value={scores.problem_clarity}
                                                onChange={e => setScores({ ...scores, problem_clarity: Number(e.target.value) })}
                                                className="w-full accent-accent cursor-pointer"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-accent font-bold">Uniconnect AI Alignment</span>
                                                <span className="font-bold text-accent">{scores.uniconnect_alignment} / {config.rubric?.uniconnect_alignment || 25} pts</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max={config.rubric?.uniconnect_alignment || 25}
                                                value={scores.uniconnect_alignment}
                                                onChange={e => setScores({ ...scores, uniconnect_alignment: Number(e.target.value) })}
                                                className="w-full accent-accent cursor-pointer"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-gray-300">Approach & Feasibility</span>
                                                <span className="font-bold text-white">{scores.technical_feasibility} / {config.rubric?.technical_feasibility || 20} pts</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max={config.rubric?.technical_feasibility || 20}
                                                value={scores.technical_feasibility}
                                                onChange={e => setScores({ ...scores, technical_feasibility: Number(e.target.value) })}
                                                className="w-full accent-accent cursor-pointer"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-gray-300">Innovation & Originality</span>
                                                <span className="font-bold text-white">{scores.innovation} / {config.rubric?.innovation || 20} pts</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max={config.rubric?.innovation || 20}
                                                value={scores.innovation}
                                                onChange={e => setScores({ ...scores, innovation: Number(e.target.value) })}
                                                className="w-full accent-accent cursor-pointer"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-gray-300">Pitch & Demo Polish</span>
                                                <span className="font-bold text-white">{scores.demo_polish} / {config.rubric?.demo_polish || 15} pts</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max={config.rubric?.demo_polish || 15}
                                                value={scores.demo_polish}
                                                onChange={e => setScores({ ...scores, demo_polish: Number(e.target.value) })}
                                                className="w-full accent-accent cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Status & Feedback */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">
                                            Evaluation Status
                                        </label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {(['SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'REJECTED'] as const).map(st => (
                                                <button
                                                    key={st}
                                                    type="button"
                                                    onClick={() => setReviewStatus(st)}
                                                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                                                        reviewStatus === st
                                                            ? st === 'SHORTLISTED'
                                                                ? 'bg-green-500/20 text-green-300 border-green-500'
                                                                : st === 'REJECTED'
                                                                ? 'bg-red-500/20 text-red-300 border-red-500'
                                                                : 'bg-accent/20 text-accent border-accent'
                                                            : 'bg-black/40 text-gray-400 border-white/10 hover:border-white/20'
                                                    }`}
                                                >
                                                    {st.replace('_', ' ')}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">
                                            Council Feedback & Recommendations
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={adminFeedback}
                                            onChange={e => setAdminFeedback(e.target.value)}
                                            placeholder="Provide notes, guidance on Uniconnect integration, or feedback for the team..."
                                            className="w-full bg-black/60 border border-white/10 rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-accent custom-scrollbar"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 border-t border-white/10 bg-black/40 flex items-center justify-between">
                                <span className="text-xs text-gray-400">
                                    Reviewing as <strong>Admin</strong>
                                </span>

                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsReviewModalOpen(false)}
                                        className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        disabled={savingReview}
                                        onClick={handleSaveReview}
                                        className="btn-primary py-2.5 px-6 rounded-xl text-xs font-bold flex items-center gap-2"
                                    >
                                        {savingReview ? (
                                            <>
                                                <Sparkles className="w-3.5 h-3.5 animate-spin" /> Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="w-3.5 h-3.5" /> Save Evaluation
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
