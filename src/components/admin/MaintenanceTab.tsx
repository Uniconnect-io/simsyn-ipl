'use client';

import { motion } from 'framer-motion';
import { Settings, RefreshCw, Trash2, Database, ShieldAlert } from 'lucide-react';

interface MaintenanceTabProps {
    onClearCache: () => void;
    onResetAuction: () => void;
    onTriggerAutomation: () => void;
    onSyncData: () => void;
}

export default function MaintenanceTab({ onClearCache, onResetAuction, onTriggerAutomation, onSyncData }: MaintenanceTabProps) {
    return (
        <section className="mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h2 className="text-2xl font-black flex items-center gap-3">
                        <Settings className="text-red-500" /> SYSTEM MAINTENANCE
                    </h2>
                    <p className="text-gray-400 mt-1">Critical backend operations and data management.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="glass-card p-8 border-red-500/10 hover:border-red-500/30 transition-all group">
                    <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <RefreshCw className="text-red-500 w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Reset Auction</h3>
                    <p className="text-sm text-gray-500 mb-6 leading-relaxed">Clears all auction history, bid logs, and resets player statuses to unassigned. <span className="text-red-500 font-bold uppercase text-[10px]">Irreversible</span></p>
                    <button
                        onClick={onResetAuction}
                        className="w-full py-3 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 font-black text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                        <ShieldAlert className="w-4 h-4" /> Hard Reset
                    </button>
                </div>

                <div className="glass-card p-8 border-white/5 hover:border-accent/20 transition-all group">
                    <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <Database className="text-accent w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Sync Realtime</h3>
                    <p className="text-sm text-gray-500 mb-6 leading-relaxed">Manually push a heartbeat signal to all connected clients to synchronize state and timers.</p>
                    <button
                        onClick={onSyncData}
                        className="w-full py-3 rounded-xl bg-accent/10 text-accent border border-accent/20 font-black text-xs uppercase tracking-widest hover:bg-accent hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" /> Push Heartbeat
                    </button>
                </div>

                <div className="glass-card p-8 border-white/5 hover:border-blue-500/20 transition-all group">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <Trash2 className="text-blue-500 w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Clear API Cache</h3>
                    <p className="text-sm text-gray-500 mb-6 leading-relaxed">Invalidate all server-side cached responses for ideas, players, and leaderboard data.</p>
                    <button
                        onClick={onClearCache}
                        className="w-full py-3 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 font-black text-xs uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                        <Trash2 className="w-4 h-4" /> Purge Cache
                    </button>
                </div>
            </div>

            <div className="mt-12 p-8 glass-card border-dashed border-white/10 flex flex-col items-center text-center max-w-2xl mx-auto">
                <h3 className="text-lg font-bold mb-2 uppercase tracking-tight">Automation Trigger</h3>
                <p className="text-sm text-gray-500 mb-6">Manually trigger the next scheduled battle event or auction sequence if the automated timer fails.</p>
                <button
                    onClick={onTriggerAutomation}
                    className="px-12 py-4 rounded-2xl bg-white/5 text-white border border-white/10 font-black text-sm uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                    Run Next Event
                </button>
            </div>
        </section>
    );
}
