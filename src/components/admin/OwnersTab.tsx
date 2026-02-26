'use client';

import { motion } from 'framer-motion';
import { Shield, Home, User, Edit2, X } from 'lucide-react';

interface Owner {
    id: string;
    name: string;
    team_id: string | null;
    teamName?: string | null;
    balance?: number;
    role?: string;
}

interface Player {
    id: string;
    name: string;
    team_id: string | null;
    teamName?: string | null;
    role?: string;
}

interface Team {
    id: string;
    name: string;
    captain_id?: string | null;
}

interface OwnersTabProps {
    owners: Owner[];
    players: Player[];
    teams: Team[];
    onResetPassword: (id: string) => void;
    onTopup: (teamId: string) => void;
    onPlayerAction: (id: string, action: 'release' | 'assign', team_id?: string) => void;
}

export default function OwnersTab({ owners, players, teams, onResetPassword, onTopup, onPlayerAction }: OwnersTabProps) {
    return (
        <section className="mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black flex items-center gap-3">
                    <Shield className="text-accent" /> PLAYER & OWNER MANAGEMENT
                </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...owners, ...players].sort((a, b) => a.name.localeCompare(b.name)).map(person => {
                    const isOwner = person.role === 'OWNER';
                    const isCaptain = teams.some(t => t.captain_id === person.id);
                    const personBalance = isOwner ? (person as Owner).balance : null;

                    return (
                        <div key={person.id} className={`glass-card p-6 flex flex-col items-center text-center relative overflow-hidden ${isOwner ? 'border-accent/30' : isCaptain ? 'border-purple-500/30' : 'border-white/5'}`}>
                            {isOwner && (
                                <div className="absolute top-0 right-0 bg-accent text-[8px] font-black px-2 py-0.5 rounded-bl uppercase tracking-widest text-white">Owner</div>
                            )}
                            {isCaptain && (
                                <div className="absolute top-0 right-0 bg-purple-600 text-[8px] font-black px-2 py-0.5 rounded-bl uppercase tracking-widest text-white">Captain</div>
                            )}

                            <div className="w-16 h-16 rounded-full overflow-hidden mb-4 border-2 border-white/10">
                                <img
                                    src={`/assets/employee/thumb/${person.name.toLowerCase()}.png`}
                                    alt={person.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => (e.currentTarget.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + person.name)}
                                />
                            </div>
                            <h3 className="font-bold mb-1">{person.name}</h3>
                            <p className="text-xs text-accent font-black mb-1">{person.teamName || 'NO TEAM'}</p>

                            {isOwner && person.team_id && (
                                <div className="mb-4">
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mb-1">Wallet</p>
                                    <div className="text-xl font-black text-white">
                                        {personBalance?.toLocaleString() || 0}
                                        <span className="text-[10px] text-accent ml-1">Tokens</span>
                                    </div>
                                </div>
                            )}

                            <div className="mt-auto pt-4 flex flex-wrap justify-center gap-2 w-full border-t border-white/5">
                                <button
                                    onClick={() => onResetPassword(person.id)}
                                    className="px-3 py-1.5 rounded-lg bg-white/5 text-[10px] font-black uppercase text-gray-400 hover:text-white transition-all border border-white/5"
                                >
                                    Reset PWD
                                </button>
                                {isOwner && person.team_id && (
                                    <button
                                        onClick={() => onTopup(person.team_id!)}
                                        className="px-3 py-1.5 rounded-lg bg-accent/10 text-[10px] font-black uppercase text-accent hover:bg-accent hover:text-white transition-all border border-accent/20"
                                    >
                                        Topup
                                    </button>
                                )}
                                {person.team_id && (
                                    <button
                                        onClick={() => onPlayerAction(person.id, 'release')}
                                        className="px-3 py-1.5 rounded-lg bg-red-500/10 text-[10px] font-black uppercase text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                                    >
                                        Release
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
