'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, ArrowRight, Shield, Home, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Owner {
    id: string;
    name: string;
    team_id: string | null;
}

export default function OwnerLoginPage() {
    const router = useRouter();
    const [owners, setOwners] = useState<Owner[]>([]);
    const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null);
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(true);
    const [showResetModal, setShowResetModal] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loggedInOwner, setLoggedInOwner] = useState<Owner | null>(null);

    useEffect(() => {
        fetchOwners();
    }, []);

    const fetchOwners = async () => {
        try {
            const res = await fetch('/api/owners');
            const data = await res.json();
            setOwners(data);
        } catch (error) {
            console.error('Failed to fetch owners', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (owner: Owner) => {
        if (!password) {
            alert('Please enter your password');
            return;
        }

        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: owner.id, password, type: 'owner' }),
        });
        const data = await res.json();

        if (data.success) {
            if (data.user.password_reset_required) {
                setLoggedInOwner(data.user);
                setShowResetModal(true);
            } else {
                localStorage.setItem('sipl_owner', JSON.stringify(data.user));
                router.push('/owner');
            }
        } else {
            alert(data.error || 'Invalid password');
        }
    };

    const handlePasswordUpdate = async () => {
        if (!newPassword || newPassword !== confirmPassword) {
            alert('Passwords do not match or are empty');
            return;
        }

        const res = await fetch('/api/auth/update-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: loggedInOwner?.id, newPassword }),
        });
        const data = await res.json();

        if (data.success) {
            alert('Password updated successfully!');
            const updated = { ...loggedInOwner!, password_reset_required: 0 };
            localStorage.setItem('sipl_owner', JSON.stringify(updated));
            router.push('/owner');
        } else {
            alert(data.error);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <RefreshCw className="w-8 h-8 animate-spin text-accent" />
        </div>
    );

    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-6 gap-8 bg-animate">
            <Link href="/" className="fixed top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition-all text-gray-400 hover:text-white group">
                <Home className="w-4 h-4 group-hover:scale-110 transition-transform" /> Home
            </Link>

            <header className="w-full flex justify-center items-center max-w-5xl mb-8">
                <div className="text-center">
                    <h1 className="text-6xl font-black text-glow mb-2 uppercase tracking-tighter">Owner HQ</h1>
                    <p className="text-gray-400 max-w-md mx-auto">Identify yourself to access your team's command center.</p>
                </div>
            </header>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl w-full"
            >
                <section className="glass-card p-8">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                        <User className="text-accent" /> Identify Owner
                    </h2>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {owners.map(owner => (
                            <button
                                key={owner.id}
                                onClick={() => setSelectedOwner(owner)}
                                className={`w-full p-4 rounded-xl text-left transition-all flex items-center justify-between ${selectedOwner?.id === owner.id
                                    ? 'bg-accent/20 border-accent border'
                                    : 'bg-white/5 border border-transparent hover:border-white/20'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-accent/20">
                                        <img
                                            src={`/assets/employee/${owner.name.toLowerCase()}.png`}
                                            alt={owner.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => (e.currentTarget.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + owner.name)}
                                        />
                                    </div>
                                    <span className="font-medium text-lg">{owner.name}</span>
                                </div>
                                {selectedOwner?.id === owner.id && <ArrowRight className="w-5 h-5" />}
                            </button>
                        ))}
                    </div>
                </section>

                <section className="glass-card p-8 flex flex-col items-center justify-center text-center">
                    <h2 className="text-2xl font-bold mb-4">Login Securely</h2>
                    {!selectedOwner ? (
                        <p className="text-gray-500">Please select your identity to continue</p>
                    ) : (
                        <div className="space-y-6 w-full">
                            <p className="text-gray-400">Welcome, {selectedOwner.name}. Ready to access the HQ?</p>
                            <form onSubmit={(e) => { e.preventDefault(); handleLogin(selectedOwner); }} className="space-y-4">
                                <div className="space-y-2 text-left">
                                    <label className="text-xs text-gray-500 uppercase font-black px-1">Access Token (Password)</label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter your password"
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-4 focus:border-accent outline-none text-white transition-all"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="btn-primary w-full py-4 text-xl flex items-center justify-center gap-3 transition-transform active:scale-95"
                                >
                                    <Shield className="w-6 h-6" /> Authenticate
                                </button>
                            </form>
                        </div>
                    )}
                </section>
            </motion.div>

            {/* Password Reset Modal */}
            {
                showResetModal && (
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
                )
            }
        </main>
    );
}
