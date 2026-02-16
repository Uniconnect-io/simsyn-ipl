'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Gavel, BarChart2, Shield, ArrowRight, Star } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) setUser(data.user);
      })
      .catch(() => { });
  }, []);

  const cards = [
    {
      title: 'Captain HQ',
      desc: 'Identify yourself and draw your team for the 2026 season.',
      icon: Shield,
      href: '/captain',
      color: 'bg-blue-500',
      tag: 'Step 1',
      hide: user?.role === 'ADMIN'
    },
    {
      title: 'Live Auction',
      desc: 'Enter the bidding arena. Build your dream team with 1M tokens.',
      icon: Gavel,
      href: '/auction',
      color: 'bg-accent',
      tag: 'Step 2'
    },
    {
      title: 'League Stage',
      desc: 'View standings, schedule, and enter the battle ground.',
      icon: BarChart2,
      href: '/league',
      color: 'bg-purple-500',
      tag: 'Step 3'
    },
    {
      title: 'Admin Console',
      desc: 'Control the auction flow and record match results.',
      icon: Trophy,
      href: '/admin',
      color: 'bg-red-500',
      tag: 'Global',
      hide: user && user.role !== 'ADMIN'
    }
  ].filter(card => !card.hide);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('sipl_admin');
    localStorage.removeItem('sipl_captain');
    setUser(null);
    window.location.reload();
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-animate">
      {user && (
        <header className="fixed top-0 left-0 right-0 p-6 flex justify-between items-center z-50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
              Session Active: {user.name} ({user.role || 'CAPTAIN'})
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-white/5 hover:bg-red-500/20 border border-white/10 rounded-xl text-xs font-bold transition-all text-gray-400 hover:text-red-500 flex items-center gap-2"
          >
            Logout
          </button>
        </header>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16"
      >
        <div className="flex items-center justify-center gap-2 mb-4">
          <Star className="text-accent fill-accent w-4 h-4" />
          <span className="text-accent font-bold tracking-widest text-sm uppercase">Simsyn Innovation</span>
          <Star className="text-accent fill-accent w-4 h-4" />
        </div>
        <h1 className="text-8xl font-black tracking-tighter text-glow truncate w-full max-w-[90vw]">
          SIPL 2026
        </h1>
        <p className="text-gray-400 text-xl max-w-lg mx-auto mt-4">
          Where Ideas Compete. Products Are Born. The ultimate innovation tournament.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-7xl">
        {cards.map((card, idx) => (
          <Link href={card.href} key={idx}>
            <motion.div
              whileHover={{ y: -10, scale: 1.02 }}
              className="glass-card p-8 h-full flex flex-col justify-between group cursor-pointer border-white/5 hover:border-white/20 transition-all"
            >
              <div>
                <div className={`w-12 h-12 rounded-xl ${card.color} bg-opacity-20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <card.icon className={card.color.replace('bg-', 'text-')} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">{card.tag}</span>
                <h2 className="text-2xl font-bold mb-3">{card.title}</h2>
                <p className="text-gray-400 text-sm leading-relaxed">{card.desc}</p>
              </div>
              <div className="mt-8 flex items-center gap-2 text-accent font-bold text-sm">
                Enter <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>
          </Link>
        ))}
      </div>

      <footer className="mt-20 text-gray-600 text-sm font-medium">
        Powered by Uniconnect Ecosystem • Built for Simsyn Labs
      </footer>
    </main>
  );
}
