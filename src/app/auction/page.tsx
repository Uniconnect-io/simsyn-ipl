'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, TrendingUp, Users, DollarSign, Award, Info, Home, RefreshCw, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const INNOVATION_COMMITTEE_MEMBERS = ['pramuditha', 'vithursan', 'sanduni', 'dulmini', 'nisitha', 'shenali'];

const isInnovationCommittee = (name?: string) => {
    if (!name) return false;
    return INNOVATION_COMMITTEE_MEMBERS.some(m => name.toLowerCase().includes(m));
};

interface AuctionStatus {
    status: 'ACTIVE' | 'IDLE';
    id?: string;
    playerId?: string;
    playerName?: string;
    rating?: number;
    pool?: string;
    basePrice?: number;
    currentBid?: number;
    currentBidderId?: string;
    currentBidderName?: string;
    timerEnd?: string;
    tags?: string;
    points?: number;
    rank?: number | string;
    nextPlayer?: { name: string, pool: string, min_bid: number, tags?: string };
    nextPlayers?: { name: string, pool: string, min_bid: number, tags?: string }[];
}

interface Player {
    id: string;
    name: string;
    rating: number;
    sold_price: number | null;
    min_bid: number;
}

interface Team {
    id: string;
    name: string;
    balance: number;
    captain?: Player;
    players: Player[];
}

export default function AuctionPage() {
    const [auction, setAuction] = useState<AuctionStatus | null>(null);
    const [teams, setTeams] = useState<Team[]>([]);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [myTeamId, setMyTeamId] = useState<string | null>(null);
    const [myCaptainName, setMyCaptainName] = useState<string | null>(null);
    const [nextPlayerIndex, setNextPlayerIndex] = useState(0);
    const [isBidding, setIsBidding] = useState(false);
    const [celebration, setCelebration] = useState<{ type: 'SOLD' | 'UNSOLD', playerName: string, teamName?: string, price?: number } | null>(null);
    const finalizedRef = useRef<string | null>(null);
    const prevAuctionRef = useRef<AuctionStatus | null>(null);

    // Rotate next player every 5 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setNextPlayerIndex(prev => prev + 1);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const checkSession = async () => {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                console.log('Session data:', data);
                if (data.user && data.user.role === 'OWNER') {
                    setMyTeamId(data.user.team_id);
                    setMyCaptainName(data.user.name);
                    localStorage.setItem('sipl_captain', JSON.stringify(data.user));
                } else {
                    setMyTeamId(null);
                    setMyCaptainName(null);
                    localStorage.removeItem('sipl_captain');
                }
            } else {
                setMyTeamId(null);
                setMyCaptainName(null);
                localStorage.removeItem('sipl_captain');
            }
        };
        checkSession();
    }, []);



    const fetchData = useCallback(async () => {
        try {
            const [auctionRes, teamsRes] = await Promise.all([
                fetch('/api/auction/status?_=' + Date.now(), { cache: 'no-store' }),
                fetch('/api/teams?_=' + Date.now(), { cache: 'no-store' })
            ]);
            // Check responses
            if (!auctionRes.ok || !teamsRes.ok) return;

            const auctionData = await auctionRes.json();
            const teamsData = await teamsRes.json();

            setAuction(auctionData);
            setTeams(teamsData);

            if (auctionData.status === 'ACTIVE' && auctionData.timerEnd) {
                const remaining = Math.max(0, Math.floor((new Date(auctionData.timerEnd).getTime() - Date.now()) / 1000));
                setTimeLeft(remaining);

                // Disable auto-finalize to prevent clock skew issues
                // if (remaining === 0) {
                //     fetch('/api/auction/finalize', { method: 'POST' });
                // }
            } else {
                setTimeLeft(null);
            }
        } catch (err) {
            console.error('Fetch error:', err);
        }
    }, []);

    useEffect(() => {
        if (auction?.status === 'ACTIVE' && auction.timerEnd) {
            const calculateTime = () => {
                const end = new Date(auction.timerEnd!).getTime();
                const now = Date.now();
                const remaining = Math.max(0, Math.floor((end - now) / 1000));
                setTimeLeft(remaining);

                if (remaining <= 0 && finalizedRef.current !== auction.playerId) {
                    finalizedRef.current = auction.playerId || null;
                    fetch('/api/auction/finalize', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ playerId: auction.playerId, force: false })
                    });
                }
            };

            calculateTime();
            const timer = setInterval(calculateTime, 1000);
            return () => clearInterval(timer);
        } else {
            if (auction?.status !== 'ACTIVE') {
                setTimeLeft(null);
            }
        }
    }, [auction]);

    useEffect(() => {
        if (prevAuctionRef.current?.status === 'ACTIVE' && auction?.status === 'IDLE') {
            const prev = prevAuctionRef.current;
            const wasSold = !!prev.currentBidderId;
            setCelebration({
                type: wasSold ? 'SOLD' : 'UNSOLD',
                playerName: prev.playerName || 'Player',
                teamName: prev.currentBidderName || undefined,
                price: prev.currentBid || undefined
            });
            setTimeout(() => setCelebration(null), 5000);
        }
        prevAuctionRef.current = auction;
    }, [auction]);

    useEffect(() => {
        fetchData();

        const channel = supabase
            .channel('auction_updates')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'bids' },
                () => fetchData()
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'players' }, // Catch team assignments
                () => fetchData()
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'teams' }, // Catch balance updates
                () => fetchData()
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Connected to auction realtime');
                }
            });

        return () => {
            console.log('Unsubscribing from auction realtime');
            supabase.removeChannel(channel);
        };
    }, [fetchData]);

    const handleBid = async (amount: number) => {
        if (!auction || auction.status !== 'ACTIVE' || !myTeamId) {
            if (!myTeamId) alert('Please identify yourself as a Captain first!');
            return;
        }

        const myTeam = teams.find(t => t.id === myTeamId);
        if (!myTeam) return;

        // Check for max team size (5 players + captain = 6 total)
        if (myTeam.players.length >= 6) {
            alert('Your team is full! You have 6 players.');
            return;
        }

        if (amount > myTeam.balance) {
            alert('Insufficient tokens for this bid!');
            return;
        }

        if (auction.currentBidderId === myTeamId) {
            alert('You are already the highest bidder!');
            return;
        }

        setIsBidding(true);
        try {
            const res = await fetch('/api/auction/place-bid', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    playerId: auction.playerId,
                    teamId: myTeamId,
                    amount
                }),
            });
            const data = await res.json();
            if (!data.success) alert(data.error);
            // No strict need to fetchData here as the subscription will catch it, but good for local optimistic UI if we added that.
        } catch (err) {
            console.error(err);
        } finally {
            setIsBidding(false);
        }
    };

    const sortedTeams = [...teams].sort((a, b) => b.balance - a.balance);
    const displayTeams = [...sortedTeams].sort((a, b) => {
        if (a.id === myTeamId) return -1;
        if (b.id === myTeamId) return 1;
        return 0;
    });

    const isAuctionActive = auction?.status === 'ACTIVE' && (timeLeft === null || timeLeft > 0);

    return (
        <main className={`min-h-screen flex flex-col p-4 sm:p-6 bg-[#07070a] text-white selection:bg-accent selection:text-white ${isAuctionActive ? 'lg:h-screen lg:overflow-hidden' : ''}`}>
            {/* Header */}
            <header className="flex justify-between items-center mb-6 shrink-0 max-w-7xl mx-auto w-full">
                <div className="flex items-center gap-4">
                    <img src="/assets/logo.png" alt="SIPL" className="h-12 w-auto" onError={(e) => e.currentTarget.style.display = 'none'} />
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-glow tracking-tighter">
                            {isAuctionActive ? 'SIPL LIVE AUCTION' : 'SIPL TEAM SQUADS'}
                        </h1>
                        <p className="text-gray-400 text-xs">Simsyn Innovation Premier League 2026</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        href="/"
                        className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/10 text-gray-300 hover:text-white transition-all font-bold text-xs sm:text-sm"
                    >
                        <Home className="w-4 h-4" /> Home
                    </Link>
                </div>
            </header>

            {/* When Auction is ACTIVE: Show Live Split View */}
            {isAuctionActive ? (
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
                    {/* Left Column: Active Auction (5 cols) */}
                    <div className="col-span-1 lg:col-span-5 flex flex-col gap-4 min-h-0">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={auction.playerId || 'active_auction'}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.05 }}
                                className="glass-card flex-1 p-6 flex flex-col border-accent/30 bg-gradient-to-br from-accent/5 to-transparent relative overflow-hidden"
                            >
                                {/* Timer Badge */}
                                {timeLeft !== null && (
                                    <div className={`absolute top-0 left-0 px-6 py-3 rounded-br-2xl font-black tracking-widest z-10 flex items-center gap-3 border-r border-b ${timeLeft < 10 ? 'bg-red-500 text-white border-red-600 animate-pulse' : 'bg-black/60 text-accent border-accent/20'}`}>
                                        <Timer className="w-8 h-8" />
                                        <span className="text-4xl leading-none">{timeLeft > 30 ? 30 : timeLeft}s</span>
                                    </div>
                                )}

                                {/* Active Player Badge */}
                                <div className="absolute top-0 right-0 bg-accent text-black px-4 py-1 rounded-bl-xl font-black text-xs tracking-widest z-10">
                                    POOL {auction.pool}
                                </div>

                                <div className="flex-1 flex flex-col items-center justify-center text-center mb-6">
                                    <div className="relative w-48 h-48 mb-4">
                                        <div className="absolute inset-0 rounded-full border-4 border-accent/20 animate-spin-slow"></div>
                                        <div className="w-full h-full rounded-full overflow-hidden border-4 border-white/10 bg-black/40 shadow-[0_0_50px_rgba(255,255,255,0.1)]">
                                            <img
                                                src={`/assets/employee/${auction.playerName?.toLowerCase()}.png`}
                                                alt={auction.playerName}
                                                className="w-full h-full object-cover"
                                                onError={(e) => (e.currentTarget.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + auction.playerName)}
                                            />
                                        </div>
                                        <div className="absolute -bottom-2 -right-2 bg-black/80 text-white px-3 py-1 rounded-full border border-white/20 flex items-center gap-1">
                                            <Award className="w-3 h-3 text-yellow-500" />
                                            <span className="font-bold text-sm">{auction.rating}</span>
                                        </div>
                                    </div>
                                    <h2 className="text-4xl font-black tracking-tighter mb-1">{auction.playerName}</h2>
                                    {auction.tags && (
                                        <div className="flex flex-wrap justify-center gap-2 mb-4">
                                            {auction.tags.split(',').map(tag => (
                                                <div key={tag} className="px-3 py-1 bg-accent/10 text-accent border border-accent/20 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
                                                    <Info className="w-3 h-3" /> {tag.trim()}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <p className="text-gray-400">Base Price: <span className="text-white font-bold">{auction.basePrice?.toLocaleString()}</span></p>
                                    {auction.points !== undefined && (
                                        <div className="flex justify-center gap-4 mt-2">
                                            <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-lg border border-white/10">
                                                <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Points</span>
                                                <span className="text-white font-bold">{auction.points}</span>
                                            </div>
                                            {auction.rank && (
                                                <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-lg border border-white/10">
                                                    <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Rank</span>
                                                    <span className="text-yellow-500 font-black">#{auction.rank}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="bg-black/40 p-6 rounded-2xl border border-white/5 space-y-6">
                                    <div className="flex justify-between items-end border-b border-white/5 pb-6">
                                        <div>
                                            <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">Current Bid</p>
                                            <div className="text-5xl font-black text-accent">{auction.currentBid?.toLocaleString()}</div>
                                        </div>
                                        {auction.currentBidderName && (
                                            <div className="text-right">
                                                <div className="text-xs text-blue-400 font-bold mb-1 uppercase tracking-widest">Leading Team</div>
                                                <div className="flex items-center gap-2 justify-end">
                                                    <span className="font-bold text-lg">{auction.currentBidderName}</span>
                                                    <img
                                                        src={`/assets/teamlogos/${auction.currentBidderName.toLowerCase().replace(' ', '_')}.png`}
                                                        alt={auction.currentBidderName}
                                                        className="w-8 h-8 object-contain"
                                                        onError={(e) => (e.currentTarget.style.display = 'none')}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Bidding Controls */}
                                    {myTeamId && (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-3 gap-2">
                                                {(() => {
                                                    const myTeam = teams.find(t => t.id === myTeamId);
                                                    const balance = myTeam?.balance || 0;
                                                    const currentAmount = auction.currentBid || 0;
                                                    const baseAmount = auction.basePrice || 0;

                                                    let bidOptions: number[] = [];
                                                    if (!auction.currentBidderName) {
                                                        bidOptions = [baseAmount, baseAmount + 5000, baseAmount + 10000, baseAmount + 25000, baseAmount + 50000, baseAmount + 100000];
                                                    } else {
                                                        const base = currentAmount;
                                                        bidOptions = [base + 5000, base + 10000, base + 25000, base + 50000, base + 75000, base + 100000];
                                                    }

                                                    const anyDisabledByBalance = bidOptions.some(opt => opt > balance);
                                                    const isBalanceRepresented = bidOptions.some(opt => opt === balance);
                                                    if (balance > currentAmount && anyDisabledByBalance && !isBalanceRepresented) {
                                                        bidOptions[5] = balance;
                                                    }

                                                    const finalOptions = Array.from(new Set(bidOptions)).sort((a, b) => a - b).slice(0, 6);

                                                    return finalOptions.map((amount, idx) => {
                                                        const effectiveBase = auction.currentBid && auction.currentBid > 0 ? auction.currentBid : baseAmount;
                                                        const isBaseBid = amount === baseAmount && !auction.currentBidderName;
                                                        const isLeading = auction.currentBidderId === myTeamId;
                                                        const isTooExpensive = amount > balance;

                                                        return (
                                                            <button
                                                                key={`${auction.playerId}-${idx}-${amount}`}
                                                                onClick={() => handleBid(amount)}
                                                                disabled={isLeading || isBidding || isTooExpensive}
                                                                className={`h-[56px] rounded-xl font-black text-sm transition-all flex flex-col items-center justify-center gap-0.5 group relative ${isLeading || isTooExpensive
                                                                    ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed border border-white/5'
                                                                    : isBidding ? 'bg-white/5 text-gray-400 cursor-wait' : 'bg-white/10 hover:bg-accent hover:text-black'
                                                                    }`}
                                                            >
                                                                {isBidding ? (
                                                                    <RefreshCw className="w-5 h-5 animate-spin text-accent" />
                                                                ) : (
                                                                    <>
                                                                        <span className={`text-[10px] font-medium uppercase tracking-widest ${isLeading || isTooExpensive ? 'text-gray-700' : 'text-gray-400 group-hover:text-black/60'}`}>
                                                                            {amount === balance ? 'MAX TOKENS' : isBaseBid ? 'Bid Base' : `+${(amount - effectiveBase) / 1000}k`}
                                                                        </span>
                                                                        <span className="text-base">{amount.toLocaleString()}</span>
                                                                    </>
                                                                )}
                                                            </button>
                                                        );
                                                    });
                                                })()}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Right Column: Teams List (7 cols) */}
                    <div className="col-span-1 lg:col-span-7 flex flex-col min-h-0">
                        <div className="glass-card flex-1 p-4 flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
                            <div className="flex justify-between items-center mb-4 sticky top-0 bg-black/80 backdrop-blur-md p-2 -mx-2 z-10 rounded-lg">
                                <h2 className="font-bold flex items-center gap-2">
                                    <Users className="text-accent w-5 h-5" /> TEAM STANDINGS
                                </h2>
                                <div className="text-xs text-gray-400 bg-white/5 px-3 py-1 rounded-lg">
                                    {teams.reduce((acc, t) => acc + (t.players?.length || 0), 0)} Players Sold
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-3 pb-2">
                                {displayTeams.map((team) => {
                                    return (
                                        <div
                                            key={team.id}
                                            className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col gap-3"
                                        >
                                            <div className="flex justify-between items-center gap-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 shrink-0 overflow-hidden">
                                                        <img
                                                            src={`/assets/teamlogos/${team.name.toLowerCase().replace(' ', '_')}.png`}
                                                            alt={team.name}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => (e.currentTarget.style.display = 'none')}
                                                        />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="font-black text-base truncate leading-tight">{team.name}</h3>
                                                        {team.captain && (
                                                            <p className="text-xs text-accent font-bold truncate">
                                                                Captain: {team.captain.name}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-accent font-black text-base">{team.balance.toLocaleString()}</p>
                                                    <p className="text-[9px] uppercase text-gray-400 font-bold">Tokens</p>
                                                </div>
                                            </div>

                                            {/* Roster Grid */}
                                            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10">
                                                {/* Captain */}
                                                <div className="flex flex-col items-center text-center">
                                                    <div className="w-14 h-14 rounded-full bg-accent/20 border-2 border-accent overflow-hidden relative">
                                                        {team.captain && (
                                                            <img
                                                                src={`/assets/employee/thumb/${team.captain.name.toLowerCase()}.png`}
                                                                alt={team.captain.name}
                                                                className="w-full h-full object-cover object-top"
                                                                onError={(e) => (e.currentTarget.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + team.captain?.name)}
                                                            />
                                                        )}
                                                    </div>
                                                    <span className="text-xs font-black text-white mt-1 truncate max-w-full block" title={team.captain?.name}>
                                                        {team.captain?.name || 'Captain'}
                                                    </span>
                                                    <span className="text-[9px] text-accent font-bold uppercase tracking-wider">Captain</span>
                                                </div>

                                                {/* Players */}
                                                {team.players?.map((player) => {
                                                    const isCommittee = isInnovationCommittee(player.name);
                                                    return (
                                                        <div key={player.id} className="flex flex-col items-center text-center">
                                                            <div className={`w-14 h-14 rounded-full overflow-hidden relative ${
                                                                isCommittee 
                                                                    ? 'ring-2 ring-purple-400 ring-offset-1 ring-offset-black bg-purple-500/20 shadow-[0_0_12px_rgba(168,85,247,0.35)]' 
                                                                    : 'bg-white/10 border border-white/20'
                                                            }`}>
                                                                <img
                                                                    src={`/assets/employee/thumb/${player.name.toLowerCase()}.png`}
                                                                    alt={player.name}
                                                                    className="w-full h-full object-cover object-top"
                                                                    onError={(e) => (e.currentTarget.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + player.name)}
                                                                />
                                                            </div>
                                                            <span className={`text-xs font-black mt-1 truncate max-w-full block ${isCommittee ? 'text-purple-200' : 'text-white'}`} title={player.name}>
                                                                {player.name}
                                                            </span>
                                                            <span className={`text-[9px] font-bold uppercase tracking-wider ${isCommittee ? 'text-purple-300' : 'text-gray-400'}`}>
                                                                {isCommittee ? 'Official' : 'Player'}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* When Auction is NOT ACTIVE: Full-Page Squads Showcase */
                <div className="max-w-7xl mx-auto w-full pb-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {displayTeams.map((team) => {
                            const rosterList = [
                                ...(team.captain ? [{ ...team.captain, isCaptain: true }] : []),
                                ...(team.players || []).map(p => ({ ...p, isCaptain: false }))
                            ];

                            return (
                                <motion.div
                                    key={team.id}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="glass-card p-6 border-white/10 hover:border-accent/50 transition-all flex flex-col justify-between group shadow-xl"
                                >
                                    <div>
                                        {/* Team Header */}
                                        <div className="flex items-center gap-4 pb-4 border-b border-white/10 mb-6">
                                            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/15 overflow-hidden shrink-0 p-1 flex items-center justify-center">
                                                <img
                                                    src={`/assets/teamlogos/${team.name.toLowerCase().replace(' ', '_')}.png`}
                                                    alt={team.name}
                                                    className="w-full h-full object-contain"
                                                    onError={(e) => (e.currentTarget.style.display = 'none')}
                                                />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h2 className="text-xl sm:text-2xl font-black text-white group-hover:text-accent transition-colors truncate">
                                                    {team.name}
                                                </h2>
                                                <p className="text-xs text-gray-400 font-medium mt-0.5">
                                                    Squad Size: <strong className="text-white">{rosterList.length} Members</strong>
                                                </p>
                                            </div>
                                        </div>

                                        {/* Players Grid with Large, Fully Visible Names & Committee Highlight */}
                                        <div className="grid grid-cols-3 gap-3.5 sm:gap-4">
                                            {rosterList.map((member) => {
                                                const isCommittee = isInnovationCommittee(member.name);
                                                return (
                                                    <div
                                                        key={member.id}
                                                        className={`flex flex-col items-center text-center p-2 rounded-2xl border transition-all ${
                                                            member.isCaptain
                                                                ? 'bg-accent/[0.04] hover:bg-accent/[0.08] border-accent/20'
                                                                : isCommittee
                                                                ? 'bg-purple-500/[0.08] hover:bg-purple-500/[0.14] border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.12)]'
                                                                : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/5'
                                                        }`}
                                                    >
                                                        {/* Avatar with Badges */}
                                                        <div className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden mb-2 shadow-lg ${
                                                            member.isCaptain 
                                                                ? 'ring-2 ring-accent ring-offset-2 ring-offset-black bg-accent/20' 
                                                                : isCommittee
                                                                ? 'ring-2 ring-purple-400 ring-offset-2 ring-offset-black bg-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.4)]'
                                                                : 'ring-1 ring-white/20 bg-white/10'
                                                        }`}>
                                                            <img
                                                                src={`/assets/employee/thumb/${member.name.toLowerCase()}.png`}
                                                                alt={member.name}
                                                                className="w-full h-full object-cover object-top"
                                                                onError={(e) => (e.currentTarget.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + member.name)}
                                                            />
                                                        </div>

                                                        {/* Player Name: Large, Fully Readable */}
                                                        <span className={`text-xs sm:text-sm font-bold leading-tight w-full break-words px-1 ${
                                                            isCommittee ? 'text-purple-200' : 'text-white'
                                                        }`}>
                                                            {member.name}
                                                        </span>

                                                        {/* Role Badge */}
                                                        <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider mt-1 px-2.5 py-0.5 rounded-full flex items-center justify-center ${
                                                            member.isCaptain
                                                                ? 'bg-accent/20 text-accent border border-accent/30'
                                                                : isCommittee
                                                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                                                                : 'text-gray-400'
                                                        }`}>
                                                            {member.isCaptain ? (
                                                                'Captain'
                                                            ) : isCommittee ? (
                                                                'Official'
                                                            ) : (
                                                                'Player'
                                                            )}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            )}
            {/* CELEBRATION OVERLAY */}
            <AnimatePresence>
                {celebration && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md pointer-events-none"
                    >
                        <motion.div
                            initial={{ scale: 0.5, y: 50, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 1.5, y: -50, opacity: 0 }}
                            transition={{ type: "spring", damping: 12, stiffness: 100 }}
                            className="text-center relative"
                        >
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
                                className="text-accent text-sm font-black uppercase tracking-[0.5em] mb-4"
                            >
                                Auction Result
                            </motion.div>

                            <motion.div
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className={`text-[10rem] font-black italic leading-none text-transparent bg-clip-text ${celebration.type === 'SOLD' ? 'bg-gradient-to-b from-green-300 via-green-500 to-green-700' : 'bg-gradient-to-b from-red-300 via-red-500 to-red-700'} drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]`}
                            >
                                {celebration.type}
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1, transition: { delay: 0.3 } }}
                                className="mt-8 space-y-2"
                            >
                                <div className="text-5xl font-black uppercase tracking-tighter text-white">
                                    {celebration.playerName}
                                </div>
                                {celebration.type === 'SOLD' && (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="px-6 py-2 bg-accent/20 border border-accent/20 rounded-full text-2xl font-black italic text-accent">
                                            Sold to {celebration.teamName}
                                        </div>
                                        <div className="text-4xl font-bold text-gray-400">
                                            ${celebration.price?.toLocaleString()}
                                        </div>
                                    </div>
                                )}
                                {celebration.type === 'UNSOLD' && (
                                    <div className="px-6 py-2 bg-red-500/20 border border-red-500/20 rounded-full text-2xl font-black italic text-red-500">
                                        Returning to Pool
                                    </div>
                                )}
                            </motion.div>
                        </motion.div>

                        {/* Particle effects could go here if using a library, but CSS can work too */}
                        {celebration.type === 'SOLD' && (
                            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                {[...Array(20)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{
                                            top: "50%",
                                            left: "50%",
                                            opacity: 1,
                                            scale: 0
                                        }}
                                        animate={{
                                            top: `${Math.random() * 100}%`,
                                            left: `${Math.random() * 100}%`,
                                            opacity: 0,
                                            scale: Math.random() * 2
                                        }}
                                        transition={{
                                            duration: 2 + Math.random() * 2,
                                            repeat: Infinity,
                                            delay: Math.random() * 2
                                        }}
                                        className="absolute w-2 h-2 bg-accent rounded-full"
                                    />
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
    );
}
