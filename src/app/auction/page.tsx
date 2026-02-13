'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, TrendingUp, Users, DollarSign, Award, Info } from 'lucide-react';

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
    nextPlayer?: { name: string, pool: string, min_bid: number };
}

interface Team {
    id: string;
    name: string;
    balance: number;
    captain?: { id: string; name: string };
    players: { id: string; name: string; rating: number }[];
}

export default function AuctionPage() {
    const [auction, setAuction] = useState<AuctionStatus | null>(null);
    const [teams, setTeams] = useState<Team[]>([]);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [myTeamId, setMyTeamId] = useState<string | null>(null);
    const [myCaptainName, setMyCaptainName] = useState<string | null>(null);

    useEffect(() => {
        const stored = localStorage.getItem('sipl_captain');
        if (stored) {
            const data = JSON.parse(stored);
            setMyTeamId(data.team_id);
            setMyCaptainName(data.name);
        }
    }, []);

    const fetchData = useCallback(async () => {
        try {
            const [auctionRes, teamsRes] = await Promise.all([
                fetch('/api/auction/status'),
                fetch('/api/teams')
            ]);
            const auctionData = await auctionRes.json();
            const teamsData = await teamsRes.json();

            setAuction(auctionData);
            setTeams(teamsData);

            if (auctionData.status === 'ACTIVE' && auctionData.timerEnd) {
                const remaining = Math.max(0, Math.floor((new Date(auctionData.timerEnd).getTime() - Date.now()) / 1000));
                setTimeLeft(remaining);

                if (remaining === 0) {
                    fetch('/api/auction/finalize', { method: 'POST' });
                }
            } else {
                setTimeLeft(null);
            }
        } catch (err) {
            console.error('Fetch error:', err);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 1000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleBid = async (amount: number) => {
        if (!auction || auction.status !== 'ACTIVE' || !myTeamId) {
            if (!myTeamId) alert('Please identify yourself as a Captain first!');
            return;
        }

        const myTeam = teams.find(t => t.id === myTeamId);
        if (myTeam && amount > myTeam.balance) {
            alert('Insufficient tokens for this bid!');
            return;
        }

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
            else fetchData();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <main className="h-screen flex flex-col p-4 overflow-hidden bg-black text-white">
            <header className="flex justify-between items-center mb-4 shrink-0">
                <div className="flex items-center gap-4">
                    <img src="/assets/logo.png" alt="SIPL" className="h-12 w-auto" onError={(e) => e.currentTarget.style.display = 'none'} />
                    <div>
                        <h1 className="text-2xl font-black text-glow tracking-tighter">SIPL LIVE AUCTION</h1>
                        <p className="text-gray-400 text-xs">Simsyn Innovation Premier League</p>
                    </div>
                </div>
                {timeLeft !== null && (
                    <div className={`glass-card px-4 py-2 flex items-center gap-3 border-2 ${timeLeft < 10 ? 'border-red-500 animate-pulse' : 'border-accent'}`}>
                        <Timer className={`w-5 h-5 ${timeLeft < 10 ? 'text-red-500' : 'text-accent'}`} />
                        <span className="text-2xl font-mono font-bold leading-none">{timeLeft}s</span>
                    </div>
                )}
            </header>

            <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
                {/* Left Column: Active Auction (5 cols) */}
                <div className="col-span-5 flex flex-col gap-4 min-h-0">
                    <AnimatePresence mode="wait">
                        {auction?.status === 'ACTIVE' ? (
                            <motion.div
                                key={auction.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.05 }}
                                className="glass-card flex-1 p-6 flex flex-col border-accent/30 bg-gradient-to-br from-accent/5 to-transparent relative overflow-hidden"
                            >
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
                                    <p className="text-gray-400">Base Price: <span className="text-white font-bold">{auction.basePrice?.toLocaleString()}</span></p>
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
                                        <div className="space-y-3">
                                            {!auction.currentBidderName && (
                                                <button
                                                    onClick={() => handleBid(auction.basePrice || 0)}
                                                    className="w-full bg-accent hover:bg-yellow-400 text-black font-black py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                                                >
                                                    <TrendingUp className="w-5 h-5" /> BID BASE PRICE
                                                </button>
                                            )}
                                            <div className="grid grid-cols-4 gap-2">
                                                {[10000, 25000, 50000, 100000].map(inc => (
                                                    <button
                                                        key={inc}
                                                        onClick={() => handleBid((auction.currentBid || 0) + inc)}
                                                        className="bg-white/10 hover:bg-white/20 py-2 rounded-lg font-bold text-sm transition-all"
                                                    >
                                                        +{inc / 1000}k
                                                    </button>
                                                ))}
                                            </div>
                                            <button
                                                onClick={() => handleBid((auction.currentBid || 0) + 5000)}
                                                className="w-full btn-primary py-3 font-bold text-lg"
                                            >
                                                PLACE BID {((auction.currentBid || 0) + 5000).toLocaleString()}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="idle"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="glass-card flex-1 p-12 flex flex-col items-center justify-center text-center"
                            >
                                <Users className="w-16 h-16 text-gray-600 mb-6" />
                                <h3 className="text-2xl font-bold text-gray-500">Waiting for Auctioneer</h3>
                                {auction?.nextPlayer && (
                                    <div className="mt-8 p-6 bg-white/5 rounded-xl border border-white/10 w-full max-w-sm">
                                        <p className="text-accent text-xs font-bold uppercase tracking-widest mb-1">Up Next</p>
                                        <p className="text-2xl font-bold">{auction.nextPlayer.name}</p>
                                        <p className="text-gray-500 text-sm">Pool {auction.nextPlayer.pool}</p>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Right Column: Team Standings (7 cols) */}
                <div className="col-span-7 flex flex-col min-h-0">
                    <div className="glass-card flex-1 p-4 flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between items-center mb-4 sticky top-0 bg-black/80 backdrop-blur-md p-2 -mx-2 z-10 rounded-lg">
                            <h2 className="font-bold flex items-center gap-2">
                                <Users className="text-accent w-5 h-5" /> TEAM STANDINGS
                            </h2>
                            <div className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded">
                                {teams.reduce((acc, t) => acc + (t.players?.length || 0), 0)} Players Sold
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 pb-2">
                            {teams.sort((a, b) => b.balance - a.balance).map((team, idx) => (
                                <motion.div
                                    key={team.id}
                                    layout
                                    className={`bg-white/5 p-3 rounded-xl border ${myTeamId === team.id ? 'border-accent bg-accent/5' : 'border-white/5'} flex flex-col gap-3 group hover:bg-white/10 transition-colors`}
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-14 h-14 rounded bg-white/5 border border-white/10 shrink-0 overflow-hidden">
                                                <img
                                                    src={`/assets/teamlogos/${team.name.toLowerCase().replace(' ', '_')}.png`}
                                                    alt={team.name}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => (e.currentTarget.style.display = 'none')}
                                                />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-black text-lg truncate leading-tight">{team.name}</h3>
                                                <p className="text-[10px] text-gray-400 mt-0.5 font-bold">Rank #{idx + 1}</p>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-accent font-black text-2xl">{team.balance.toLocaleString()}</p>
                                            <p className="text-[10px] uppercase text-gray-500 font-bold">Tokens</p>
                                        </div>
                                    </div>

                                    {/* Rosters with 6 Placeholders */}
                                    <div className="grid grid-cols-3 gap-2">
                                        {/* 1. Captain */}
                                        <div className="aspect-square rounded-full bg-accent/20 border border-accent/50 overflow-hidden relative" title={`Captain: ${team.captain?.name || 'Unknown'}`}>
                                            {team.captain ? (
                                                <img
                                                    src={`/assets/employee/${team.captain.name.toLowerCase()}.png`}
                                                    alt={team.captain.name}
                                                    className="w-full h-full object-cover object-top"
                                                    onError={(e) => (e.currentTarget.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + team.captain?.name)}
                                                />
                                            ) : <span className="text-xs flex items-center justify-center h-full">?</span>}
                                            <div className="absolute bottom-0 inset-x-0 bg-accent text-[8px] text-black font-black text-center leading-none py-0.5">C</div>
                                        </div>

                                        {/* 2-6. Players + Placeholders */}
                                        {Array.from({ length: 9 }).map((_, i) => {
                                            const player = team.players?.[i];
                                            if (i >= 5 && !player) return null; // Only show extra slots if filled, otherwise strict 6
                                            if (i >= 5 && player) {
                                                // Overflow handling
                                                return (
                                                    <div key={player.id} className="aspect-square rounded-full bg-white/5 border border-white/10 overflow-hidden" title={player.name}>
                                                        <img
                                                            src={`/assets/employee/${player.name.toLowerCase()}.png`}
                                                            alt={player.name}
                                                            className="w-full h-full object-cover object-top"
                                                            onError={(e) => (e.currentTarget.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + player.name)}
                                                        />
                                                    </div>
                                                )
                                            }

                                            // First 5 players (slots 2-6)
                                            if (i < 5) {
                                                return (
                                                    <div key={i} className={`aspect-square rounded-full overflow-hidden flex items-center justify-center ${player ? 'bg-white/10 border border-white/20' : 'bg-white/5 border border-white/5 border-dashed'}`} title={player?.name || 'Empty Slot'}>
                                                        {player ? (
                                                            <img
                                                                src={`/assets/employee/${player.name.toLowerCase()}.png`}
                                                                alt={player.name}
                                                                className="w-full h-full object-cover object-top"
                                                                onError={(e) => (e.currentTarget.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + player.name)}
                                                            />
                                                        ) : (
                                                            <div className="w-1.5 h-1.5 rounded-full bg-white/10"></div>
                                                        )}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
