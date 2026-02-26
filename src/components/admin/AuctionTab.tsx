'use client';

import { motion } from 'framer-motion';
import { Gavel, Search, Plus, Play, Timer, Trash2, Edit, RefreshCw } from 'lucide-react';

interface Player {
    id: string;
    name: string;
    rating: number;
    pool: string;
    min_bid: number;
    is_auctioned: boolean;
    team_id: string | null;
}

interface AuctionTabProps {
    players: Player[];
    auctionStatus: any;
    timeLeft: number | null;
    startingAuctionId: string | null;
    onStartAuction: (playerId: string) => void;
    onEditPlayer: (player: Player) => void;
    onAddPlayer: () => void;
    onRemovePlayer: (id: string) => void;
}

export default function AuctionTab({ players, auctionStatus, timeLeft, startingAuctionId, onStartAuction, onEditPlayer, onAddPlayer, onRemovePlayer }: AuctionTabProps) {
    const unassignedPlayers = players.filter(p => !p.team_id).sort((a, b) => {
        if (a.is_auctioned && !b.is_auctioned) return 1;
        if (!a.is_auctioned && b.is_auctioned) return -1;
        return 0;
    });
    const auctionedPlayers = players.filter(p => p.is_auctioned);

    return (
        <section className="mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h2 className="text-2xl font-black flex items-center gap-3">
                        <Gavel className="text-accent" /> LIVE AUCTION CONTROL
                    </h2>
                    <p className="text-gray-400 mt-1">Manage player sales and real-time bidding sessions.</p>
                </div>
                <div className="flex items-center gap-4">
                    {auctionStatus?.status === 'ACTIVE' && (
                        <div className="bg-red-500/10 border border-red-500/20 px-6 py-2 rounded-xl flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                                <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Live Auction</span>
                            </div>
                            <div className="w-px h-4 bg-red-500/20" />
                            <div className="flex items-center gap-2">
                                <Timer className="w-4 h-4 text-red-500" />
                                <span className={`text-xl font-black font-mono ${timeLeft !== null && timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                                    00:{timeLeft !== null ? String(timeLeft).padStart(2, '0') : '--'}
                                </span>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={onAddPlayer}
                        className="bg-accent text-white font-bold px-6 py-3 rounded-xl transition-all hover:scale-105 flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" /> ADD PLAYER
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    {auctionStatus?.status === 'ACTIVE' && (
                        <div className="glass-card overflow-hidden border-accent/30 bg-gradient-to-br from-accent/5 to-transparent p-6 flex flex-col sm:flex-row items-center gap-6">
                            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/10 shrink-0 shadow-lg shadow-accent/20">
                                <img
                                    src={`/assets/employee/${auctionStatus.playerName?.toLowerCase()}.png`}
                                    alt={auctionStatus.playerName}
                                    className="w-full h-full object-cover"
                                    onError={(e) => (e.currentTarget.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + auctionStatus.playerName)}
                                />
                            </div>
                            <div className="flex-1 text-center sm:text-left">
                                <span className="px-3 py-1 bg-accent/20 text-accent text-[10px] font-black uppercase tracking-widest rounded-lg border border-accent/20 mb-2 inline-block">
                                    Currently on Block
                                </span>
                                <h3 className="text-3xl font-black">{auctionStatus.playerName}</h3>
                                <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mb-1">Pool {auctionStatus.pool}</p>
                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-3">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-gray-500 uppercase font-black">Base Price</span>
                                        <span className="font-mono text-white text-lg">{auctionStatus.basePrice?.toLocaleString()}</span>
                                    </div>
                                    <div className="w-px h-8 bg-white/10" />
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-accent uppercase font-black">Current Bid</span>
                                        <span className="font-mono text-accent text-lg font-bold">{auctionStatus.currentBid?.toLocaleString() || '-'}</span>
                                    </div>
                                    {auctionStatus.currentBidderName && (
                                        <>
                                            <div className="w-px h-8 bg-white/10" />
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-blue-400 uppercase font-black">Leading</span>
                                                <span className="text-white text-sm font-bold truncate max-w-[120px]">{auctionStatus.currentBidderName}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="glass-card overflow-hidden">
                        <div className="p-4 bg-white/5 border-b border-white/5 flex justify-between items-center">
                            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Unassigned Players ({unassignedPlayers.length})</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-black/20 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                    <tr>
                                        <th className="px-6 py-4">Player</th>
                                        <th className="px-6 py-4">Pool</th>
                                        <th className="px-6 py-4">Base Price</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {unassignedPlayers.map(player => (
                                        <tr key={player.id} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10">
                                                        <img
                                                            src={`/assets/employee/thumb/${player.name.toLowerCase()}.png`}
                                                            alt={player.name}
                                                            onError={(e) => (e.currentTarget.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + player.name)}
                                                        />
                                                    </div>
                                                    <span className="font-bold text-sm">{player.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-1 bg-white/5 rounded text-[10px] font-black text-accent">{player.pool}</span>
                                                    {!!player.is_auctioned ? (
                                                        <span className="px-2 py-1 bg-red-500/20 text-red-500 rounded text-[10px] font-black uppercase tracking-widest">
                                                            Unsold
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-sm text-gray-300">
                                                {player.min_bid.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => onEditPlayer(player)}
                                                        className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white transition-all border border-white/5"
                                                        title="Edit Base Price"
                                                    >
                                                        <Edit className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        onClick={() => onRemovePlayer(player.id)}
                                                        className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-red-500 transition-all border border-white/5"
                                                        title="Remove Player"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        onClick={() => onStartAuction(player.id)}
                                                        disabled={auctionStatus?.status === 'ACTIVE' || startingAuctionId === player.id}
                                                        className="px-4 py-2 rounded-lg bg-accent text-white font-black text-[10px] uppercase shadow-lg shadow-accent/20 hover:scale-105 transition-all disabled:opacity-30 disabled:hover:scale-100 flex items-center gap-2"
                                                    >
                                                        {startingAuctionId === player.id ? (
                                                            <RefreshCw className="w-3 h-3 animate-spin" />
                                                        ) : (
                                                            <Play className="w-3 h-3" />
                                                        )}
                                                        Start Sale
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="glass-card">
                        <div className="p-4 bg-white/5 border-b border-white/5">
                            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Recently Auctioned</h3>
                        </div>
                        <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar">
                            {auctionedPlayers.length > 0 ? (
                                auctionedPlayers.reverse().slice(0, 10).map(player => (
                                    <div key={player.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10">
                                                <img
                                                    src={`/assets/employee/thumb/${player.name.toLowerCase()}.png`}
                                                    alt={player.name}
                                                    onError={(e) => (e.currentTarget.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + player.name)}
                                                />
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-white">{player.name}</div>
                                                <div className="text-[10px] text-gray-500 uppercase font-black">{player.team_id ? 'Sold' : 'Unsold'}</div>
                                            </div>
                                        </div>
                                        <div className="text-right flex items-center justify-end gap-2">
                                            <span className={`text-[10px] font-black px-2 py-1 rounded uppercase ${player.team_id ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                                {player.team_id ? 'SOLD' : 'UNSOLD'}
                                            </span>

                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 opacity-40">
                                    <p className="text-xs font-bold uppercase tracking-widest">No history yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
