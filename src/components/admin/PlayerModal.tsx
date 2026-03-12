'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Tag, User, Trophy, BarChart, Gavel } from 'lucide-react';

interface Player {
    id?: string;
    name: string;
    rating: number;
    pool: string;
    min_bid: number;
    tags?: string;
}

interface PlayerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (player: any) => Promise<void>;
    player?: Player | null;
}

export default function PlayerModal({ isOpen, onClose, onSave, player }: PlayerModalProps) {
    const [formData, setFormData] = useState<Player>({
        name: '',
        rating: 5,
        pool: 'A',
        min_bid: 100000,
        tags: ''
    });
    const [existingTags, setExistingTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (player) {
            setFormData({
                id: player.id,
                name: player.name,
                rating: player.rating,
                pool: player.pool,
                min_bid: player.min_bid,
                tags: player.tags || ''
            });
        } else {
            setFormData({
                name: '',
                rating: 5,
                pool: 'A',
                min_bid: 100000,
                tags: ''
            });
        }
    }, [player, isOpen]);

    useEffect(() => {
        if (isOpen) {
            fetchTags();
        }
    }, [isOpen]);

    const fetchTags = async () => {
        try {
            const res = await fetch('/api/admin/tags');
            if (res.ok) {
                const data = await res.json();
                setExistingTags(data);
            }
        } catch (error) {
            console.error('Failed to fetch tags', error);
        }
    };

    const handleAddTag = (tag: string) => {
        const currentTags = formData.tags ? formData.tags.split(',').map(t => t.trim()) : [];
        if (!currentTags.includes(tag)) {
            const updatedTags = [...currentTags, tag].join(', ');
            setFormData({ ...formData, tags: updatedTags });
        }
        setNewTag('');
    };

    const handleRemoveTag = (tagToRemove: string) => {
        const currentTags = formData.tags ? formData.tags.split(',').map(t => t.trim()) : [];
        const updatedTags = currentTags.filter(t => t !== tagToRemove).join(', ');
        setFormData({ ...formData, tags: updatedTags });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave(formData);
            onClose();
        } catch (error) {
            alert('Failed to save player');
        } finally {
            setIsSaving(false);
        }
    };

    const selectedTags = formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        className="bg-[#0a0a0a] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl"
                    >
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
                            <h2 className="text-2xl font-black uppercase italic tracking-tighter">
                                {player ? 'Edit Player' : 'Add New Player'}
                            </h2>
                            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] text-gray-500 uppercase font-black px-1 flex items-center gap-2">
                                        <User className="w-3 h-3" /> Full Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:border-accent outline-none text-white transition-all text-sm"
                                        placeholder="Enter player name"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] text-gray-500 uppercase font-black px-1 flex items-center gap-2">
                                            <Trophy className="w-3 h-3" /> Rating (1-10)
                                        </label>
                                        <select
                                            value={formData.rating}
                                            onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value) })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:border-accent outline-none text-white transition-all text-sm"
                                        >
                                            {[...Array(10)].map((_, i) => (
                                                <option key={i + 1} value={i + 1} className="bg-[#0a0a0a]">{i + 1}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] text-gray-500 uppercase font-black px-1 flex items-center gap-2">
                                            <BarChart className="w-3 h-3" /> Pool
                                        </label>
                                        <select
                                            value={formData.pool}
                                            onChange={(e) => setFormData({ ...formData, pool: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:border-accent outline-none text-white transition-all text-sm"
                                        >
                                            {['A', 'B', 'C', 'D', 'E'].map(pool => (
                                                <option key={pool} value={pool} className="bg-[#0a0a0a]">{pool}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] text-gray-500 uppercase font-black px-1 flex items-center gap-2">
                                        <Gavel className="w-3 h-3" /> Minimum Bid
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        value={formData.min_bid}
                                        onChange={(e) => setFormData({ ...formData, min_bid: parseInt(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:border-accent outline-none text-white transition-all text-sm font-mono"
                                        placeholder="100000"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] text-gray-500 uppercase font-black px-1 flex items-center gap-2">
                                        <Tag className="w-3 h-3" /> Tags
                                    </label>
                                    <div className="flex gap-2 mb-3">
                                        <input
                                            type="text"
                                            value={newTag}
                                            onChange={(e) => setNewTag(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    if (newTag.trim()) handleAddTag(newTag.trim());
                                                }
                                            }}
                                            className="flex-1 bg-white/5 border border-white/10 rounded-xl p-4 focus:border-accent outline-none text-white transition-all text-sm"
                                            placeholder="Add new tag..."
                                        />
                                        <button
                                            type="button"
                                            onClick={() => newTag.trim() && handleAddTag(newTag.trim())}
                                            className="bg-white/5 hover:bg-white/10 border border-white/10 px-4 rounded-xl transition-all"
                                        >
                                            Add
                                        </button>
                                    </div>

                                    {/* Existing Tags Suggestions */}
                                    {existingTags.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {existingTags.map(tag => (
                                                <button
                                                    key={tag}
                                                    type="button"
                                                    disabled={selectedTags.includes(tag)}
                                                    onClick={() => handleAddTag(tag)}
                                                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all
                                                        ${selectedTags.includes(tag)
                                                            ? 'bg-accent/20 border-accent/40 text-accent opacity-50'
                                                            : 'bg-white/5 border-white/10 text-gray-400 hover:border-accent hover:text-white'}`}
                                                >
                                                    {tag}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Selected Tags */}
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {selectedTags.map(tag => (
                                            <span
                                                key={tag}
                                                className="px-3 py-1 bg-accent text-white rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-2 animate-in zoom-in-95"
                                            >
                                                {tag}
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveTag(tag)}
                                                    className="hover:text-black transition-colors"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSaving}
                                className="w-full bg-accent hover:bg-accent/80 text-white font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest disabled:opacity-50"
                            >
                                {isSaving ? 'Saving...' : (
                                    <>
                                        <Save className="w-4 h-4" /> {player ? 'Update Player' : 'Create Player'}
                                    </>
                                )}
                            </button>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
