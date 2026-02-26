'use client';

import { motion } from 'framer-motion';
import { Zap, Plus, List, FileText, X, Edit2 } from 'lucide-react';

interface Match {
    id: string;
    team1_id: string | null;
    team2_id: string | null;
    team1Name?: string;
    team2Name?: string;
    date: string;
    status: string;
}

interface CaseStudy {
    id: string;
    title: string;
    description: string;
}

interface BattlesTabProps {
    matches: Match[];
    individualBattles: any[];
    caseStudies: CaseStudy[];
    onStartBattle: (matchId: string, caseDesc?: string) => void;
    onCreateBattle: () => void;
    onManageQuestions: (battleId: string) => void;
    onViewReport: (battleId: string) => void;
    onStartIndividualBattle: (battleId: string) => void;
    onEndIndividualBattle: (battleId: string) => void;
    onEditBattle: (battle: any) => void;
    onDeleteMatch: (id: string) => void;
}

export default function BattlesTab({
    matches,
    individualBattles,
    caseStudies,
    onStartBattle,
    onCreateBattle,
    onManageQuestions,
    onViewReport,
    onStartIndividualBattle,
    onEndIndividualBattle,
    onEditBattle,
    onDeleteMatch
}: BattlesTabProps) {
    return (
        <section className="mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h2 className="text-2xl font-black flex items-center gap-3">
                        <Zap className="text-accent" /> BATTLE MANAGEMENT
                    </h2>
                    <p className="text-gray-400 mt-1">Control center for all Match and Individual battles.</p>
                </div>
                <button
                    onClick={onCreateBattle}
                    className="bg-accent text-white font-bold px-6 py-2 rounded-lg transition-all hover:scale-105 flex items-center gap-2 text-sm"
                >
                    <Plus className="w-4 h-4" /> CREATE BATTLE
                </button>
            </div>

            <div className="space-y-4">
                {/* 1. Live/Active Matches */}
                {matches.filter(m => m.status === 'IN_PROGRESS' || m.status === 'SCHEDULED').map(match => (
                    <div key={match.id} className="glass-card p-6 flex flex-col md:flex-row justify-between items-center gap-6 border-l-4 border-l-blue-500 relative group">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-black bg-blue-500/20 text-blue-500 px-2 rounded uppercase">MATCH BATTLE</span>
                                <span className="text-[10px] text-gray-500 font-mono">{new Date(match.date).toLocaleString()}</span>
                            </div>
                            <h3 className="text-lg font-bold">{match.team1Name} vs {match.team2Name}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            {match.status === 'SCHEDULED' && (
                                <div className="flex items-center gap-2">
                                    <select
                                        className="bg-black/60 border border-white/10 rounded-lg p-2 text-[10px] focus:border-accent outline-none text-white max-w-[150px]"
                                        id={`case-${match.id}`}
                                    >
                                        <option value="">Random Case</option>
                                        {caseStudies.map(cs => (
                                            <option key={cs.id} value={cs.id}>{cs.title}</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={() => {
                                            const caseSelect = document.getElementById(`case-${match.id}`) as HTMLSelectElement;
                                            onStartBattle(match.id, caseSelect.value ? caseStudies.find(c => c.id === caseSelect.value)?.description : '');
                                        }}
                                        className="bg-green-500/20 text-green-500 border border-green-500/20 px-4 py-2 rounded-lg font-bold text-xs hover:bg-green-500 hover:text-white transition-all"
                                    >
                                        START
                                    </button>
                                    <button
                                        onClick={() => onDeleteMatch(match.id)}
                                        className="p-2 text-gray-500 hover:text-red-500 transition-all"
                                        title="Delete Match"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                            {match.status === 'IN_PROGRESS' && (
                                <span className="text-red-500 font-bold animate-pulse text-xs">LIVE NOW</span>
                            )}
                        </div>
                    </div>
                ))}

                {/* 2. Individual Battles */}
                {individualBattles.map(battle => (
                    <div key={battle.id} className={`glass-card p-6 flex flex-col md:flex-row justify-between items-center gap-6 border-l-4 ${battle.status === 'ACTIVE' ? 'border-l-green-500' : 'border-l-gray-500'}`}>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-black bg-purple-500/20 text-purple-500 px-2 rounded uppercase">INDIVIDUAL</span>
                                <span className="text-[10px] font-black bg-blue-500/20 text-blue-500 px-2 rounded uppercase">{battle.type?.replace('_', ' ') || 'KAHOOT'}</span>
                                {battle.is_test && (
                                    <span className="text-[10px] font-black bg-red-500/20 text-red-500 px-2 rounded uppercase border border-red-500/30">TEST MODE</span>
                                )}
                                <span className={`text-[10px] font-black px-2 rounded uppercase ${battle.status === 'ACTIVE' ? 'bg-green-500/20 text-green-500' : 'bg-gray-700/50 text-gray-500'}`}>
                                    {battle.status}
                                </span>
                            </div>
                            <h3 className="text-lg font-bold">{battle.title}</h3>
                            <p className="text-sm text-gray-500 line-clamp-1">{battle.description}</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => onManageQuestions(battle.id)}
                                className="bg-white/5 text-gray-400 border border-white/10 px-3 py-2 rounded-lg font-bold text-[10px] uppercase hover:bg-white/10 hover:text-white transition-all flex items-center gap-2"
                            >
                                <List className="w-3 h-3" /> Questions
                            </button>
                            <button
                                onClick={() => onViewReport(battle.id)}
                                className="bg-blue-600/20 text-blue-500 border border-blue-500/20 px-3 py-2 rounded-lg font-bold text-[10px] uppercase hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2"
                            >
                                <FileText className="w-3 h-3" /> Report
                            </button>
                            {battle.status === 'PENDING' && (
                                <button
                                    onClick={() => onStartIndividualBattle(battle.id)}
                                    className="bg-green-600/20 text-green-500 border border-green-500/20 px-4 py-2 rounded-lg font-bold text-[10px] uppercase hover:bg-green-600 hover:text-white transition-all"
                                >
                                    START
                                </button>
                            )}
                            {battle.status === 'ACTIVE' && (
                                <button
                                    onClick={() => onEndIndividualBattle(battle.id)}
                                    className="bg-red-600/20 text-red-500 border border-red-500/20 px-4 py-2 rounded-lg font-bold text-[10px] uppercase hover:bg-red-600 hover:text-white transition-all"
                                >
                                    END
                                </button>
                            )}
                            <button
                                onClick={() => onEditBattle(battle)}
                                className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white transition-all border border-white/5"
                                title="Edit Battle"
                            >
                                <Edit2 className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                ))}

                {(matches.length === 0 && individualBattles.length === 0) && (
                    <div className="py-20 text-center glass-card border-dashed border-white/10 opacity-60">
                        <Zap className="w-12 h-12 text-gray-600 mx-auto mb-4 opacity-20" />
                        <h4 className="text-xl font-bold text-gray-500">No Battles Found</h4>
                        <p className="text-sm text-gray-600">Schedule a match battle or create an individual one.</p>
                    </div>
                )}
            </div>
        </section>
    );
}
