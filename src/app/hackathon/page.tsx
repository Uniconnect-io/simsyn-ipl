'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Calendar,
    Clock,
    Trophy,
    Rocket,
    Code,
    Sparkles,
    Shield,
    Users,
    CheckCircle2,
    ArrowRight,
    Lightbulb,
    Cpu,
    Bot,
    PhoneCall,
    BarChart3,
    Layers,
    ExternalLink,
    HelpCircle,
    ChevronDown,
    Award,
    Lock,
    Unlock,
    Eye,
    EyeOff,
    Building2,
    Briefcase,
    BookOpen,
    TrendingUp,
    Check,
    Copy,
    ArrowUpRight
} from 'lucide-react';
import Link from 'next/link';

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
    uniconnect_docs_url: 'https://uniconnect.ai'
};

const KNOWN_TRACKS_METADATA: Record<string, { icon: any; desc: string; examples: string[] }> = {
    'Customer Engagement AI': {
        icon: Bot,
        desc: 'Autonomous customer interaction workflows, conversational AI, and personalized omnichannel touchpoints.',
        examples: ['Self-healing onboarding bots', 'Omnichannel sentiment triggers', 'VIP caller triage engine']
    },
    'Contact Center Innovation': {
        icon: PhoneCall,
        desc: 'Next-gen agent assist copilots, real-time telephony intelligence, and automated post-call wrap-ups.',
        examples: ['Real-time transcription agent', 'Agent whisper suggestions', 'Automated QA & scorecards']
    },
    'AI Voice & Autonomous Agents': {
        icon: Cpu,
        desc: 'Voice bots with low latency, voice cloning, smart IVR navigators, and multi-turn autonomous call handlers.',
        examples: ['Emergency dispatch voice agent', 'Outbound appointment scheduler', 'Multilingual voice routing']
    },
    'CX Analytics & Real-Time Insights': {
        icon: BarChart3,
        desc: 'Deep customer sentiment analytics, predictive churn alerts, and actionable supervisor dashboards.',
        examples: ['Live queue stress detection', 'Executive CX dashboard', 'Real-time CSAT predictor']
    },
    'Workflow Automation & MCP': {
        icon: Layers,
        desc: 'Extending Uniconnect using MCP (Model Context Protocol) servers, webhook triggers, and third-party CRM syncing.',
        examples: ['Ticketing auto-resolution', 'Inventory-to-call sync', 'Automated campaign follow-up']
    },
    'Next-Gen CRM Enhancements': {
        icon: Sparkles,
        desc: 'AI-infused record management, automated deal summaries, and intelligent lead distribution models.',
        examples: ['Smart lead routing AI', 'Dynamic customer profiling', 'Zero-touch CRM data entry']
    }
};

function getTrackMetadata(title: string, index: number) {
    if (KNOWN_TRACKS_METADATA[title]) {
        return KNOWN_TRACKS_METADATA[title];
    }
    const fallbackIcons = [Bot, PhoneCall, Cpu, BarChart3, Layers, Sparkles, Lightbulb, Rocket, Code];
    const icon = fallbackIcons[index % fallbackIcons.length];
    return {
        icon,
        desc: `High-impact solutions leveraging Uniconnect AI APIs, telephony gateways, or workflow automation for ${title}.`,
        examples: [`Custom ${title} architecture`, 'Uniconnect API integration', 'Autonomous agent pipeline']
    };
}

function formatMilestoneDate(isoString?: string): string {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
}

function formatReviewRange(startIso?: string, endIso?: string): string {
    if (!startIso || !endIso) return 'NOV 3 – 7, 2026';
    const s = new Date(startIso);
    const e = new Date(endIso);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 'NOV 3 – 7, 2026';
    const sMonth = s.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const eMonth = e.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    if (sMonth === eMonth) {
        return `${sMonth} ${s.getDate()} – ${e.getDate()}, ${s.getFullYear()}`;
    }
    return `${sMonth} ${s.getDate()} – ${eMonth} ${e.getDate()}, ${s.getFullYear()}`;
}

interface IdeaSample {
    id: string;
    title: string;
    tagline: string;
    track: string;
    sector: string;
    accentColor: string;
    problem: string;
    solution: string;
    uniconnectUsage: string[];
    businessImpact: string;
    submissionParams: {
        track: string;
        title: string;
        problem: string;
        solution: string;
        usage: string;
        impact: string;
    };
}

const EXTERNAL_IDEAS: IdeaSample[] = [
    {
        id: 'hospitality-cx',
        title: 'OmniGuest AI: 24/7 Hospitality Concierge & Smart Room Service',
        tagline: 'End-to-end luxury guest experience from pre-arrival WhatsApp to multilingual in-room voice requests.',
        track: 'External Industry Solutions (Customer CX)',
        sector: 'Hospitality & Travel',
        accentColor: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400',
        problem: 'Hotels suffer 25-40 min delays during peak check-in & dining hours. International guests face language barriers, while front-desk agents drown in routine requests (extra towels, late check-out, room service orders).',
        solution: 'An autonomous, multilingual guest concierge powered by Uniconnect. Guests interact via WhatsApp, in-room IP phone, or voice assistant. The agent auto-verifies bookings, answers property queries, and routes tickets directly to housekeeping/F&B.',
        uniconnectUsage: [
            'Uniconnect Voice Agent for natural in-room phone ordering & amenity requests',
            'WhatsApp & SMS messaging gateway for digital key check-in & concierge chat',
            'Dynamic Ticket Creation API (lb_ticket) to auto-dispatch orders to hotel staff',
            'Real-time sentiment & multilingual translation engine for international guests'
        ],
        businessImpact: 'Reduces front-desk call load by 68%, lowers room service order intake time to under 15 seconds, and boosts guest CSAT from 3.8 to 4.7/5.',
        submissionParams: {
            track: 'External Industry Solutions (Customer CX)',
            title: 'OmniGuest AI - End-to-End Multilingual Hospitality Concierge',
            problem: 'Hotel front desks face severe call bottlenecks during peak check-in and dining hours. International guests experience language barriers, while repetitive requests (towels, late checkout, menu queries) overload staff and hurt guest satisfaction.',
            solution: 'Deploy Uniconnect as a unified guest concierge accessible via room phone and WhatsApp. The AI agent resolves 70% of routine requests autonomously and auto-generates dispatch tickets for staff-assisted actions.',
            usage: 'Leverages Uniconnect Voice Agent for phone intake, WhatsApp channel for instant chat, LB Tickets API for automated dispatch to housekeeping/F&B, and Real-time Transcription/Translation.',
            impact: 'Estimated 68% reduction in front-desk phone queue, under-15s response time for room service, and measurable increase in guest CSAT and RevPAR.'
        }
    },
    {
        id: 'healthcare-triage',
        title: 'CarePulse AI: Autonomous Patient Triage & Appointment Copilot',
        tagline: 'Instant patient call triage, doctor appointment booking, and automated lab report notifications.',
        track: 'External Industry Solutions (Customer CX)',
        sector: 'Healthcare & Clinics',
        accentColor: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400',
        problem: 'Clinic switchboards miss up to 35% of inbound calls during morning rushes. High-risk symptoms often wait in identical call queues as basic reschedule requests, creating clinical risks and patient frustration.',
        solution: 'An AI-powered voice triage bot on Uniconnect telephony that evaluates symptom urgency, securely books specialist appointments into the EMR, and dispatches SMS/WhatsApp prep reminders.',
        uniconnectUsage: [
            'Uniconnect AI Voice Agent with low-latency conversational IVR',
            'Contact Center queue prioritization (VIP / High-Urgency triage routing)',
            'SMS / WhatsApp templates for automated booking confirmations and prep checklists',
            'Call recording and real-time medical transcription for doctor note handoff'
        ],
        businessImpact: 'Zero dropped patient calls, 42% reduction in clinic no-shows, and immediate escalation of emergency symptoms to on-call nurses.',
        submissionParams: {
            track: 'External Industry Solutions (Customer CX)',
            title: 'CarePulse AI - Clinical Triage and Intelligent Scheduling Engine',
            problem: 'High call abandonment at clinic front-desks delays urgent patient care. Non-urgent scheduling requests choke phone lines while critical symptoms wait.',
            solution: 'Uniconnect conversational voice agent conducts primary symptom triage, assigns clinical priority scores, books appointments, and sends instant calendar reminders.',
            usage: 'Uniconnect Voice Agent with speech recognition, dynamic call routing API, SMS/WhatsApp notification triggers, and live transcription.',
            impact: 'Cuts call drop rate from 35% to <2%, drops appointment no-shows by 42%, and elevates clinic operational capacity.'
        }
    }
];

const INTERNAL_IDEAS: IdeaSample[] = [
    {
        id: 'servicedesk-kms',
        title: 'SmartDesk KMS: Intelligent IT Service Desk with Auto-Resolution',
        tagline: 'Transform internal IT support with Uniconnect tickets, self-healing KMS bot, and automated Slack/Teams sync.',
        track: 'Internal Cost & Efficiency (Operations)',
        sector: 'Internal IT & Operations',
        accentColor: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/30 text-cyan-400',
        problem: 'IT service desks spend 65% of their workday resetting passwords, issuing VPN configs, and answering repetitive software install questions across disparate email and Slack threads with no centralized knowledge base.',
        solution: 'A unified Knowledge Management System (KMS) & Service Desk built directly on Uniconnect. Employees ask questions via Slack, web portal, or internal extension. The AI matches approved SOP articles, auto-resolves L1 requests, or creates structured tickets.',
        uniconnectUsage: [
            'Uniconnect Custom Record APIs (support_ticket, tickets, comments) for full ticketing lifecycle',
            'AI Chat Agent Execution (ai_chat_agent_execution) querying internal KMS vectors',
            'MCP Server integration connecting internal LDAP/Active Directory for zero-touch credential resets',
            'Omnichannel incoming routing (Web chat, Voice extension, and Email inbox)'
        ],
        businessImpact: 'Cuts IT ticket resolution time by 74%, eliminates duplicate service desk licenses, and achieves 45% automated L1 first-contact resolution.',
        submissionParams: {
            track: 'Internal Cost & Efficiency (Operations)',
            title: 'SmartDesk KMS - Enterprise IT Service Desk & Self-Healing Knowledge Base',
            problem: 'Internal IT staff are buried under repetitive L1 inquiries (VPN, permissions, software). Tickets are scattered across emails and chat with zero unified knowledge tracking.',
            solution: 'Consolidate internal support onto Uniconnect: deploy an AI conversational KMS agent that auto-resolves common issues and manages structured tickets directly within Uniconnect records.',
            usage: 'Uniconnect Support Ticket APIs, AI Chat Agent execution against documentation schemas, MCP tools for internal system lookups, and auto-dispositioning.',
            impact: 'Resolves 45% of tickets with zero human agent intervention, cuts mean-time-to-resolve (MTTR) by 74%, and centralizes company IT knowledge.'
        }
    },
    {
        id: 'jira-migration',
        title: 'Uniconnect Agile: Replacing Jira for Unified Project & Support Management',
        tagline: 'Eliminate expensive SaaS seat licenses by turning Uniconnect into an integrated Agile Kanban & issue tracking hub.',
        track: 'Internal Cost & Efficiency (Operations)',
        sector: 'Engineering & Project Management',
        accentColor: 'from-purple-500/20 to-pink-500/10 border-purple-500/30 text-purple-400',
        problem: 'Mid-market companies spend $40k–$120k annually on Jira / Atlassian licensing, yet developers, support reps, and product managers remain siloed. Customer bug reports in CRM must be manually copied over to Jira.',
        solution: 'Migrate agile sprint planning, backlog grooming, and bug tracking directly onto Uniconnect Custom Records. Customer tickets link directly to development sprint tasks without third-party integrations, saving massive SaaS spend.',
        uniconnectUsage: [
            'Uniconnect Custom Records (projects, sprints, tasks, bug_reports) with parent-child relationships',
            'Role-based access & permissions (get_all_role_details & user status management)',
            'Automated workflow triggers: status transition from "Resolved" auto-notifies customer via email/SMS',
            'Executive CX & Sprint Velocity Dashboards using Uniconnect real-time analytics'
        ],
        businessImpact: 'Saves $75,000+ per year in third-party PM SaaS licensing while bridging the gap between customer support tickets and engineering sprints.',
        submissionParams: {
            track: 'Internal Cost & Efficiency (Operations)',
            title: 'Uniconnect Agile - Consolidating Project Management & Bug Tracking to Replace Jira',
            problem: 'High Atlassian/Jira licensing costs ($12+/user/mo) coupled with a disconnect between customer service tickets and engineering sprint tracking.',
            solution: 'Build a native Agile project management board within Uniconnect using custom records, linking customer support escalations directly to developer tasks in a single platform.',
            usage: 'Uniconnect Custom Record schemas, dynamic workflow rules, user role permissions, and omnichannel automated customer notification triggers.',
            impact: 'Annual licensing savings of $50k-$100k, 100% elimination of double-handling bugs between CRM and Jira, and real-time visibility for stakeholders.'
        }
    }
];

const SAMPLE_PROPOSAL_WALKTHROUGH = {
    title: 'OmniGuest AI: 24/7 Hospitality Concierge & Smart Room Service',
    track: 'External Industry Solutions (Customer CX)',
    team: 'Squad Apex (4 Members: Full-Stack Dev, AI Engineer, UI/UX, Product)',
    sections: [
        {
            number: '01',
            heading: 'Problem Statement',
            weight: '20% of Rubric',
            guideline: 'Be clear and specific. Define who experiences the problem, what the acute pain point is, and cite measurable business friction.',
            example: 'Hotels face acute labor shortages during peak evening check-in and dining hours (6 PM - 10 PM), leading to 30+ minute room service queues. Front desk staff are overwhelmed answering repetitive guest inquiries (WiFi codes, extra towels, pool hours) while multilingual international travelers experience frustrating communication barriers.'
        },
        {
            number: '02',
            heading: 'Proposed Solution Concept',
            weight: '20% of Rubric',
            guideline: 'Explain your high-level architecture and how end users experience your solution. Focus on practicality and clear user journeys.',
            example: 'OmniGuest AI is an autonomous, multilingual guest concierge accessible seamlessly via the in-room IP phone and hotel WhatsApp. When a guest calls "0" or sends a message, Uniconnect handles the request in their native language, confirms room charges, and auto-dispatches digital work orders directly to housekeeping and kitchen tablets.'
        },
        {
            number: '03',
            heading: 'How Uniconnect Will Be Used',
            weight: '25% of Rubric (Highest Weight)',
            guideline: 'Reference specific Uniconnect capabilities: Voice agents, telephony routing, messaging gateways (SMS/WhatsApp), custom records, or MCP servers.',
            example: '1. Uniconnect Voice Agent (ai_voice_agent_execution) for conversational phone ordering.\n2. WhatsApp Gateway (send_whatsapp_template) for digital key delivery and interactive menus.\n3. Custom Records API (lb_ticket, create_record_service_cases) to track order lifecycle.\n4. Real-time Telephony Transcription & Translation for 12+ international languages.'
        },
        {
            number: '04',
            heading: 'Expected Business Impact & ROI',
            weight: '20% of Rubric',
            guideline: 'Quantify the value. How does this increase revenue, reduce operational costs, or delight customers?',
            example: '1. Deflects 68% of routine front-desk phone calls, freeing staff for VIP in-person check-in.\n2. Reduces room service order placement time from 6 minutes to under 25 seconds.\n3. Estimated $45,000 annual operational savings per 150-room hotel property, with a 15% increase in guest review ratings.'
        }
    ]
};

export default function HackathonPage() {
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    const [shortlisted, setShortlisted] = useState<any[]>([]);
    const [stats, setStats] = useState({ total: 0, shortlisted: 0 });
    const [user, setUser] = useState<any>(null);
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const [adminPreview, setAdminPreview] = useState(false);
    const [config, setConfig] = useState<HackathonConfig>(DEFAULT_CONFIG);
    const [isConfigLoaded, setIsConfigLoaded] = useState(false);
    const [ideaTab, setIdeaTab] = useState<'external' | 'internal'>('external');
    const [copiedIdeaId, setCopiedIdeaId] = useState<string | null>(null);

    useEffect(() => {
        // Fetch current user
        fetch('/api/auth/me?_=' + Date.now(), { cache: 'no-store' })
            .then(res => res.json())
            .then(data => {
                if (data.user) setUser(data.user);
            })
            .catch(() => {});

        // Fetch hackathon configuration
        fetch('/api/hackathon/config?_=' + Date.now(), { cache: 'no-store' })
            .then(res => res.json())
            .then(data => {
                if (data.config) {
                    setConfig({
                        ...DEFAULT_CONFIG,
                        ...data.config,
                        tracks: Array.isArray(data.config.tracks) ? data.config.tracks : DEFAULT_CONFIG.tracks,
                        rubric: data.config.rubric || DEFAULT_CONFIG.rubric
                    });
                }
                setIsConfigLoaded(true);
            })
            .catch(err => {
                console.error('Failed to load hackathon config:', err);
                setIsConfigLoaded(true);
            });

        // Fetch shortlisted proposals and stats
        fetch('/api/hackathon/proposals?scope=shortlisted&_=' + Date.now(), { cache: 'no-store' })
            .then(res => res.json())
            .then(data => {
                if (data.proposals) setShortlisted(data.proposals);
                if (data.stats) setStats(data.stats);
            })
            .catch(() => {});

        const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const hasPreviewParam = urlParams?.get('preview') === 'true' || urlParams?.get('preview') === 'full';
        if (hasPreviewParam) {
            setAdminPreview(true);
        }
    }, []);

    const now = Date.now();
    const briefingTimestamp = new Date(config.briefing_date || '2026-10-20T00:00:00Z').getTime();
    const deadlineTimestamp = new Date(config.submission_deadline || '2026-10-30T23:59:59Z').getTime();
    const reviewStartTimestamp = new Date(config.review_start_date || '2026-11-03T00:00:00Z').getTime();
    const reviewEndTimestamp = new Date(config.review_end_date || '2026-11-07T23:59:59Z').getTime();
    const finaleTimestamp = new Date(config.finale_date || '2026-11-17T09:00:00Z').getTime();

    // Determine submission open status dynamically based on configuration
    let isSubmissionsOpen = false;
    if (config.submission_mode === 'FORCE_OPEN') {
        isSubmissionsOpen = true;
    } else if (config.submission_mode === 'FORCE_CLOSED') {
        isSubmissionsOpen = false;
    } else {
        // AUTO_BY_DATE
        isSubmissionsOpen = now >= briefingTimestamp && now <= deadlineTimestamp;
    }

    const activeModeUnlocked = adminPreview || isSubmissionsOpen;

    // Countdown timer calculation
    useEffect(() => {
        const updateCountdown = () => {
            const current = Date.now();
            let targetDate = briefingTimestamp;
            if (isSubmissionsOpen || adminPreview) {
                targetDate = deadlineTimestamp;
            } else if (current > deadlineTimestamp) {
                targetDate = current < reviewEndTimestamp ? reviewEndTimestamp : finaleTimestamp;
            } else {
                targetDate = briefingTimestamp;
            }

            const difference = targetDate - current;

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
    }, [briefingTimestamp, deadlineTimestamp, reviewEndTimestamp, finaleTimestamp, isSubmissionsOpen, adminPreview]);

    const trainingStartTimestamp = new Date('2026-10-27T00:00:00Z').getTime();
    const trainingEndTimestamp = new Date('2026-10-29T23:59:59Z').getTime();

    const isBriefingPassed = now >= briefingTimestamp;
    const isTrainingActive = now >= trainingStartTimestamp && now <= trainingEndTimestamp;
    const isTrainingPassed = now > trainingEndTimestamp;
    const isDeadlinePassed = now > deadlineTimestamp;
    const isReviewPassed = now > reviewEndTimestamp;
    const isFinalePassed = now > finaleTimestamp;

    const timeline = [
        {
            date: formatMilestoneDate(config.briefing_date) || 'OCT 20, 2026',
            tag: 'Briefing',
            title: 'Briefing & Kickoff',
            desc: 'Comprehensive briefing on Hackathon tracks, challenge scope, evaluation rules, and proposal submission guidelines.',
            badge: 'Phase 1',
            color: 'border-blue-500/40 text-blue-400 bg-blue-500/10',
            active: !isBriefingPassed && !isSubmissionsOpen,
            completed: isBriefingPassed || isSubmissionsOpen
        },
        {
            date: 'OCT 27 – 29, 2026',
            tag: 'Training',
            title: 'Uniconnect Training',
            desc: 'Dedicated technical deep dives and architecture training sessions on Uniconnect AI platform, telephony, and APIs.',
            badge: 'Hands-On',
            color: 'border-purple-500/40 text-purple-400 bg-purple-500/10',
            active: isTrainingActive,
            completed: isTrainingPassed,
            locked: !isBriefingPassed && !adminPreview
        },
        {
            date: formatMilestoneDate(config.submission_deadline) || 'OCT 30, 2026',
            tag: activeModeUnlocked ? 'Open' : (isDeadlinePassed ? 'Closed' : 'Locked'),
            title: 'Proposals Close',
            desc: activeModeUnlocked 
                ? 'Final deadline for team owners to submit proposals. Teams can submit multiple proposals (max 3 approved for Demo Day, earning +5 SIPL Leaderboard pts each).'
                : `Portal opens following the ${formatMilestoneDate(config.briefing_date)} briefing. Teams can submit multiple proposals (max 3 approved for Demo Day, +5 pts each).`,
            badge: 'Phase 2',
            color: activeModeUnlocked ? 'border-accent text-accent bg-accent/20' : 'border-white/10 text-gray-400 bg-white/5',
            active: isSubmissionsOpen && !isTrainingActive,
            locked: !activeModeUnlocked && !isDeadlinePassed,
            completed: isDeadlinePassed && !isSubmissionsOpen
        },
        {
            date: formatReviewRange(config.review_start_date, config.review_end_date),
            tag: 'Review',
            title: 'Review & Shortlist',
            desc: 'Technical Council and Admin Panel review all submissions against the rubric and announce shortlisted squads.',
            badge: 'Evaluation',
            color: 'border-yellow-500/40 text-yellow-400 bg-yellow-500/10',
            active: isDeadlinePassed && !isReviewPassed,
            locked: !isDeadlinePassed && !adminPreview,
            completed: isReviewPassed
        },
        {
            date: formatMilestoneDate(config.finale_date) || 'NOV 17, 2026',
            tag: 'Finale',
            title: 'Grand Finale Day',
            desc: 'Finalists install Uniconnect on premise/cloud, build their functional solutions live, and pitch working demos to executive leadership.',
            badge: 'Championship',
            color: 'border-green-500/40 text-green-400 bg-green-500/10',
            active: isReviewPassed && !isFinalePassed,
            locked: !isReviewPassed && !adminPreview,
            completed: isFinalePassed
        }
    ];

    const tracksList = (config.tracks && config.tracks.length > 0)
        ? config.tracks
        : DEFAULT_CONFIG.tracks;

    const rubricItems = [
        {
            title: 'Problem Clarity & Business Value',
            pts: Number(config.rubric?.problem_clarity ?? 20),
            desc: 'Is the business problem real, acute, and backed by strong market rationale?'
        },
        {
            title: 'Uniconnect AI Alignment',
            pts: Number(config.rubric?.uniconnect_alignment ?? 25),
            desc: 'Deep and natural utilization of Uniconnect voice, AI agents, or data APIs.'
        },
        {
            title: 'Feasibility & Approach',
            pts: Number(config.rubric?.technical_feasibility ?? 20),
            desc: 'Is the high-level concept practical, realistic, and achievable for the team?'
        },
        {
            title: 'Innovation & Originality',
            pts: Number(config.rubric?.innovation ?? 20),
            desc: 'Novelty of approach compared to off-the-shelf market solutions.'
        },
        {
            title: 'Pitch, Presentation & Polish',
            pts: Number(config.rubric?.demo_polish ?? 15),
            desc: 'Functional quality, user experience, and clarity of the live pitch on Demo Day.'
        }
    ];

    const totalRubricPoints = rubricItems.reduce((acc, item) => acc + item.pts, 0);

    const docsUrl = config.uniconnect_docs_url || 'https://uniconnect.ai';

    const faqs = [
        {
            q: 'When do proposal submissions officially open?',
            a: `Proposal submissions officially unlock on ${formatMilestoneDate(config.briefing_date)}, following the live Event Briefing. Squad leads will have until ${formatMilestoneDate(config.submission_deadline)} to submit.`
        },
        {
            q: 'When will the Uniconnect architecture training sessions take place?',
            a: 'Dedicated technical training sessions covering Uniconnect architecture, voice agent APIs, and developer toolkits will run from October 27 to October 29, 2026 to help squads prepare for building their prototypes.'
        },
        {
            q: 'Who can participate in the SIPL Hackathon?',
            a: `All official SIPL squads, team owners, and registered players are invited. Team owners will submit proposals representing their team (up to ${config.max_team_size || 4} members).`
        },
        {
            q: 'What is required in the proposal submission?',
            a: 'Just a high-level concept! Teams submit: 1) The problem statement, 2) The proposed solution idea, and 3) A high-level explanation of how Uniconnect will be used. Detailed architecture is not required at the proposal stage.'
        },
        {
            q: `What is the build event on ${formatMilestoneDate(config.finale_date)}?`,
            a: `Shortlisted teams will participate in a full-day hackathon sprint on ${formatMilestoneDate(config.finale_date)}. Teams will install the Uniconnect platform on their environment, connect required services, build functional prototypes, and present live demonstrations to the judges.`
        },
        {
            q: 'What are the prizes and award categories?',
            a: 'The total prize pool is 200,000 LKR across three prestigious award categories: 1) Overall Award (Champion Squad), 2) Best Use of Uniconnect AI, and 3) Best Business Impact. Winners also receive official championship trophies.'
        },
        {
            q: 'How many proposals can a team submit, and how many are approved for the demo?',
            a: 'A team can submit multiple proposals across any tracks! A maximum of 3 proposals from any single team will be approved by the Technical Council to advance to the live build and Demo Day. Furthermore, each approved proposal adds 5 points to your team’s official SIPL Leaderboard score.'
        },
        {
            q: 'How are points awarded to the SIPL Leaderboard from the Hackathon?',
            a: 'The Hackathon awards points directly to the official SIPL season leaderboard: 1) Approved Proposals: Each approved proposal adds +5 points to your team\'s leaderboard score. 2) Grand Finale Overall Ratings: 50, 40, 30, 20, and 10 points are awarded to the 1st, 2nd, 3rd, 4th, and 5th placed teams respectively.'
        }
    ];

    return (
        <main className="min-h-screen bg-[#07070a] text-white selection:bg-accent selection:text-white pb-20 sm:pb-24 overflow-x-hidden">
            {/* Top Navigation */}
            <nav className="w-full border-b border-white/10 bg-black/40 backdrop-blur-md sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
                    <Link href="/" className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                        <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/40 flex items-center justify-center text-accent font-black">
                            S
                        </div>
                        <span className="font-black text-base sm:text-lg tracking-wider">SIPL <span className="text-accent">2026</span></span>
                    </Link>

                    <div className="flex items-center gap-2 sm:gap-4 text-xs font-bold">
                        {/* Admin Preview Mode Toggle */}
                        {user?.role === 'ADMIN' && (
                            <button
                                onClick={() => setAdminPreview(!adminPreview)}
                                className={`px-2.5 sm:px-3 py-1.5 rounded-lg border text-[10px] sm:text-[11px] font-bold flex items-center gap-1 sm:gap-1.5 transition-all shrink-0 ${
                                    adminPreview 
                                        ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' 
                                        : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                                }`}
                                title="Admin toggle to preview full unlocked experience"
                            >
                                {adminPreview ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                <span className="hidden sm:inline">{adminPreview ? 'Previewing Full Mode' : 'Admin: Preview Full Mode'}</span>
                                <span className="sm:hidden">{adminPreview ? 'Preview On' : 'Admin'}</span>
                            </button>
                        )}

                        <a href="#awards" className="text-gray-300 hover:text-accent transition-colors hidden md:flex items-center gap-1">
                            <Trophy className="w-3.5 h-3.5 text-accent" /> Prizes & Awards
                        </a>

                        {(config.results_published || adminPreview) && (
                            <a href="#finalists" className="text-gray-300 hover:text-accent transition-colors hidden md:flex items-center gap-1">
                                <Trophy className="w-3.5 h-3.5 text-accent" /> Finalists
                            </a>
                        )}

                        <a href={docsUrl} target="_blank" rel="noreferrer" className="text-gray-300 hover:text-white transition-colors hidden lg:flex items-center gap-1">
                            Uniconnect AI <ExternalLink className="w-3 h-3 text-gray-500" />
                        </a>

                        {activeModeUnlocked ? (
                            <Link
                                href="/hackathon/submit"
                                className="btn-primary py-1.5 sm:py-2 px-3 sm:px-4 rounded-xl text-xs flex items-center gap-1.5 shrink-0 whitespace-nowrap"
                            >
                                <Rocket className="w-3.5 h-3.5" /> Submit Proposal
                            </Link>
                        ) : (
                            <span className="px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold bg-white/10 text-gray-300 border border-white/10 flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                                <Lock className="w-3 h-3 text-accent shrink-0" /> 
                                {isDeadlinePassed ? 'Closed' : `Briefing ${formatMilestoneDate(config.briefing_date)}`}
                            </span>
                        )}
                    </div>
                </div>
            </nav>

            {/* Admin Preview Notice (if active) */}
            {adminPreview && (
                <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-4 sm:px-6 py-2 text-center text-xs text-yellow-300 font-bold flex items-center justify-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>Admin Mode Active: Previewing the full unlocked state. Regular visitors see the active gate mode ({config.submission_mode}).</span>
                    <button onClick={() => setAdminPreview(false)} className="underline ml-2 text-white">Exit Preview</button>
                </div>
            )}

            {/* Hero Section */}
            <header className="relative pt-8 sm:pt-12 pb-14 sm:pb-20 px-4 sm:px-6 overflow-hidden">
                {/* Background Ambient Glows */}
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] max-w-full h-[400px] bg-accent/15 blur-[160px] pointer-events-none rounded-full" />
                <div className="absolute top-1/3 right-10 w-[400px] max-w-full h-[300px] bg-purple-600/10 blur-[140px] pointer-events-none rounded-full" />

                <div className="max-w-6xl mx-auto relative z-10 text-center">
                    {/* Badge */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full bg-accent/10 border border-accent/30 text-accent text-[11px] sm:text-xs font-black uppercase tracking-wider sm:tracking-widest mb-6 shadow-[0_0_20px_rgba(65,105,225,0.2)] max-w-full"
                    >
                        <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin shrink-0" />
                        <span className="truncate">
                            {activeModeUnlocked 
                                ? (config.event_title || 'Official SIPL Hackathon 2026') 
                                : `Exclusive Teaser • Revealing ${formatMilestoneDate(config.briefing_date)}`}
                        </span>
                    </motion.div>

                    {/* Main Title */}
                    <motion.h1
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                        className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-tight mb-4"
                    >
                        {config.teaser_headline ? (
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-200 to-purple-400 break-words">
                                {config.teaser_headline}
                            </span>
                        ) : (
                            <>
                                Something Big <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-200 to-purple-400">
                                    Is Brewing.
                                </span>
                            </>
                        )}
                    </motion.h1>

                    <p className="text-gray-400 text-sm sm:text-lg md:text-xl max-w-3xl mx-auto font-medium leading-relaxed mb-8 px-2">
                        {activeModeUnlocked ? (
                            <>
                                The ultimate innovation challenge powered by <strong className="text-white">Uniconnect AI</strong>. Squads compete to pitch, architect, and build production-grade prototypes for the 2026 ecosystem.
                            </>
                        ) : (
                            config.teaser_description || (
                                <>
                                    A new challenge is coming to the <strong className="text-white">Simsyn Innovation Premier League</strong> in collaboration with <strong className="text-white">Uniconnect AI</strong>. Ideas will compete, and products will be born. Watch this space.
                                </>
                            )
                        )}
                    </p>

                    {/* Countdown Banner */}
                    <div className="max-w-2xl mx-auto bg-black/60 border border-accent/30 rounded-2xl sm:rounded-3xl p-4 sm:p-6 backdrop-blur-xl shadow-[0_0_50px_rgba(65,105,225,0.15)] mb-8 sm:mb-10">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="text-center sm:text-left">
                                <span className="text-[10px] uppercase font-black tracking-widest text-accent flex items-center justify-center sm:justify-start gap-1.5">
                                    <Clock className="w-3.5 h-3.5 animate-pulse" />
                                    {activeModeUnlocked 
                                        ? 'Next Milestone: Proposal Close'
                                        : (isDeadlinePassed 
                                            ? 'Review & Shortlisting Phase'
                                            : 'Official Briefing & Challenge Reveal')}
                                </span>
                                <h3 className="text-base sm:text-lg font-black text-white mt-0.5">
                                    {activeModeUnlocked 
                                        ? 'Proposal Submissions Close In' 
                                        : (isDeadlinePassed ? 'Shortlist Announcement In' : 'Challenge Unlocks In')}
                                </h3>
                            </div>
                            <div className="grid grid-cols-4 gap-2 sm:gap-3 w-full sm:w-auto">
                                {[
                                    { label: 'Days', val: timeLeft.days },
                                    { label: 'Hours', val: timeLeft.hours },
                                    { label: 'Mins', val: timeLeft.minutes },
                                    { label: 'Secs', val: timeLeft.seconds }
                                ].map((item, i) => (
                                    <div key={i} className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl px-2 sm:px-3 py-2 text-center">
                                        <span className="text-lg sm:text-2xl font-black text-white block leading-tight">{item.val}</span>
                                        <span className="text-[8px] sm:text-[9px] uppercase font-bold text-gray-400">{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Action CTAs */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 max-w-md sm:max-w-none mx-auto w-full">
                        {activeModeUnlocked ? (
                            <Link
                                href="/hackathon/submit"
                                className="btn-primary py-3.5 sm:py-4 px-6 sm:px-8 text-sm sm:text-base font-bold flex items-center justify-center gap-2 group shadow-[0_0_30px_rgba(65,105,225,0.5)] w-full sm:w-auto"
                            >
                                <Rocket className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                                Submit Team Proposal
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        ) : (
                            <div className="bg-white/5 border border-white/15 px-4 sm:px-6 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl flex items-center gap-3 text-xs sm:text-sm text-gray-300 text-left">
                                <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-accent animate-pulse shrink-0" />
                                <span>
                                    {config.submission_mode === 'FORCE_CLOSED' ? (
                                        <>Proposal submissions are currently <strong className="text-white">closed</strong> by administration.</>
                                    ) : isDeadlinePassed ? (
                                        <>Proposal submissions closed on <strong className="text-white">{formatMilestoneDate(config.submission_deadline)}</strong>. Review in progress.</>
                                    ) : (
                                        <>Proposal submissions unlock on <strong className="text-white">{formatMilestoneDate(config.briefing_date)}</strong> following the briefing.</>
                                    )}
                                </span>
                            </div>
                        )}

                        <a
                            href="#timeline"
                            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 py-3.5 sm:py-4 px-6 sm:px-8 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-xs sm:text-sm w-full sm:w-auto"
                        >
                            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300" />
                            {activeModeUnlocked ? 'View Timeline & Rules' : 'Explore Event Timeline'}
                        </a>
                    </div>
                </div>

                {/* Banner Poster Card */}
                <div className="max-w-5xl mx-auto mt-12 sm:mt-16 rounded-2xl sm:rounded-3xl overflow-hidden border border-white/15 shadow-[0_0_80px_rgba(0,0,0,0.9)] relative group">
                    <img
                        src="/assets/hackathon_banner_wide.jpg"
                        alt="SIPL x Uniconnect AI Hackathon 2026 Banner"
                        className="w-full min-h-[220px] sm:min-h-0 h-auto object-cover group-hover:scale-102 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 sm:via-transparent to-transparent opacity-90 sm:opacity-80" />
                    <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 right-4 sm:right-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                        <div>
                            <span className="text-[10px] sm:text-xs uppercase tracking-widest font-black text-accent block mb-1">
                                {config.event_subtitle || 'Simsyn Innovation Premier League × Uniconnect AI'}
                            </span>
                            <h2 className="text-lg sm:text-2xl md:text-3xl font-black text-white leading-tight">Solving Real Business Problems. Powered by Uniconnect.</h2>
                        </div>
                        <a
                            href={docsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-accent hover:bg-accent/90 text-white text-[10px] sm:text-xs font-black uppercase px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl tracking-wider shrink-0 transition-all shadow-lg flex items-center gap-1.5 w-full sm:w-auto justify-center"
                        >
                            Explore Uniconnect.ai <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    </div>
                </div>
            </header>

            {/* Event Timeline & Milestones Section */}
            <section id="timeline" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
                <div className="text-center mb-10 sm:mb-16">
                    <span className="text-accent font-black uppercase tracking-[0.3em] text-xs mb-2 block">Road to Championship</span>
                    <h2 className="text-2xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight">Official Event Timeline</h2>
                    <div className="h-1 w-20 sm:w-24 bg-accent mx-auto mt-4 rounded-full" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4 lg:gap-5 relative">
                    {timeline.map((step, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1 }}
                            className={`glass-card p-4 sm:p-5 flex flex-col justify-between border ${step.active ? 'border-accent shadow-[0_0_30px_rgba(65,105,225,0.2)] ring-1 ring-accent/30' : 'border-white/10'}`}
                        >
                            <div>
                                <div className="flex items-center justify-between gap-2 mb-3 sm:mb-3.5">
                                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border whitespace-nowrap shrink-0 ${step.color}`}>
                                        {step.badge}
                                    </span>
                                    <span className="text-[11px] font-bold text-gray-400 whitespace-nowrap shrink-0">{step.tag}</span>
                                </div>
                                <h3 className="text-base sm:text-lg font-black text-white mb-1 tracking-tight">{step.date}</h3>
                                <h4 className="text-sm font-bold text-gray-200 mb-2 truncate" title={step.title}>{step.title}</h4>
                                <p className="text-xs text-gray-400 leading-relaxed sm:min-h-[58px] line-clamp-3">{step.desc}</p>
                            </div>

                            <div className="mt-4 sm:mt-5 pt-3 sm:pt-3.5 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-400 font-semibold whitespace-nowrap">
                                <span>Milestone 0{idx + 1}</span>
                                {step.active ? (
                                    <span className="text-accent flex items-center gap-1 font-bold">
                                        <Sparkles className="w-3 h-3 animate-spin" /> Active Phase
                                    </span>
                                ) : step.completed ? (
                                    <span className="text-green-400 flex items-center gap-1 font-bold">
                                        <CheckCircle2 className="w-3 h-3" /> Done
                                    </span>
                                ) : step.locked ? (
                                    <span className="text-gray-500 flex items-center gap-1">
                                        <Lock className="w-3 h-3" /> Locked
                                    </span>
                                ) : (
                                    <span className="text-gray-500">Upcoming</span>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Section 1: Sample Proposal Blueprints */}
            <section id="sample-proposals" className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 scroll-mt-24">
                <div className="text-center mb-8 sm:mb-10">
                    <span className="text-accent font-black uppercase tracking-[0.3em] text-xs mb-2 block">
                        Idea Inspiration
                    </span>
                    <h2 className="text-2xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight">
                        Sample Proposal Blueprints
                    </h2>
                    <p className="text-gray-400 text-xs sm:text-sm max-w-2xl mx-auto mt-3 px-2">
                        The objective of this hackathon is to solve real business problems using the capabilities of Uniconnect. Explore reference ideas for customer-facing experiences and internal operational efficiency.
                    </p>

                    {/* 2-Tab Switcher for Sample Ideas */}
                    <div className="mt-6 sm:mt-8 flex flex-col sm:inline-flex sm:flex-row items-stretch sm:items-center justify-center p-1.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl gap-1.5 shadow-2xl w-full sm:w-auto max-w-lg sm:max-w-none mx-auto">
                        <button
                            type="button"
                            onClick={() => setIdeaTab('external')}
                            className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto ${
                                ideaTab === 'external'
                                    ? 'bg-accent text-primary shadow-lg shadow-accent/20 scale-[1.01] sm:scale-[1.02]'
                                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 shrink-0" />
                                <span>External Industry Solutions</span>
                            </div>
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-black/30 border border-black/20 shrink-0">
                                Customer CX
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setIdeaTab('internal')}
                            className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto ${
                                ideaTab === 'internal'
                                    ? 'bg-accent text-primary shadow-lg shadow-accent/20 scale-[1.01] sm:scale-[1.02]'
                                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <Briefcase className="w-4 h-4 shrink-0" />
                                <span>Internal Cost & Efficiency</span>
                            </div>
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-black/30 border border-black/20 shrink-0">
                                Operations
                            </span>
                        </button>
                    </div>
                </div>

                {/* External Ideas Display */}
                {ideaTab === 'external' && (
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto">
                            {EXTERNAL_IDEAS.map((idea) => (
                                <div
                                    key={idea.id}
                                    className="glass-card p-5 sm:p-6 border-white/10 hover:border-amber-500/40 transition-all flex flex-col justify-between group"
                                >
                                    <div>
                                        <div className="flex items-center justify-between gap-2 mb-3">
                                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 border border-amber-500/30 text-amber-300">
                                                {idea.sector}
                                            </span>
                                            <span className="text-[10px] text-gray-400 font-medium">
                                                {idea.track}
                                            </span>
                                        </div>

                                        <h3 className="text-base sm:text-lg font-bold text-white mb-2 group-hover:text-amber-300 transition-colors">
                                            {idea.title}
                                        </h3>

                                        <p className="text-xs text-gray-300 leading-relaxed mb-4 italic">
                                            "{idea.tagline}"
                                        </p>

                                        <div className="space-y-3 pt-3 border-t border-white/10">
                                            <div>
                                                <p className="text-[10px] uppercase font-black tracking-wider text-rose-400 mb-1">Business Problem:</p>
                                                <p className="text-xs text-gray-400 leading-relaxed">{idea.problem}</p>
                                            </div>

                                            <div>
                                                <p className="text-[10px] uppercase font-black tracking-wider text-amber-400 mb-1">Proposed Solution:</p>
                                                <p className="text-xs text-gray-400 leading-relaxed">{idea.solution}</p>
                                            </div>

                                            <div>
                                                <p className="text-[10px] uppercase font-black tracking-wider text-accent mb-1.5">Uniconnect Usage:</p>
                                                <ul className="space-y-1">
                                                    {idea.uniconnectUsage.map((u, i) => (
                                                        <li key={i} className="text-[11px] text-gray-300 flex items-start gap-1.5">
                                                            <Check className="w-3 h-3 text-accent shrink-0 mt-0.5" />
                                                            <span>{u}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            <div>
                                                <p className="text-[10px] uppercase font-black tracking-wider text-green-400 mb-1">Expected ROI / Impact:</p>
                                                <p className="text-xs text-gray-300 font-medium">{idea.businessImpact}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Internal Ideas Display */}
                {ideaTab === 'internal' && (
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto">
                            {INTERNAL_IDEAS.map((idea) => (
                                <div
                                    key={idea.id}
                                    className="glass-card p-5 sm:p-6 border-white/10 hover:border-cyan-500/40 transition-all flex flex-col justify-between group"
                                >
                                    <div>
                                        <div className="flex items-center justify-between gap-2 mb-3">
                                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                                                {idea.sector}
                                            </span>
                                            <span className="text-[10px] text-gray-400 font-medium">
                                                {idea.track}
                                            </span>
                                        </div>

                                        <h3 className="text-base sm:text-lg font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                                            {idea.title}
                                        </h3>

                                        <p className="text-xs text-gray-300 leading-relaxed mb-4 italic">
                                            "{idea.tagline}"
                                        </p>

                                        <div className="space-y-3 pt-3 border-t border-white/10">
                                            <div>
                                                <p className="text-[10px] uppercase font-black tracking-wider text-rose-400 mb-1">Internal Bottleneck & Cost:</p>
                                                <p className="text-xs text-gray-400 leading-relaxed">{idea.problem}</p>
                                            </div>

                                            <div>
                                                <p className="text-[10px] uppercase font-black tracking-wider text-cyan-400 mb-1">Proposed Architecture:</p>
                                                <p className="text-xs text-gray-400 leading-relaxed">{idea.solution}</p>
                                            </div>

                                            <div>
                                                <p className="text-[10px] uppercase font-black tracking-wider text-accent mb-1.5">Uniconnect Usage:</p>
                                                <ul className="space-y-1">
                                                    {idea.uniconnectUsage.map((u, i) => (
                                                        <li key={i} className="text-[11px] text-gray-300 flex items-start gap-1.5">
                                                            <Check className="w-3 h-3 text-accent shrink-0 mt-0.5" />
                                                            <span>{u}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            <div>
                                                <p className="text-[10px] uppercase font-black tracking-wider text-green-400 mb-1">Cost Savings & Efficiency:</p>
                                                <p className="text-xs text-gray-300 font-medium">{idea.businessImpact}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </section>

            {/* Section 2: How to Write a Winning Proposal */}
            <section id="how-to-write" className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 border-t border-white/10 scroll-mt-24">
                <div className="text-center mb-8 sm:mb-12">
                    <span className="text-accent font-black uppercase tracking-[0.3em] text-xs mb-2 block">
                        Submission Guide
                    </span>
                    <h2 className="text-2xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight">
                        How to Write a Winning Proposal
                    </h2>
                    <p className="text-gray-400 text-xs sm:text-sm max-w-2xl mx-auto mt-3 px-2">
                        Phase 1 is about presenting a clear, compelling concept with strong Uniconnect alignment—not delivering working code. Structure your proposal around these 4 rubric-weighted sections:
                    </p>
                </div>

                {/* Submission Rules & Quota Notice */}
                <div className="max-w-5xl mx-auto mb-8 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-accent/10 via-purple-500/10 to-accent/10 border border-accent/30 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left shadow-lg">
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-center shrink-0 text-accent font-black">
                            <Rocket className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-xs sm:text-sm font-black text-white block">
                                Multiple Proposals Welcome • Max 3 Approved for Demo
                            </span>
                            <span className="text-[11px] sm:text-xs text-gray-300">
                                Teams can submit multiple proposals. Each approved proposal earns <strong className="text-accent">+5 Points</strong> toward your team's official SIPL Leaderboard score!
                            </span>
                        </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-accent/20 border border-accent/40 text-accent font-black text-[10px] uppercase tracking-wider whitespace-nowrap shrink-0">
                        +5 Pts / Approved
                    </span>
                </div>

                {/* 4 Steps Walkthrough */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-5xl mx-auto">
                    {SAMPLE_PROPOSAL_WALKTHROUGH.sections.map((section, sIdx) => (
                        <div
                            key={sIdx}
                            className="glass-card p-5 sm:p-6 border-white/10 hover:border-accent/40 transition-all flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/40 text-accent font-black text-sm flex items-center justify-center">
                                        {section.number}
                                    </span>
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/5 border border-white/10 text-accent">
                                        {section.weight}
                                    </span>
                                </div>

                                <h4 className="text-base sm:text-lg font-bold text-white mb-1.5">
                                    {section.heading}
                                </h4>

                                <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                                    <strong className="text-gray-200">Tip:</strong> {section.guideline}
                                </p>

                                <div className="p-3 sm:p-3.5 rounded-xl bg-black/40 border border-white/10">
                                    <p className="text-[10px] uppercase font-mono font-bold tracking-wider text-accent mb-1.5">
                                        Sample Answer ({SAMPLE_PROPOSAL_WALKTHROUGH.title.split(':')[0]}):
                                    </p>
                                    <p className="text-xs text-gray-300 whitespace-pre-line leading-relaxed font-sans break-words">
                                        {section.example}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-8 sm:mt-12 text-center">
                    <Link
                        href="/hackathon/submit"
                        className="btn-primary py-3.5 px-6 sm:px-8 text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 shadow-xl shadow-accent/20 w-full sm:w-auto"
                    >
                        <Rocket className="w-4 h-4" /> Go to Proposal Submission Portal
                    </Link>
                </div>
            </section>

            {/* Section 3: Prize Pool & Award Categories */}
            <section id="awards" className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 border-t border-white/10 scroll-mt-24">
                <div className="text-center mb-10 sm:mb-14">
                    <span className="text-accent font-black uppercase tracking-[0.3em] text-xs mb-2 block">
                        Championship Rewards
                    </span>
                    <h2 className="text-2xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight">
                        Prize Pool & Award Categories
                    </h2>
                    <p className="text-gray-400 text-xs sm:text-sm max-w-2xl mx-auto mt-3 px-2">
                        Celebrating engineering excellence, innovation, and measurable real-world business value. Teams compete across three dedicated award categories.
                    </p>

                    {/* Total Prize Pool Banner */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="mt-6 sm:mt-8 max-w-xl mx-auto p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-amber-500/15 via-yellow-500/20 to-amber-500/15 border border-yellow-500/40 backdrop-blur-xl shadow-[0_0_50px_rgba(234,179,8,0.2)] text-center relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl pointer-events-none" />
                        <span className="text-[10px] sm:text-[11px] uppercase font-black tracking-widest text-yellow-400 block mb-1">
                            Total Tournament Prize Pool
                        </span>
                        <div className="text-3xl sm:text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-400 tracking-tight">
                            200,000 <span className="text-xl sm:text-3xl font-bold text-yellow-300/80">LKR</span>
                        </div>
                        <p className="text-[11px] sm:text-xs text-yellow-200/80 mt-2 font-medium">
                            Cash bonuses • Official Championship Trophies
                        </p>
                    </motion.div>
                </div>

                {/* 3 Award Categories Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 max-w-6xl mx-auto">
                    {/* Category 1: Overall Award */}
                    <div className="glass-card p-5 sm:p-7 border-yellow-500/40 bg-gradient-to-b from-yellow-500/10 via-white/[0.02] to-transparent hover:border-yellow-400 transition-all flex flex-col group relative overflow-hidden shadow-[0_0_30px_rgba(234,179,8,0.1)]">
                        <div className="absolute top-0 right-0 px-2.5 sm:px-3 py-1 bg-yellow-500/20 border-b border-l border-yellow-500/40 rounded-bl-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-yellow-300">
                            Grand Champion
                        </div>
                        <div>
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center text-yellow-400 mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                                <Trophy className="w-6 h-6 sm:w-7 sm:h-7" />
                            </div>
                            <span className="text-[10px] uppercase font-black tracking-widest text-yellow-400 block mb-1">
                                Pinnacle Honor
                            </span>
                            <h3 className="text-lg sm:text-xl xl:text-2xl font-black text-white mb-2 sm:mb-3 group-hover:text-yellow-300 transition-colors whitespace-nowrap tracking-tight">
                                Overall Award
                            </h3>
                            <p className="text-xs text-gray-300 leading-relaxed">
                                Awarded to the highest-scoring overall squad across the entire hackathon. Evaluated on holistic solution completeness, working prototype quality, live pitch polish, and innovation.
                            </p>
                        </div>
                    </div>

                    {/* Category 2: Best Use of Uniconnect AI */}
                    <div className="glass-card p-5 sm:p-7 border-accent/40 bg-gradient-to-b from-accent/10 via-white/[0.02] to-transparent hover:border-accent transition-all flex flex-col group relative overflow-hidden shadow-[0_0_30px_rgba(65,105,225,0.1)]">
                        <div className="absolute top-0 right-0 px-2.5 sm:px-3 py-1 bg-accent/20 border-b border-l border-accent/40 rounded-bl-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-accent">
                            Technical Excellence
                        </div>
                        <div>
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                                <Cpu className="w-6 h-6 sm:w-7 sm:h-7" />
                            </div>
                            <span className="text-[10px] uppercase font-black tracking-widest text-accent block mb-1">
                                Platform Mastery
                            </span>
                            <h3 className="text-lg sm:text-xl xl:text-2xl font-black text-white mb-2 sm:mb-3 group-hover:text-accent transition-colors whitespace-nowrap tracking-tight">
                                Best Use of Uniconnect AI
                            </h3>
                            <p className="text-xs text-gray-300 leading-relaxed">
                                Awarded to the squad whose solution covers the most diverse range of Uniconnect features and capabilities—demonstrating versatile, end-to-end integration across the platform.
                            </p>
                        </div>
                    </div>

                    {/* Category 3: Best Business Impact */}
                    <div className="glass-card p-5 sm:p-7 border-green-500/40 bg-gradient-to-b from-green-500/10 via-white/[0.02] to-transparent hover:border-green-400 transition-all flex flex-col group relative overflow-hidden shadow-[0_0_30px_rgba(34,197,94,0.1)]">
                        <div className="absolute top-0 right-0 px-2.5 sm:px-3 py-1 bg-green-500/20 border-b border-l border-green-500/40 rounded-bl-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-green-300">
                            Enterprise Value
                        </div>
                        <div>
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-green-500/20 border border-green-500/40 flex items-center justify-center text-green-400 mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                                <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7" />
                            </div>
                            <span className="text-[10px] uppercase font-black tracking-widest text-green-400 block mb-1">
                                ROI & Utility
                            </span>
                            <h3 className="text-lg sm:text-xl xl:text-2xl font-black text-white mb-2 sm:mb-3 group-hover:text-green-300 transition-colors whitespace-nowrap tracking-tight">
                                Best Business Impact
                            </h3>
                            <p className="text-xs text-gray-300 leading-relaxed">
                                Awarded to the solution with the highest commercial viability, demonstrable ROI, cost reduction, or customer experience enhancement—whether solving external CX or internal enterprise friction.
                            </p>
                        </div>
                    </div>
                </div>

                {/* SIPL Leaderboard Championship Points & Proposal Rules */}
                <div className="mt-8 sm:mt-12 max-w-6xl mx-auto">
                    <div className="glass-card p-6 sm:p-8 md:p-10 border-accent/30 bg-gradient-to-br from-accent/[0.08] via-purple-600/[0.05] to-transparent rounded-2xl sm:rounded-3xl relative overflow-hidden shadow-[0_0_50px_rgba(65,105,225,0.15)]">
                        {/* Glow corner */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

                        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-6 border-b border-white/10 mb-6 sm:mb-8">
                            <div>
                                <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.25em] text-accent flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-accent" /> Tournament Championship Points
                                </span>
                                <h3 className="text-xl sm:text-3xl font-black text-white mt-1 uppercase tracking-tight">
                                    SIPL Leaderboard Impact
                                </h3>
                                <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-xl">
                                    Every proposal and demo performance feeds directly into your official SIPL season standings.
                                </p>
                            </div>
                            <div className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-300">
                                <Shield className="w-4 h-4 text-accent" />
                                <span>Official League Sanctioned Points</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
                            {/* Left: Proposal Phase Points & Submission Rules */}
                            <div className="lg:col-span-5 p-5 sm:p-6 rounded-2xl bg-black/40 border border-white/10 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <span className="text-[10px] uppercase font-black tracking-widest text-accent">
                                            Phase 1 • Submissions
                                        </span>
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-accent/20 text-accent border border-accent/40">
                                            +5 Pts / Approved
                                        </span>
                                    </div>
                                    <h4 className="text-base sm:text-lg font-bold text-white mb-2">
                                        Proposal Submission & Quota
                                    </h4>
                                    <p className="text-xs text-gray-300 leading-relaxed mb-4">
                                        A team can submit <strong className="text-white">multiple proposals</strong> across different problem tracks to maximize opportunities.
                                    </p>

                                    <div className="space-y-3 pt-2">
                                        <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                            <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                                                3
                                            </div>
                                            <div>
                                                <span className="text-xs font-bold text-white block">Max 3 Approved For Demo</span>
                                                <span className="text-[11px] text-gray-400">Up to 3 proposals from a single team will be approved by the Technical Council for live prototyping and Demo Day.</span>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3 p-3 rounded-xl bg-accent/[0.08] border border-accent/20">
                                            <div className="w-7 h-7 rounded-lg bg-accent/20 text-accent flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                                                +5
                                            </div>
                                            <div>
                                                <span className="text-xs font-bold text-accent block">+5 Points Per Approved Proposal</span>
                                                <span className="text-[11px] text-gray-300">For each proposal approved by the council, 5 points are automatically added to the team's official SIPL Leaderboard tally.</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Grand Finale Overall Ratings Points (Top 5) */}
                            <div className="lg:col-span-7 p-5 sm:p-6 rounded-2xl bg-black/40 border border-white/10 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <span className="text-[10px] uppercase font-black tracking-widest text-yellow-400">
                                            Grand Finale • Overall Ratings
                                        </span>
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">
                                            Top 5 Teams
                                        </span>
                                    </div>
                                    <h4 className="text-base sm:text-lg font-bold text-white mb-2">
                                        Grand Finale Leaderboard Points
                                    </h4>
                                    <p className="text-xs text-gray-300 leading-relaxed mb-4">
                                        Final overall ratings from the Demo Day judging panel award significant tournament points directly to the leaderboard:
                                    </p>

                                    {/* 5 Places Grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3">
                                        {[
                                            { rank: '1st', pts: '50', label: 'Champion', color: 'from-yellow-500/20 to-amber-500/10 border-yellow-500/40 text-yellow-300', ptsColor: 'text-yellow-400' },
                                            { rank: '2nd', pts: '40', label: 'Runner-up', color: 'from-slate-300/20 to-slate-400/10 border-slate-300/40 text-slate-200', ptsColor: 'text-slate-200' },
                                            { rank: '3rd', pts: '30', label: '3rd Place', color: 'from-amber-700/20 to-amber-800/10 border-amber-600/40 text-amber-300', ptsColor: 'text-amber-400' },
                                            { rank: '4th', pts: '20', label: '4th Place', color: 'from-blue-500/15 to-indigo-500/10 border-blue-500/30 text-blue-300', ptsColor: 'text-blue-400' },
                                            { rank: '5th', pts: '10', label: '5th Place', color: 'from-purple-500/15 to-purple-600/10 border-purple-500/30 text-purple-300', ptsColor: 'text-purple-400' }
                                        ].map((tier, i) => (
                                            <div
                                                key={i}
                                                className={`p-3 sm:p-3.5 rounded-xl bg-gradient-to-b border text-center flex flex-col justify-between ${tier.color} ${i === 0 ? 'col-span-2 sm:col-span-1 shadow-[0_0_20px_rgba(234,179,8,0.15)]' : ''}`}
                                            >
                                                <span className="text-[10px] font-black uppercase tracking-wider block opacity-80">
                                                    {tier.rank}
                                                </span>
                                                <div className="my-1.5">
                                                    <span className={`text-2xl sm:text-3xl font-black block leading-none ${tier.ptsColor}`}>
                                                        {tier.pts}
                                                    </span>
                                                    <span className="text-[8px] sm:text-[9px] uppercase font-bold text-gray-400 tracking-wider">
                                                        Points
                                                    </span>
                                                </div>
                                                <span className="text-[9px] font-medium text-gray-400 truncate block">
                                                    {tier.label}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-400">
                                    <span>Awarded based on overall ratings across technical quality, innovation & demo polish.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Shortlisted Finalists Showcase Section (Controlled by config.results_published or adminPreview) */}
            {(config.results_published || adminPreview) && (
                <section id="finalists" className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
                    <div className="text-center mb-10 sm:mb-16">
                        <span className="text-accent font-black uppercase tracking-[0.3em] text-xs mb-2 block">
                            Championship Finalists
                        </span>
                        <h2 className="text-2xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight">
                            Shortlisted Finalist Squads
                        </h2>
                        <p className="text-gray-400 text-xs sm:text-sm max-w-xl mx-auto mt-3 px-2">
                            Top team proposals selected by the Technical Council & Panel to advance to the Grand Finale live build and demo day.
                        </p>
                        {adminPreview && !config.results_published && (
                            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 text-xs font-bold">
                                <Eye className="w-3.5 h-3.5 shrink-0" />
                                <span>Admin Preview: Finalists section is currently Draft (hidden from visitors until toggled in Admin).</span>
                            </div>
                        )}
                    </div>

                    {shortlisted.length === 0 ? (
                        <div className="glass-card p-8 sm:p-12 border-white/10 text-center max-w-2xl mx-auto">
                            <Trophy className="w-10 h-10 sm:w-12 sm:h-12 text-accent/50 mx-auto mb-4 animate-bounce" />
                            <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Shortlist Announcement In Progress</h3>
                            <p className="text-xs text-gray-400 leading-relaxed max-w-md mx-auto">
                                The Technical Council is currently scoring all submitted proposals against the evaluation rubric. Shortlisted squads will appear here upon completion of the review window.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                            {shortlisted.map((item, idx) => (
                                <motion.div
                                    key={item.id || idx}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: idx * 0.08 }}
                                    className="glass-card p-5 sm:p-6 border-accent/40 bg-gradient-to-b from-white/[0.04] to-transparent hover:border-accent flex flex-col justify-between group transition-all"
                                >
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-green-500/20 text-green-300 border border-green-500/40">
                                                <Trophy className="w-3 h-3 text-green-400" /> Finalist
                                            </span>
                                            <span className="text-[11px] font-bold text-accent px-2 py-0.5 rounded bg-accent/10 border border-accent/20 truncate max-w-[160px]">
                                                {item.track}
                                            </span>
                                        </div>

                                        <h3 className="text-base sm:text-lg font-black text-white group-hover:text-accent transition-colors mb-2 line-clamp-2">
                                            {item.title}
                                        </h3>

                                        <div className="flex items-center gap-2 mb-4 text-xs text-gray-300">
                                            <Shield className="w-3.5 h-3.5 text-accent shrink-0" />
                                            <span className="font-bold">{item.team_name}</span>
                                            {item.owner_name && (
                                                <>
                                                    <span className="text-gray-500">•</span>
                                                    <span className="text-gray-400">Lead: {item.owner_name}</span>
                                                </>
                                            )}
                                        </div>

                                        <div className="space-y-3 pt-3 border-t border-white/5 text-xs">
                                            <div>
                                                <span className="text-[10px] uppercase font-black tracking-widest text-gray-500 block mb-1">
                                                    Problem Statement:
                                                </span>
                                                <p className="text-gray-300 line-clamp-3 leading-relaxed">
                                                    {item.problem_statement}
                                                </p>
                                            </div>

                                            {item.uniconnect_usage && (
                                                <div className="bg-accent/5 p-3 rounded-xl border border-accent/20">
                                                    <span className="text-[10px] uppercase font-black tracking-widest text-accent flex items-center gap-1 mb-1">
                                                        <Cpu className="w-3 h-3 shrink-0" /> Uniconnect Adoption:
                                                    </span>
                                                    <p className="text-gray-300 line-clamp-2 text-[11px]">
                                                        {item.uniconnect_usage}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-5 sm:mt-6 pt-3 sm:pt-4 border-t border-white/5 flex items-center justify-between text-[11px]">
                                        {item.score > 0 ? (
                                            <span className="text-accent font-bold">
                                                Council Score: <strong className="text-white">{item.score} pts</strong>
                                            </span>
                                        ) : (
                                            <span className="text-gray-400">Grand Finale Ready</span>
                                        )}
                                        <span className="text-gray-500 font-mono text-[10px]">#0{idx + 1}</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {/* Evaluation Rubric */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
                <div className="text-center mb-10 sm:mb-16">
                    <span className="text-accent font-black uppercase tracking-[0.3em] text-xs mb-2 block">Judging Framework</span>
                    <h2 className="text-2xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight">{totalRubricPoints}-Point Evaluation Rubric</h2>
                    <p className="text-gray-400 text-xs sm:text-sm max-w-xl mx-auto mt-3 px-2">
                        How the Technical Council and Panel score each proposal and build.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
                    {rubricItems.map((item, idx) => (
                        <div key={idx} className="glass-card p-5 sm:p-6 border-white/10 text-center flex flex-col justify-between">
                            <div>
                                <span className="text-2xl sm:text-3xl font-black text-accent block mb-1">{item.pts}</span>
                                <span className="text-[10px] uppercase font-black tracking-widest text-gray-400 block mb-2 sm:mb-3">POINTS</span>
                                <h3 className="font-bold text-white text-sm sm:text-base mb-1.5 sm:mb-2">{item.title}</h3>
                                <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* FAQ Accordion */}
            <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
                <div className="text-center mb-8 sm:mb-12">
                    <span className="text-accent font-black uppercase tracking-[0.3em] text-xs mb-2 block">Need Help?</span>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight">Frequently Asked Questions</h2>
                </div>

                <div className="space-y-3 sm:space-y-4">
                    {faqs.map((faq, idx) => (
                        <div
                            key={idx}
                            className="glass-card border-white/10 overflow-hidden transition-all"
                        >
                            <button
                                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                                className="w-full p-4 sm:p-5 text-left flex items-start sm:items-center justify-between gap-3 sm:gap-4 font-bold text-xs sm:text-sm text-white hover:text-accent transition-colors"
                            >
                                <span className="flex items-center gap-2.5 sm:gap-3">
                                    <HelpCircle className="w-4 h-4 text-accent shrink-0 mt-0.5 sm:mt-0" />
                                    <span>{faq.q}</span>
                                </span>
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform shrink-0 mt-0.5 sm:mt-0 ${openFaq === idx ? 'rotate-180 text-accent' : ''}`} />
                            </button>
                            {openFaq === idx && (
                                <div className="px-4 sm:px-5 pb-4 sm:pb-5 text-xs text-gray-300 leading-relaxed border-t border-white/5 pt-3">
                                    {faq.a}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* Bottom Call to Action */}
            <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 text-center">
                <div className="glass-card p-6 sm:p-12 md:p-16 border-accent/40 bg-gradient-to-b from-black to-accent/10 relative overflow-hidden">
                    <h2 className="text-2xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight mb-3 sm:mb-4">
                        {activeModeUnlocked ? 'Ready To Make History?' : 'Watch This Space.'}
                    </h2>
                    <p className="text-gray-300 text-xs sm:text-base max-w-xl mx-auto mb-6 sm:mb-8 px-2">
                        {activeModeUnlocked
                            ? `The proposal submission portal is open. Submit your team's concept before ${formatMilestoneDate(config.submission_deadline)}.`
                            : `Mark ${formatMilestoneDate(config.briefing_date)} on your calendar for the official briefing, track deep dives, and portal opening.`
                        }
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 max-w-md sm:max-w-none mx-auto w-full">
                        {activeModeUnlocked ? (
                            <Link
                                href="/hackathon/submit"
                                className="btn-primary py-3.5 sm:py-4 px-6 sm:px-8 text-sm sm:text-base font-bold flex items-center justify-center gap-2 group shadow-[0_0_35px_rgba(65,105,225,0.6)] w-full sm:w-auto"
                            >
                                <Rocket className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                                Submit Proposal Now
                            </Link>
                        ) : (
                            <a
                                href={docsUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="btn-primary py-3.5 sm:py-4 px-6 sm:px-8 text-sm sm:text-base font-bold flex items-center justify-center gap-2 shadow-[0_0_35px_rgba(65,105,225,0.6)] w-full sm:w-auto"
                            >
                                <Sparkles className="w-5 h-5" /> Discover Uniconnect AI
                            </a>
                        )}
                        <Link
                            href="/"
                            className="bg-white/10 hover:bg-white/20 text-white py-3.5 sm:py-4 px-6 sm:px-8 rounded-xl font-bold transition-all border border-white/10 flex items-center justify-center w-full sm:w-auto text-sm sm:text-base"
                        >
                            Return to SIPL Hub
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}
