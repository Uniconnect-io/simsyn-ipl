import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Shield, Trash2, Edit2, Plus, X, Lock } from 'lucide-react';

interface AdminUser {
    id: string;
    username: string;
    email: string;
    role: string;
}

export default function AdminsTab() {
    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);

    // Form
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        role: 'ADMIN'
    });

    useEffect(() => {
        fetchAdmins();
    }, []);

    const fetchAdmins = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/admins');
            if (res.ok) {
                const data = await res.json();
                setAdmins(data);
            }
        } catch (error) {
            console.error('Failed to fetch admins:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const method = editingAdmin ? 'PATCH' : 'POST';
            const payload = {
                ...formData,
                id: editingAdmin?.id
            };

            const res = await fetch('/api/admin/admins', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setIsModalOpen(false);
                fetchAdmins();
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to save admin');
            }
        } catch (error) {
            alert('Error saving admin');
        }
    };

    const handleDelete = async (id: string, username: string) => {
        if (!confirm(`Are you sure you want to delete admin "${username}"?`)) return;
        try {
            const res = await fetch(`/api/admin/admins?id=${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                fetchAdmins();
            } else {
                alert('Failed to delete admin');
            }
        } catch (error) {
            alert('Error deleting admin');
        }
    };

    const openCreate = () => {
        setEditingAdmin(null);
        setFormData({ username: '', email: '', password: '', role: 'ADMIN' });
        setIsModalOpen(true);
    };

    const openEdit = (admin: AdminUser) => {
        setEditingAdmin(admin);
        setFormData({ username: admin.username, email: admin.email || '', password: '', role: admin.role });
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white/5 p-6 rounded-2xl border border-white/10">
                <div>
                    <h2 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-2">
                        <Shield className="w-6 h-6 text-red-500" /> Administrative Access
                    </h2>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Manage system administrators and notification receivers.</p>
                </div>
                <button
                    onClick={openCreate}
                    className="bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-widest transition-all flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Add Admin
                </button>
            </div>

            {loading ? (
                <div className="text-center p-12 text-gray-500 font-bold uppercase tracking-widest">Loading...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {admins.map(admin => (
                        <motion.div
                            key={admin.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white/5 border border-white/10 rounded-2xl p-6 relative hover:border-red-500/30 transition-all group"
                        >
                            <div className="absolute top-4 right-4 flex gap-2">
                                <button
                                    onClick={() => openEdit(admin)}
                                    className="p-2 bg-white/5 hover:bg-blue-500/20 text-gray-400 hover:text-blue-400 rounded-lg transition-all"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(admin.id, admin.username)}
                                    className="p-2 bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-lg transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            
                            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4 text-red-500 font-black text-2xl uppercase italic">
                                {admin.username.substring(0, 2)}
                            </div>
                            
                            <h3 className="text-xl font-black uppercase tracking-tight">{admin.username}</h3>
                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-400 font-bold">
                                <Mail className="w-3 h-3" /> {admin.email || 'No email set'}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 font-bold uppercase">
                                <Shield className="w-3 h-3" /> Role: {admin.role}
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-[#0a0a0a] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto"
                    >
                        <div className="p-6 border-b border-white/5 flex justify-between items-center">
                            <h2 className="text-xl font-black uppercase italic tracking-tighter">
                                {editingAdmin ? 'Edit Admin' : 'New Admin'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2 block">Username <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type="text"
                                        required
                                        value={formData.username}
                                        onChange={e => setFormData({ ...formData, username: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm focus:border-red-500 outline-none transition-all"
                                        placeholder="Admin username"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2 block">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm focus:border-red-500 outline-none transition-all"
                                        placeholder="admin@simsyn.com"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2 block">
                                    Password {editingAdmin && <span className="text-gray-600">(leave blank to keep current)</span>}
                                    {!editingAdmin && <span className="text-red-500">*</span>}
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type="password"
                                        required={!editingAdmin}
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm focus:border-red-500 outline-none transition-all"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full mt-4 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all"
                            >
                                Save Administrator
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
