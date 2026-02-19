'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ArrowRight, ShieldCheck, User, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PlayerLogin() {
    const router = useRouter();
    const [playerName, setPlayerName] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loggedInUser, setLoggedInUser] = useState<any>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: playerName, password, type: 'player' })
            });

            const data = await res.json();

            if (res.ok) {
                if (data.user.password_reset_required) {
                    setLoggedInUser(data.user);
                    setShowResetModal(true);
                } else {
                    router.push('/player');
                }
            } else {
                setError(data.error || 'Invalid Player Name or Password');
            }
        } catch (err) {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordUpdate = async () => {
        if (!newPassword || newPassword !== confirmPassword) {
            setError('Passwords do not match or are empty');
            return;
        }

        try {
            const res = await fetch('/api/auth/update-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: loggedInUser.id, newPassword })
            });
            const data = await res.json();

            if (data.success) {
                // Determine redirect based on role (though this is player login, safe to assume player)
                router.push('/player');
            } else {
                setError(data.error || 'Failed to update password');
            }
        } catch (e) {
            setError('Failed to update password');
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center p-6 bg-animate relative">
            <Link href="/" className="fixed top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition-all text-gray-400 hover:text-white group">
                <Home className="w-4 h-4 group-hover:scale-110 transition-transform" /> Home
            </Link>

            <div className="w-full max-w-md">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-card p-6 md:p-10 border-white/5 shadow-2xl relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent via-green-500 to-accent" />

                    <div className="text-center mb-10">
                        <div className="w-20 h-20 bg-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Star className="w-10 h-10 text-accent animate-pulse" />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase mb-2">Player Login</h1>
                        <p className="text-gray-500 font-bold text-xs tracking-widest uppercase">Innovation Premier League 2026</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-1">Player Name</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="text"
                                    value={playerName}
                                    onChange={(e) => setPlayerName(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-12 py-3 md:py-4 focus:border-accent outline-none transition-all font-bold placeholder:text-gray-700"
                                    placeholder="Enter your registered name"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-1">Security Pass</label>
                            <div className="relative">
                                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-12 py-3 md:py-4 focus:border-accent outline-none transition-all font-bold placeholder:text-gray-700"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <motion.p
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="text-red-500 text-[10px] font-black uppercase tracking-widest text-center"
                            >
                                {error}
                            </motion.p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn-primary py-3 md:py-4 font-black uppercase tracking-[0.2em] shadow-lg shadow-accent/20 flex items-center justify-center gap-2 group"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                            ) : (
                                <>
                                    ENTER HUB <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <p className="mt-8 text-center text-[10px] text-gray-600 font-bold uppercase tracking-widest">
                        Trouble logging in? Contact your <span className="text-accent underline">Simsyn Administrator</span>
                    </p>
                </motion.div>
            </div>

            {/* Password Reset Modal */}
            {showResetModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 z-50">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-card p-12 max-w-md w-full border-accent hover:border-accent transition-none"
                    >
                        <h2 className="text-3xl font-black mb-2 text-glow">UPDATE PASSWORD</h2>
                        <p className="text-gray-400 mb-8">For security reasons, you must change your default Access Token on first login.</p>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs text-gray-500 uppercase font-black">New Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 focus:border-accent outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-gray-500 uppercase font-black">Confirm Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 focus:border-accent outline-none"
                                />
                            </div>
                            <button
                                onClick={handlePasswordUpdate}
                                className="w-full btn-primary py-4 font-black mt-4"
                            >
                                UPDATE & CONTINUE
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </main>
    );
}
