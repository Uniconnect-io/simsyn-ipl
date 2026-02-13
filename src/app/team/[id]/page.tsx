'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, DollarSign, Award, ArrowLeft, Shield } from 'lucide-react';

interface Player {
  id: string;
  name: string;
  rating: number;
  pool: string;
  sold_price: number;
}

interface TeamDetail {
  id: string;
  name: string;
  balance: number;
  captain: { name: string } | null;
  players: Player[];
}

export default function TeamPage({ params }: { params: { id: string } }) {
  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/teams/${params.id}`)
      .then(res => res.json())
      .then(data => {
        setTeam(data);
        setLoading(false);
      });
  }, [params.id]);

  if (loading || !team) return <div className="p-8">Loading...</div>;

  return (
    <main className="min-h-screen p-6 lg:p-12 max-w-5xl mx-auto space-y-12">
      <button
        onClick={() => window.history.back()}
        className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="flex items-center gap-6">
          <div className="w-32 h-32 rounded-3xl bg-white/5 p-4 border border-white/10">
            <img
              src={`/assets/teamlogos/${team.name.toLowerCase().replace(' ', '_')}.png`}
              alt={team.name}
              className="w-full h-full object-contain"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          </div>
          <div>
            <h1 className="text-6xl font-black text-glow">{team.name}</h1>
            <div className="flex items-center gap-4 mt-4 text-gray-400">
              <div className="flex items-center gap-2">
                <Shield className="text-accent w-5 h-5" />
                <span className="font-bold">Captain: {team.captain?.name || 'Unassigned'}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="glass-card px-8 py-4 border-accent/20 bg-accent/5">
          <p className="text-xs text-accent uppercase tracking-widest font-bold mb-1">Remaining Balance</p>
          <p className="text-4xl font-black flex items-center gap-2">
            <DollarSign className="text-accent" /> {team.balance.toLocaleString()}
          </p>
        </div>
      </header>

      <section>
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Award className="text-accent" /> Roster ({team.players.length} Players)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {team.players.map(player => (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card p-6 flex justify-between items-center bg-white/[0.02]"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg font-bold">{player.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-gray-400">Pool {player.pool}</span>
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  Rating: {player.rating} / 10
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500 uppercase tracking-widest leading-none">Sold Price</p>
                <p className="text-xl font-black text-accent">{player.sold_price.toLocaleString()}</p>
              </div>
            </motion.div>
          ))}
          {team.players.length === 0 && (
            <div className="col-span-full py-12 text-center glass-card border-dashed">
              <p className="text-gray-500">No players acquired yet. Head to the Auction!</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
