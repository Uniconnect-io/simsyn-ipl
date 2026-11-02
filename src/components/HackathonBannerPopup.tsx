'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, ArrowRight, Sparkles, Trophy, Rocket, ShieldCheck, Lock, ExternalLink, Eye } from 'lucide-react';
import Link from 'next/link';

function formatMilestoneDate(isoString?: string): string {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
}

function formatDisplayDate(isoString?: string, options?: Intl.DateTimeFormatOptions): string {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', options || { month: 'short', day: 'numeric' });
}

function formatFullDate(isoString?: string): string {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatReviewRange(startIso?: string, endIso?: string): string {
    if (!startIso || !endIso) return 'NOV 3 - 7';
    const s = new Date(startIso);
    const e = new Date(endIso);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 'NOV 3 - 7';
    const sMonth = s.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const eMonth = e.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    if (sMonth === eMonth) {
        return `${sMonth} ${s.getDate()} - ${e.getDate()}`;
    }
    return `${sMonth} ${s.getDate()} - ${eMonth} ${e.getDate()}`;
}

export default function HackathonBannerPopup() {
    const [mounted, setMounted] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [dontShowAgain, setDontShowAgain] = useState(false);
    const [isBriefingUnlocked, setIsBriefingUnlocked] = useState(false);
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

    useEffect(() => {
        setMounted(true);
    }, []);

    // Lock page scroll when popup is open so it's strictly centered in viewport screen
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const [config, setConfig] = useState<any>(null);

    useEffect(() => {
        let isMounted = true;
        const fetchConfigAndInit = async () => {
            const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
            const hasPreviewParam = urlParams?.get('preview') === 'true' || urlParams?.get('preview') === 'full';
            const forceShowTeaser = urlParams?.get('show_teaser') === 'true';

            try {
                const res = await fetch(`/api/hackathon/config?_=${Date.now()}`);
                if (res.ok) {
                    const data = await res.json();
                    if (isMounted && data.config) {
                        setConfig(data.config);

                        const isPassed = data.computed?.is_submissions_open || hasPreviewParam;
                        setIsBriefingUnlocked(isPassed);

                        // Check if popup is enabled in admin config
                        if (data.config.teaser_popup_enabled === false && !forceShowTeaser) {
                            return; // Admin disabled popup
                        }

                        // Check local storage for dismissal
                        const dismissedUntil = localStorage.getItem('sipl_hackathon_popup_dismissed');
                        if (forceShowTeaser || !dismissedUntil || Date.now() > parseInt(dismissedUntil, 10)) {
                            const timer = setTimeout(() => {
                                setIsOpen(true);
                            }, 500);
                            return () => clearTimeout(timer);
                        }
                        return;
                    }
                }
            } catch (e) {
                console.error(e);
            }

            // Fallback if fetch fails
            const briefingTimestamp = new Date('2026-10-20T00:00:00').getTime();
            const isPassed = Date.now() >= briefingTimestamp || hasPreviewParam;
            setIsBriefingUnlocked(isPassed);

            const dismissedUntil = localStorage.getItem('sipl_hackathon_popup_dismissed');
            if (forceShowTeaser || !dismissedUntil || Date.now() > parseInt(dismissedUntil, 10)) {
                const timer = setTimeout(() => {
                    setIsOpen(true);
                }, 500);
                return () => clearTimeout(timer);
            }
        };

        fetchConfigAndInit();
        return () => { isMounted = false; };
    }, []);

    // Countdown logic
    useEffect(() => {
        const briefingTime = config?.briefing_date ? new Date(config.briefing_date).getTime() : new Date('2026-10-20T00:00:00Z').getTime();
        const deadlineTime = config?.submission_deadline ? new Date(config.submission_deadline).getTime() : new Date('2026-10-30T23:59:59Z').getTime();

        const targetDate = isBriefingUnlocked ? deadlineTime : briefingTime;

        const updateCountdown = () => {
            const now = Date.now();
            const difference = targetDate - now;

            if (difference > 0) {
                const days = Math.floor(difference / (1000 * 60 * 60 * 24));
                const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((difference % (1000 * 60)) / 1000);
                setTimeLeft({ days, hours, minutes, seconds });
            } else {
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
            }
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, [isBriefingUnlocked, config]);

    const handleClose = () => {
        if (dontShowAgain) {
            // Dismiss for 24 hours
            const expireTime = Date.now() + 24 * 60 * 60 * 1000;
            localStorage.setItem('sipl_hackathon_popup_dismissed', expireTime.toString());
        }
        setIsOpen(false);
    };

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div 
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
                    style={{ 
                        position: 'fixed', 
                        top: 0, 
                        left: 0, 
                        width: '100vw', 
                        height: '100vh',
                        margin: 0,
                        padding: '1.5rem',
                        boxSizing: 'border-box'
                    }}
                >
                    {/* Dark Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="fixed inset-0 bg-black/85 backdrop-blur-md"
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            width: '100vw',
                            height: '100vh',
                            margin: 0
                        }}
                    />

                    {/* Centered Modal Window */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 320 }}
                        className="relative w-full max-w-4xl max-h-[85vh] bg-gradient-to-b from-[#13141f] via-[#0d0e17] to-[#07070b] border border-white/20 rounded-3xl shadow-[0_0_90px_rgba(65,105,225,0.4)] overflow-hidden z-10 flex flex-col"
                    >
                        {/* Close Button */}
                        <button
                            onClick={handleClose}
                            className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-black/70 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all backdrop-blur-md group"
                            aria-label="Close dialog"
                        >
                            <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-12 overflow-y-auto custom-scrollbar flex-1">
                            {/* Poster Banner Column */}
                            <div className="md:col-span-5 relative bg-black flex flex-col items-center justify-center overflow-hidden min-h-[300px] md:min-h-full">
                                <img
                                    src="/assets/hackathon_banner_vertical.jpg"
                                    alt="SIPL x Uniconnect AI Hackathon 2026 - Something Big is Brewing"
                                    className="w-full h-full object-cover object-center"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/20 pointer-events-none" />
                                
                                <div className="absolute bottom-4 left-4 right-4 bg-black/75 backdrop-blur-md p-3 rounded-2xl border border-white/10 flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent shrink-0">
                                        <Trophy className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                                            {isBriefingUnlocked ? 'Grand Finale' : 'Watch This Space'}
                                        </p>
                                        <p className="text-xs font-black text-white">
                                            {isBriefingUnlocked 
                                                ? `${formatDisplayDate(config?.finale_date) || 'Nov 17'} • Live Uniconnect Demos` 
                                                : `Event Briefing • ${formatDisplayDate(config?.briefing_date) || 'Oct 20'}`}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Content Column */}
                            <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between">
                                <div>
                                    {/* Tag Badge */}
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-accent/20 text-accent border border-accent/40 shadow-[0_0_15px_rgba(65,105,225,0.3)]">
                                            <Sparkles className="w-3.5 h-3.5 animate-spin" />
                                            {isBriefingUnlocked ? 'Official Hackathon 2026' : `Exclusive Teaser • Revealing ${formatDisplayDate(config?.briefing_date) || 'Oct 20'}`}
                                        </span>
                                        <span className="text-[11px] text-gray-400 font-semibold flex items-center gap-1">
                                            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> Uniconnect AI
                                        </span>
                                    </div>

                                    {/* Headline */}
                                    <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase mb-2">
                                        {config?.teaser_headline ? (
                                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400">
                                                {config.teaser_headline}
                                            </span>
                                        ) : (
                                            <>
                                                Something Big <br />
                                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400">
                                                    Is Brewing.
                                                </span>
                                            </>
                                        )}
                                    </h2>

                                    <p className="text-gray-300 text-xs sm:text-sm leading-relaxed mb-6">
                                        {isBriefingUnlocked ? (
                                            <>
                                                Transform your boldest ideas into production-ready products on <strong className="text-white">Uniconnect</strong>. Submit your team's proposal, compete against top squads, and build live prototypes for the championship.
                                            </>
                                        ) : config?.teaser_description ? (
                                            config.teaser_description
                                        ) : (
                                            <>
                                                A revolutionary new challenge is coming to the <strong className="text-white">Simsyn Innovation Premier League</strong> in collaboration with <strong className="text-white">Uniconnect AI</strong>. Squads will go head-to-head to build, battle, and breakthrough.
                                            </>
                                        )}
                                    </p>

                                    {/* Teaser Mode vs Full Mode Display */}
                                    {!isBriefingUnlocked ? (
                                        /* TEASER MODE (Before Oct 20) */
                                        <div className="space-y-4 mb-6">
                                            {/* Locked Notice Card */}
                                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-8 h-8 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent shrink-0 mt-0.5">
                                                        <Lock className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xs font-black uppercase tracking-wider text-white mb-1">
                                                            Briefing & Challenge Reveal: October 20
                                                        </h4>
                                                        <p className="text-[11px] text-gray-300 leading-relaxed">
                                                            Full event rules, challenge tracks, evaluation rubrics, and the proposal submission portal will be officially unlocked on <strong>October 20, 2026</strong>.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Countdown to Oct 20 Briefing */}
                                            <div className="bg-black/60 border border-accent/30 rounded-2xl p-4 shadow-[0_0_30px_rgba(65,105,225,0.15)]">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="w-4 h-4 text-accent animate-pulse" />
                                                        <div>
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-accent">Countdown to Reveal</p>
                                                            <p className="text-xs font-bold text-white">Event Briefing: {formatDisplayDate(config?.briefing_date) || 'Oct 20'}</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-2 text-center">
                                                        {[
                                                            { label: 'Days', val: timeLeft.days },
                                                            { label: 'Hours', val: timeLeft.hours },
                                                            { label: 'Mins', val: timeLeft.minutes },
                                                            { label: 'Secs', val: timeLeft.seconds }
                                                        ].map((item, i) => (
                                                            <div key={i} className="bg-white/10 px-2 py-1 rounded-lg min-w-[44px]">
                                                                <span className="text-sm font-black text-white block">{item.val}</span>
                                                                <span className="text-[8px] text-gray-400 uppercase font-semibold">{item.label}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Teaser Pillars */}
                                            <div className="grid grid-cols-4 gap-2 text-center pt-2">
                                                {['IDEAS', 'BUILD', 'AI', 'COMPETE'].map((tag, i) => (
                                                    <div key={i} className="bg-white/5 py-1.5 px-2 rounded-xl border border-white/5 text-[10px] font-black tracking-widest text-gray-300 uppercase">
                                                        {tag}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        /* FULL OPEN MODE (After Oct 20) */
                                        <div className="space-y-4 mb-6">
                                            {/* Event Timeline Milestones */}
                                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-1.5">
                                                    <Calendar className="w-3.5 h-3.5 text-accent" /> Key Event Milestones
                                                </p>
                                                <div className="grid grid-cols-2 gap-2.5 text-xs">
                                                    <div className="bg-black/40 p-2.5 rounded-xl border border-white/5">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-[10px] font-bold text-accent">
                                                                {formatMilestoneDate(config?.briefing_date) || 'OCT 20'}
                                                            </span>
                                                            <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded font-semibold">Done</span>
                                                        </div>
                                                        <p className="font-bold text-white text-[11px]">Event Briefing</p>
                                                    </div>

                                                    <div className="bg-black/40 p-2.5 rounded-xl border border-accent/40 shadow-[0_0_15px_rgba(65,105,225,0.15)] relative">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-[10px] font-black text-accent">
                                                                {formatMilestoneDate(config?.submission_deadline) || 'OCT 30'}
                                                            </span>
                                                            <span className="text-[9px] bg-accent/30 text-white px-1.5 py-0.2 rounded font-bold animate-pulse">Open</span>
                                                        </div>
                                                        <p className="font-bold text-white text-[11px]">Proposals Close</p>
                                                    </div>

                                                    <div className="bg-black/40 p-2.5 rounded-xl border border-white/5">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-[10px] font-bold text-gray-400">
                                                                {formatReviewRange(config?.review_start_date, config?.review_end_date)}
                                                            </span>
                                                            <span className="text-[9px] bg-yellow-500/20 text-yellow-300 px-1.5 py-0.2 rounded font-semibold">Review</span>
                                                        </div>
                                                        <p className="font-bold text-white text-[11px]">Shortlisting</p>
                                                    </div>

                                                    <div className="bg-black/40 p-2.5 rounded-xl border border-white/5">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-[10px] font-bold text-green-400">
                                                                {formatMilestoneDate(config?.finale_date) || 'NOV 17'}
                                                            </span>
                                                            <span className="text-[9px] bg-green-500/20 text-green-300 px-1.5 py-0.2 rounded font-semibold">Finale</span>
                                                        </div>
                                                        <p className="font-bold text-white text-[11px]">Build & Live Demos</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Proposal Countdown */}
                                            <div className="flex items-center justify-between bg-black/60 border border-white/10 rounded-2xl px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4 text-accent animate-pulse" />
                                                    <div>
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Proposal Submission Deadline</p>
                                                        <p className="text-xs text-gray-200">Closes {formatFullDate(config?.submission_deadline) || 'Oct 30, 2026'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1.5 sm:gap-2 text-center">
                                                    <div className="bg-white/10 px-2 py-1 rounded-lg min-w-[38px]">
                                                        <span className="text-sm font-black text-white block">{timeLeft.days}</span>
                                                        <span className="text-[8px] text-gray-400 uppercase font-semibold">Days</span>
                                                    </div>
                                                    <div className="bg-white/10 px-2 py-1 rounded-lg min-w-[38px]">
                                                        <span className="text-sm font-black text-white block">{timeLeft.hours}</span>
                                                        <span className="text-[8px] text-gray-400 uppercase font-semibold">Hours</span>
                                                    </div>
                                                    <div className="bg-white/10 px-2 py-1 rounded-lg min-w-[38px]">
                                                        <span className="text-sm font-black text-white block">{timeLeft.minutes}</span>
                                                        <span className="text-[8px] text-gray-400 uppercase font-semibold">Mins</span>
                                                    </div>
                                                    <div className="bg-white/10 px-2 py-1 rounded-lg min-w-[38px]">
                                                        <span className="text-sm font-black text-white block">{timeLeft.seconds}</span>
                                                        <span className="text-[8px] text-gray-400 uppercase font-semibold">Secs</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Actions & Dismiss Footer */}
                                <div>
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        {isBriefingUnlocked ? (
                                            <Link
                                                href="/hackathon/submit"
                                                onClick={() => setIsOpen(false)}
                                                className="btn-primary flex-1 py-3.5 px-5 text-sm font-bold flex items-center justify-center gap-2 group shadow-[0_0_25px_rgba(65,105,225,0.5)]"
                                            >
                                                <Rocket className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                                                Submit Team Proposal
                                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                            </Link>
                                        ) : (
                                            <Link
                                                href="/hackathon"
                                                onClick={() => setIsOpen(false)}
                                                className="btn-primary flex-1 py-3.5 px-5 text-sm font-bold flex items-center justify-center gap-2 group shadow-[0_0_25px_rgba(65,105,225,0.5)] bg-gradient-to-r from-accent to-indigo-600"
                                            >
                                                <Sparkles className="w-4 h-4" />
                                                Explore Challenge Teaser
                                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                            </Link>
                                        )}

                                        <a
                                            href="https://uniconnect.ai"
                                            target="_blank"
                                            rel="noreferrer"
                                            className="bg-white/10 hover:bg-white/15 text-white border border-white/20 py-3.5 px-5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shrink-0"
                                        >
                                            Discover Uniconnect AI <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                                        </a>
                                    </div>

                                    {/* Footer Details & Dismiss Checkbox */}
                                    <div className="mt-4 flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-white/10">
                                        <label className="flex items-center gap-2 cursor-pointer select-none hover:text-gray-300">
                                            <input
                                                type="checkbox"
                                                checked={dontShowAgain}
                                                onChange={(e) => setDontShowAgain(e.target.checked)}
                                                className="rounded bg-black border-white/20 text-accent focus:ring-accent w-3.5 h-3.5"
                                            />
                                            <span>Don't show this announcement again today</span>
                                        </label>
                                        <button
                                            onClick={handleClose}
                                            className="text-gray-500 hover:text-white underline text-[11px]"
                                        >
                                            Dismiss
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}
