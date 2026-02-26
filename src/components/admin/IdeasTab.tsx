'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Lightbulb,
    Search,
    RefreshCw,
    Star,
    Trash2,
    ChevronLeft,
    ChevronRight,
    X
} from 'lucide-react';

interface HubIdea {
    id: string;
    player_id: string;
    player_name: string;
    title: string;
    content: string;
    initial_score: number;
    admin_score: number;
    feedback: string;
    is_shortlisted: number;
    is_featured: number;
    status: string;
    created_at: string;
}

interface IdeasTabProps {
    // Initial state or shared functions if needed
}

export default function IdeasTab() {
    const [hubIdeas, setHubIdeas] = useState<HubIdea[]>([]);
    const [hubPagination, setHubPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        limit: 10
    });
    const [selectedIdeaForModal, setSelectedIdeaForModal] = useState<HubIdea | null>(null);
    const [isIdeaModalOpen, setIsIdeaModalOpen] = useState(false);

    // Filter & Search State
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    const fetchHubIdeas = async (page: number = hubPagination.currentPage, search: string = searchTerm, status: string = statusFilter) => {
        setIsSearching(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '10',
                search: search,
                status: status
            });
            const res = await fetch(`/api/admin/ideas?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setHubIdeas(data.ideas || []);
                setHubPagination(data.pagination);
            }
        } catch (error) {
            console.error('Error fetching hub ideas:', error);
        } finally {
            setIsSearching(false);
        }
    };

    useEffect(() => {
        fetchHubIdeas(1); // Reset to page 1 when filters change (usually best practice)
    }, [statusFilter]);

    // Handle search with debouncing or explicit trigger
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchHubIdeas(1);
    };

    const handleUpdateHubIdea = async (id: string, updates: any) => {
        try {
            const res = await fetch('/api/admin/ideas', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, ...updates }),
            });
            if (res.ok) {
                // Preserve current page
                fetchHubIdeas(hubPagination.currentPage);
            }
        } catch (error) {
            console.error('Error updating hub idea:', error);
        }
    };

    const handleResubmitAI = async (id: string) => {
        if (!confirm('Resubmit this idea for AI evaluation? This will overwrite the current AI score and feedback.')) return;

        try {
            const res = await fetch('/api/admin/ideas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            if (res.ok) {
                const data = await res.json();
                alert(`AI Evaluation complete! New Score: ${data.score}`);
                // Preserve current page
                fetchHubIdeas(hubPagination.currentPage);
            } else {
                alert('Failed to resubmit idea for AI review');
            }
        } catch (error) {
            console.error('Error resubmitting idea:', error);
            alert('Error during resubmission');
        }
    };

    const handleDeleteHubIdea = async (id: string) => {
        if (!confirm('Are you sure you want to delete this idea permanently?')) return;

        try {
            const res = await fetch(`/api/admin/ideas?id=${id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                fetchHubIdeas(hubPagination.currentPage);
            } else {
                alert('Failed to delete idea');
            }
        } catch (error) {
            console.error('Error deleting idea:', error);
            alert('Error deleting idea');
        }
    };

    return (
        <section className="mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-black flex items-center gap-3">
                        <Lightbulb className="text-accent" /> HUB IDEAS MANAGEMENT
                    </h2>
                    <p className="text-gray-400 mt-1">Review, rate, and feature player-submitted ideas.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <form onSubmit={handleSearch} className="relative flex-1 md:flex-none md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search player or title..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:border-accent outline-none transition-all"
                        />
                    </form>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-gray-400 focus:border-accent outline-none transition-all font-bold uppercase tracking-widest"
                    >
                        <option value="">ALL STATUS</option>
                        <option value="PENDING">PENDING</option>
                        <option value="APPROVED">APPROVED</option>
                        <option value="NEEDS_IMPROVEMENT">NEEDS IMPROVEMENT</option>
                        <option value="REJECTED">REJECTED</option>
                    </select>

                    <button
                        onClick={() => fetchHubIdeas(1, '', '')}
                        className="p-2 rounded-xl bg-white/5 text-gray-500 hover:text-white border border-white/10 transition-all"
                        title="Clear Filters"
                    >
                        <RefreshCw className={`w-4 h-4 ${isSearching ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="glass-card overflow-hidden border-white/5">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-gray-500 border-b border-white/5">
                                <th className="px-6 py-4">Player</th>
                                <th className="px-6 py-4">Idea Title</th>
                                <th className="px-6 py-4 text-center">AI Score</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {hubIdeas.map((idea) => (
                                <tr key={idea.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-sm text-white">{idea.player_name}</div>
                                        <div className="text-[10px] text-gray-500">{new Date(idea.created_at).toLocaleDateString()}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-sm text-accent mb-1">{idea.title}</div>
                                        <div className="text-xs text-gray-400 line-clamp-2 max-w-md">
                                            {idea.content}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="text-lg font-black text-white">{idea.initial_score}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest border ${idea.status === 'APPROVED' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                            idea.status === 'NEEDS_IMPROVEMENT' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                                idea.status === 'REJECTED' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-white/5 text-gray-500 border-white/10'}`}>
                                            {idea.status || 'PENDING'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleResubmitAI(idea.id)}
                                                className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-accent hover:bg-accent/10 transition-all border border-white/5"
                                                title="Resubmit AI Review"
                                            >
                                                <RefreshCw className="w-3 h-3" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedIdeaForModal(idea);
                                                    setIsIdeaModalOpen(true);
                                                }}
                                                className="px-4 py-2 rounded-lg bg-accent text-white font-black text-[10px] uppercase shadow-lg shadow-accent/20 hover:scale-105 transition-all"
                                            >
                                                Review
                                            </button>
                                            <button
                                                onClick={() => handleUpdateHubIdea(idea.id, { is_featured: idea.is_featured ? 0 : 1 })}
                                                className={`p-2 rounded-lg transition-all ${idea.is_featured ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'bg-white/5 text-gray-500 hover:text-white'}`}
                                                title={idea.is_featured ? 'Unfeature' : 'Feature'}
                                            >
                                                <Star className={`w-3 h-3 ${idea.is_featured ? 'fill-black' : ''}`} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteHubIdea(idea.id)}
                                                className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-all border border-white/5"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {hubIdeas.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center opacity-40">
                                        <Lightbulb className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                                        <p className="font-bold uppercase tracking-widest text-xs">No ideas found</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {hubPagination.totalPages > 1 && (
                    <div className="p-6 border-t border-white/5 bg-white/[0.02] flex justify-between items-center">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                            Showing {hubIdeas.length} of {hubPagination.totalCount} ideas
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                disabled={hubPagination.currentPage === 1}
                                onClick={() => fetchHubIdeas(hubPagination.currentPage - 1)}
                                className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 transition-all border border-white/5"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <div className="flex items-center gap-1">
                                {[...Array(hubPagination.totalPages)].map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => fetchHubIdeas(i + 1)}
                                        className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${hubPagination.currentPage === i + 1 ? 'bg-accent text-white' : 'bg-white/5 text-gray-500 hover:text-white'}`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
                            <button
                                disabled={hubPagination.currentPage === hubPagination.totalPages}
                                onClick={() => fetchHubIdeas(hubPagination.currentPage + 1)}
                                className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 transition-all border border-white/5"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {isIdeaModalOpen && selectedIdeaForModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto border-accent/20 flex flex-col"
                    >
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5 sticky top-0 z-10 backdrop-blur-md">
                            <div>
                                <div className="flex items-center gap-3">
                                    <h3 className="text-xl font-black text-accent uppercase tracking-tighter italic">Review Idea</h3>
                                    {selectedIdeaForModal.is_featured === 1 && (
                                        <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/10 text-yellow-500 rounded text-[8px] font-black uppercase border border-yellow-500/20">
                                            <Star className="w-2 h-2 fill-yellow-500" /> Featured
                                        </span>
                                    )}
                                </div>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Submitted by {selectedIdeaForModal.player_name} • {new Date(selectedIdeaForModal.created_at).toLocaleDateString()}</p>
                            </div>
                            <button onClick={() => { setIsIdeaModalOpen(false); setSelectedIdeaForModal(null); }} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-8 space-y-8">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Title</label>
                                <h4 className="text-2xl font-bold italic text-white">{selectedIdeaForModal.title}</h4>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Description</label>
                                <div className="bg-white/5 border border-white/5 rounded-xl p-6 text-sm leading-relaxed text-gray-300">
                                    {selectedIdeaForModal.content}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">AI Evaluation</label>
                                    <div className="bg-accent/5 border border-accent/10 rounded-xl p-4 h-full">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-xs font-bold text-accent uppercase tracking-widest">AI Score</span>
                                            <span className="text-2xl font-black text-white">{selectedIdeaForModal.initial_score}</span>
                                        </div>
                                        <div className="text-[11px] text-gray-400 italic leading-relaxed bg-black/20 p-3 rounded-lg border border-white/5">
                                            "{selectedIdeaForModal.feedback || 'No AI feedback available.'}"
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">Admin Actions</label>
                                    <div className="space-y-5 bg-white/5 border border-white/5 rounded-xl p-4">
                                        <div>
                                            <label className="text-[8px] font-black uppercase text-gray-400 block mb-2">Assign Score (Approves automatically)</label>
                                            <div className="flex gap-2">
                                                {[25, 50, 100].map((score) => (
                                                    <button
                                                        key={score}
                                                        onClick={() => {
                                                            handleUpdateHubIdea(selectedIdeaForModal.id, { admin_score: score, status: 'APPROVED' });
                                                            setIsIdeaModalOpen(false);
                                                            setSelectedIdeaForModal(null);
                                                        }}
                                                        className={`flex-1 py-3 rounded-lg text-xs font-black transition-all ${selectedIdeaForModal.admin_score === score ? 'bg-accent text-white shadow-lg shadow-accent/20 scale-105' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'}`}
                                                    >
                                                        {score}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[8px] font-black uppercase text-gray-400 block mb-2">Update Status</label>
                                            <select
                                                value={selectedIdeaForModal.status || 'PENDING'}
                                                onChange={(e) => {
                                                    handleUpdateHubIdea(selectedIdeaForModal.id, { status: e.target.value });
                                                    setIsIdeaModalOpen(false);
                                                    setSelectedIdeaForModal(null);
                                                }}
                                                className={`w-full bg-black/50 border border-white/10 rounded-lg px-3 py-3 text-[10px] font-black uppercase outline-none cursor-pointer transition-all hover:border-accent/40
                                                    ${selectedIdeaForModal.status === 'APPROVED' ? 'text-green-500' :
                                                        selectedIdeaForModal.status === 'NEEDS_IMPROVEMENT' ? 'text-yellow-500' :
                                                            selectedIdeaForModal.status === 'REJECTED' ? 'text-red-500' : 'text-gray-400'}`}
                                            >
                                                <option value="PENDING">PENDING</option>
                                                <option value="APPROVED">APPROVED</option>
                                                <option value="NEEDS_IMPROVEMENT">NEEDS IMPROVEMENT</option>
                                                <option value="REJECTED">REJECTED</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4 border-t border-white/5">
                                <button
                                    onClick={() => {
                                        handleResubmitAI(selectedIdeaForModal.id);
                                        setIsIdeaModalOpen(false);
                                        setSelectedIdeaForModal(null);
                                    }}
                                    className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-accent/10 text-gray-400 hover:text-accent border border-white/5 hover:border-accent/20 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                >
                                    <RefreshCw className="w-3 h-3" /> Resubmit AI
                                </button>
                                <button
                                    onClick={() => {
                                        handleUpdateHubIdea(selectedIdeaForModal.id, { is_featured: selectedIdeaForModal.is_featured ? 0 : 1 });
                                        setIsIdeaModalOpen(false);
                                        setSelectedIdeaForModal(null);
                                    }}
                                    className={`flex-1 flex items-center justify-center gap-2 border py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedIdeaForModal.is_featured ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'}`}
                                >
                                    <Star className={`w-3 h-3 ${selectedIdeaForModal.is_featured ? 'fill-yellow-500' : ''}`} />
                                    {selectedIdeaForModal.is_featured ? 'UNFEATURE' : 'FEATURE'}
                                </button>
                                <button
                                    onClick={() => {
                                        handleDeleteHubIdea(selectedIdeaForModal.id);
                                        setIsIdeaModalOpen(false);
                                        setSelectedIdeaForModal(null);
                                    }}
                                    className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-500 border border-white/5 hover:border-red-500/20 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                >
                                    <Trash2 className="w-3 h-3" /> Delete
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </section>
    );
}
