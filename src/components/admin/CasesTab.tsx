'use client';

import { motion } from 'framer-motion';
import { Award, Upload, Plus, Edit2, X } from 'lucide-react';

interface CaseStudy {
    id: string;
    title: string;
    description: string;
    is_used: boolean;
    created_at: string;
}

interface CasesTabProps {
    caseStudies: CaseStudy[];
    onDeleteCase: (id: string) => void;
    onEditCase: (caseStudy: CaseStudy) => void;
    onAddCase: () => void;
    onImportCSV: (data: any[]) => void;
}

export default function CasesTab({ caseStudies, onDeleteCase, onEditCase, onAddCase, onImportCSV }: CasesTabProps) {
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const text = ev.target?.result as string;
            const lines = text.split('\n').filter(l => l.trim());
            const data = lines.slice(1).map(line => {
                const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.trim().replace(/^"|"$/g, ''));
                if (parts.length < 2) return null;
                return { title: parts[0], description: parts[1] };
            }).filter(d => d !== null);

            if (data.length > 0) {
                onImportCSV(data);
            }
        };
        reader.readAsText(file);
    };

    return (
        <section className="mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h2 className="text-2xl font-black flex items-center gap-3">
                        <Award className="text-accent" /> CASE STUDY LIBRARY
                    </h2>
                    <p className="text-gray-400 mt-1">Manage unique problem statements for Match Battles.</p>
                </div>
                <div className="flex items-center gap-3">
                    <label className="bg-white/5 text-gray-400 border border-white/10 font-bold px-6 py-2 rounded-lg transition-all hover:bg-white/10 flex items-center gap-2 cursor-pointer text-sm">
                        <Upload className="w-4 h-4" /> IMPORT CSV
                        <input
                            type="file"
                            accept=".csv"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </label>
                    <button
                        onClick={onAddCase}
                        className="bg-accent text-white font-bold px-6 py-2 rounded-lg transition-all hover:scale-105 flex items-center gap-2 text-sm"
                    >
                        <Plus className="w-4 h-4" /> ADD CASE
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {caseStudies.map(cs => (
                    <div key={cs.id} className="glass-card p-6 border-white/5 hover:border-accent/20 transition-all relative group">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-bold text-white">{cs.title}</h3>
                            <div className="flex items-center gap-4">
                                <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${cs.is_used ? 'bg-gray-500/20 text-gray-500' : 'bg-green-500/20 text-green-500'}`}>
                                    {cs.is_used ? 'USED' : 'AVAILABLE'}
                                </span>
                                <button
                                    onClick={() => onDeleteCase(cs.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                                <button
                                    onClick={() => onEditCase(cs)}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all"
                                >
                                    <Edit2 className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                        <p className="text-gray-400 text-sm leading-relaxed line-clamp-3 mb-4">
                            {cs.description}
                        </p>
                        <div className="text-[10px] text-gray-600 font-mono">
                            ADDED: {new Date(cs.created_at).toLocaleDateString()}
                        </div>
                    </div>
                ))}

                {caseStudies.length === 0 && (
                    <div className="col-span-full py-20 text-center glass-card border-dashed border-white/10 opacity-60">
                        <Award className="w-12 h-12 text-gray-600 mx-auto mb-4 opacity-20" />
                        <h4 className="text-xl font-bold text-gray-500">No Case Studies Found</h4>
                        <p className="text-sm text-gray-600">Start by adding innovation problem statements to your library.</p>
                    </div>
                )}
            </div>
        </section>
    );
}
