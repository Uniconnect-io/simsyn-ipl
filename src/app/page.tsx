'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Gavel, BarChart2, Shield, Calendar, Star, Activity, Play, Zap, LayoutDashboard, ArrowRight, Lightbulb } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [activeBattles, setActiveBattles] = useState<{ groupMatches: any[], individualBattles: any[] }>({ groupMatches: [], individualBattles: [] });
  const [auctionStatus, setAuctionStatus] = useState<any>(null);
  const [featuredIdeas, setFeaturedIdeas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [meRes, battlesRes, auctionRes, featuredRes] = await Promise.all([
          fetch('/api/auth/me?_=' + Date.now(), { cache: 'no-store' }),
          fetch('/api/active-battles?_=' + Date.now(), { cache: 'no-store' }),
          fetch('/api/auction/status?_=' + Date.now(), { cache: 'no-store' }),
          fetch('/api/ideas/featured?_=' + Date.now(), { cache: 'no-store' })
        ]);

        const meData = await meRes.json();
        if (meData.user) setUser(meData.user);

        const battlesData = await battlesRes.json();
        if (battlesData && !battlesData.error) setActiveBattles(battlesData);

        const auctionData = await auctionRes.json();
        setAuctionStatus(auctionData);

        const featuredData = await featuredRes.json();
        setFeaturedIdeas(featuredData);

        setLoading(false);
      } catch (error) {
        console.error('Error fetching home data:', error);
        setLoading(false);
      }
    };

    fetchData();

    // Import Supabase
    const { supabase } = require('@/lib/supabase');

    // Subscribe to auction updates
    // Subscribe to realtime updates
    const channel = supabase
      .channel('home_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => {
        fetch('/api/auction/status?_=' + Date.now(), { cache: 'no-store' }).then(res => res.json()).then(data => setAuctionStatus(data));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        fetch('/api/active-battles?_=' + Date.now(), { cache: 'no-store' }).then(res => res.json()).then(data => setActiveBattles(data));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('sipl_admin');
    localStorage.removeItem('sipl_owner');
    localStorage.removeItem('sipl_player');
    setUser(null);
    window.location.reload();
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>;

  const isBattleActive = activeBattles.groupMatches.length > 0 || activeBattles.individualBattles.length > 0;
  const isAuctionActive = auctionStatus?.status === 'ACTIVE';

  const cards = [
    {
      title: 'Innovation Hub',
      desc: 'Pitch your ideas for the 2026 roadmap and earn massive points.',
      icon: Lightbulb,
      href: '/player',
      color: 'bg-accent',
      tag: 'NEW FEATURE',
      hide: false,
      highlight: true
    },
    {
      title: 'Active Battle',
      desc: 'Battles are LIVE! Enter the War Zone and fight for your team.',
      icon: Zap,
      href: (user?.role === 'PLAYER' || user?.role === 'OWNER') ? '/player' : (activeBattles.individualBattles[0] ? `/battles/leaderboard/${activeBattles.individualBattles[0].id}` : '/player'),
      color: 'bg-red-600',
      tag: 'LIVE NOW',
      hide: !isBattleActive
    },
    {
      title: 'Live Auction',
      desc: 'The auction is LIVE! Enter the bidding arena now.',
      icon: Gavel,
      href: '/auction',
      color: 'bg-accent',
      tag: isAuctionActive ? 'LIVE NOW' : 'Starts 3 PM',
      hide: false
    },
    {
      title: 'Owner HQ',
      desc: 'Identify yourself and manage your team for the 2026 season.',
      icon: Shield,
      href: '/owner',
      color: 'bg-blue-500',
      tag: 'Step 1',
      hide: user?.role === 'ADMIN' || user?.role === 'PLAYER'
    },
    {
      title: 'Player Hub',
      desc: 'Access your profile and participate in individual battles.',
      icon: Star,
      href: '/player',
      color: 'bg-green-500',
      tag: 'Player',
      hide: user && user.role !== 'PLAYER' && user.role !== 'OWNER'
    },
    {
      title: 'Schedule',
      desc: 'View the full league schedule and upcoming matches.',
      icon: Calendar,
      href: '/fixtures',
      color: 'bg-purple-500',
      tag: 'League',
      hide: false
    },
    {
      title: 'Standings',
      desc: 'Check the latest team and player leaderboards.',
      icon: BarChart2,
      href: '/standings',
      color: 'bg-yellow-500',
      tag: 'Stats',
      hide: false
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

  return (
    <main className="min-h-screen flex flex-col items-center p-6 bg-animate relative overflow-hidden backdrop-blur-3xl">
      <div className="w-full max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-500">
        <header className="text-center mb-16 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-7xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-400 to-gray-800 tracking-tighter mb-4 drop-shadow-2xl">
              SIPL 2026
            </h1>
            <div className="h-2 w-32 bg-accent mx-auto rounded-full mb-6 shadow-[0_0_20px_rgba(249,115,22,0.6)]" />
            <p className="text-xl text-gray-400 uppercase tracking-[0.2em] font-bold">Innovation Premier League</p>

            {user && (
              <div className="mt-8 flex items-center justify-center gap-4">
                <span className="text-gray-400">Welcome back, <span className="text-white font-bold">{user.name}</span></span>
                <button onClick={handleLogout} className="text-xs text-red-400 hover:text-red-300 underline font-bold">LOGOUT</button>
              </div>
            )}
          </motion.div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10 max-w-5xl mx-auto">
          {cards.map((card, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Link href={card.href} className="flex h-full">
                <div className={`bg-black/40 hover:bg-black/60 border transition-all group w-full flex flex-col justify-between relative overflow-hidden backdrop-blur-sm rounded-3xl p-8 
                  ${(card as any).highlight ? 'border-accent shadow-[0_0_30px_rgba(249,115,22,0.15)] ring-1 ring-accent/20' : 'border-white/10 hover:border-accent/50'} 
                  ${card.tag === 'LIVE NOW' ? 'border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)]' : ''}`}>
                  <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${card.color.replace('bg-', 'text-')}`}>
                    <card.icon className="w-32 h-32 transform rotate-12 translate-x-8 -translate-y-8" />
                  </div>

                  <div>
                    <div className={`w-12 h-12 rounded-2xl ${card.color} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform ${card.tag === 'LIVE NOW' ? 'animate-pulse' : ''}`}>
                      <card.icon className="text-white w-6 h-6" />
                    </div>

                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${card.color.replace('bg-', 'text-')} mb-2 block`}>{card.tag}</span>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-accent transition-colors">{card.title}</h2>
                    <p className="text-gray-400 text-sm leading-relaxed">{card.desc}</p>
                  </div>

                  <div className="mt-8 flex items-center gap-2 text-sm font-bold text-white/50 group-hover:text-white transition-colors">
                    Access <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Featured Ideas Section */}
        {featuredIdeas.length > 0 && (
          <section className="mt-24 mb-12 relative z-10 w-full">
            <div className="flex flex-col items-center mb-10">
              <span className="text-accent font-black uppercase tracking-[0.3em] text-[10px] mb-3">Community Hub</span>
              <h2 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase text-white">Featured Ideas</h2>
              <div className="h-1 w-20 bg-accent/30 mt-4 rounded-full" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredIdeas.map((idea, idx) => (
                <motion.div
                  key={idea.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + (idx * 0.1) }}
                  className="glass-card p-6 border-white/5 bg-white/5 hover:bg-white/[0.08] transition-all group cursor-default"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-yellow-500/10 p-2 rounded-lg">
                      <Star className="w-5 h-5 text-yellow-500 fill-yellow-500/20" />
                    </div>
                    {user && (
                      <span className="text-[9px] font-black bg-white/10 px-2 py-1 rounded text-gray-400 uppercase tracking-widest leading-none">
                        By {idea.player_name || 'Anonymous'}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-white group-hover:text-accent transition-colors mb-2">{idea.title}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed line-clamp-3 italic">
                    "{idea.content}"
                  </p>
                  <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center">
                    <span className="text-[10px] text-gray-500 font-bold uppercase">{new Date(idea.created_at).toLocaleDateString()}</span>
                    <div className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-accent" />
                      <span className="text-[10px] font-black text-white">{(idea.admin_score > 0 ? idea.admin_score : idea.initial_score)} Pts</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse-slow delay-1000" />
      </div>
    </main>
  );
}
