'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, User, ArrowLeft, Shield, CheckCircle, RefreshCw, Star } from 'lucide-react';
import Link from 'next/link';

interface Player {
    id: string;
    name: string;
    rating: number;
    pool: string;
    sold_price: number;
}

export default function ManageTeam() {
    const [players, setPlayers] = useState<Player[]>([]);
    const [team, setTeam] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchRoster();
    }, []);

    const fetchRoster = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/owner/team/roster');
            const data = await res.json();
            if (data.error) {
                setMessage({ type: 'error', text: data.error });
            } else {
                setPlayers(data.players);
                setTeam(data.team);
            }
        } catch (e) {
            setMessage({ type: 'error', text: 'Failed to load roster' });
        } finally {
            setLoading(false);
        }
    };

    const handleAssignCaptain = async (playerId: string) => {
        setUpdating(true);
        setMessage(null);
        try {
            const res = await fetch('/api/owner/team/assign-captain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerId })
            });
            const data = await res.json();
            if (data.success) {
                setMessage({ type: 'success', text: 'Captain assigned successfully!' });
                setTeam({ ...team, captain_id: playerId });
            } else {
                setMessage({ type: 'error', text: data.error });
            }
        } catch (e) {
            setMessage({ type: 'error', text: 'Failed to assign captain' });
        } finally {
            setUpdating(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <RefreshCw className="w-8 h-8 animate-spin text-accent" />
        </div>
    );

    return (
        <main className="min-h-screen p-6 max-w-7xl mx-auto">
            <header className="flex justify-between items-center mb-12">
                <div>
                    <Link href="/owner" className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-4 group">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to HQ
                    </Link>
                    <h1 className="text-5xl font-black text-glow uppercase tracking-tighter">Manage {team?.name}</h1>
                </div>
                <div className="glass-card px-6 py-3 flex items-center gap-4 border-accent/20">
                    <Shield className="text-accent" />
                    <div>
                        <p className="text-[10px] uppercase font-black text-gray-500 tracking-widest leading-none">Team Identity</p>
                        <p className="text-xl font-bold">{team?.name}</p>
                    </div>
                </div>
            </header>

            {message && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl mb-8 flex items-center gap-3 ${message.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-500' : 'bg-red-500/10 border border-red-500/20 text-red-500'
                        }`}
                >
                    {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                    <span className="font-bold">{message.text}</span>
                </motion.div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <section className="lg:col-span-2">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                        <User className="text-accent" /> Team Roster
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {players.length === 0 ? (
                            <div className="col-span-full glass-card p-12 text-center border-dashed border-white/10">
                                <p className="text-gray-500">No players purchased yet. Head to the Auction!</p>
                            </div>
                        ) : (
                            players.map(player => (
                                <motion.div
                                    key={player.id}
                                    whileHover={{ y: -5 }}
                                    className={`glass-card p-6 border transition-all ${team?.captain_id === player.id ? 'border-accent bg-accent/5' : 'border-white/5 hover:border-white/20'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/10">
                                                <img
                                                    src={`/assets/employee/${player.name.toLowerCase()}.png`}
                                                    alt={player.name}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => (e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`)}
                                                />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold">{player.name}</h3>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-white/5 text-gray-400 uppercase tracking-widest">{player.pool}</span>
                                                    <div className="flex gap-0.5">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star key={i} className={`w-3 h-3 ${i < player.rating ? 'text-accent fill-accent' : 'text-white/10'}`} />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {team?.captain_id === player.id && (
                                            <div className="bg-accent text-black text-[10px] font-black px-2 py-1 rounded flex items-center gap-1 uppercase tracking-tighter">
                                                <Shield className="w-3 h-3" /> Captain
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex justify-between items-center pt-4 border-t border-white/5">
                                        <div>
                                            <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Purchase Price</p>
                                            <p className="font-bold text-accent">{player.sold_price?.toLocaleString() || 'N/A'}</p>
                                        </div>
                                        {team?.captain_id !== player.id && (
                                            <button
                                                onClick={() => handleAssignCaptain(player.id)}
                                                disabled={updating}
                                                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-accent hover:text-black transition-all text-xs font-bold uppercase tracking-widest disabled:opacity-50"
                                            >
                                                Assign Captain
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </section>

                <aside className="space-y-8">
                    <div className="glass-card p-8 bg-accent/5 border-accent/20">
                        <h3 className="text-xl font-bold mb-4 uppercase tracking-tighter border-b border-accent/20 pb-4">Team Strategy</h3>
                        <p className="text-gray-400 text-sm leading-relaxed mb-6">
                            As the Team Owner, you must nominate one player as your Captain. This player will lead the team during matches and individual battles.
                        </p>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent">1</div>
                                <p className="text-xs text-gray-400">Winning battles adds points to the table.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent">2</div>
                                <p className="text-xs text-gray-400">NRR scales with performance quality.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent">3</div>
                                <p className="text-xs text-gray-400">Captain selection can be changed anytime.</p>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-8 border-white/5">
                        <h3 className="text-xl font-bold mb-4 uppercase tracking-tighter border-b border-white/10 pb-4">Auction Status</h3>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500 text-sm">Squad Size</span>
                            <span className="font-bold">{players.length + 1} / 6</span>
                        </div>
                        <div className="w-full bg-white/5 h-2 rounded-full mt-4 overflow-hidden">
                            <div
                                className="bg-accent h-full transition-all duration-1000"
                                style={{ width: `${Math.min(((players.length + 1) / 6) * 100, 100)}%` }}
                            />
                        </div>
                    </div>
                </aside>
            </div>
        </main>
    );
}
