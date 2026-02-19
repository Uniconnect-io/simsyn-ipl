'use client';

import { useState, useEffect, use } from 'react';
import { motion } from 'framer-motion';
import { Play, Save, AlertCircle, Trophy, ChevronLeft, Timer, Home, Activity } from 'lucide-react';
import Link from 'next/link';

interface Match {
  id: string;
  team1_id: string;
  team2_id: string;
  team1Name: string;
  team2Name: string;
  month: number;
  status: string;
  score1: number;
  score2: number;
  wickets1: number;
  wickets2: number;
  overs1: number;
  overs2: number;
  winner_id: string | null;
  winnerName: string | null;
  case_description: string | null;
  team1_summary: string | null;
  team2_summary: string | null;
  team1_bonus?: number;
  team2_bonus?: number;
  ideas1?: any[];
  ideas2?: any[];
}

export default function MatchDetailPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = use(paramsPromise);
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);

  // Admin fields
  const [caseDesc, setCaseDesc] = useState('');
  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);
  const [bonus1, setBonus1] = useState(0);
  const [bonus2, setBonus2] = useState(0);
  const [editedSummary1, setEditedSummary1] = useState('');
  const [editedSummary2, setEditedSummary2] = useState('');

  const [loggedInCaptain, setLoggedInCaptain] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem('sipl_captain');
    if (stored) {
      setLoggedInCaptain(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    fetch(`/api/match/${params.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          // Handle error - maybe redirect or show error
          console.error(data.error);
          return;
        }
        setMatch(data);
        setCaseDesc(data.case_description || '');
        setScore1(data.score1 || 0);
        setScore2(data.score2 || 0);
        setBonus1(data.team1_bonus || 0);
        setBonus2(data.team2_bonus || 0);
        setEditedSummary1(data.team1_summary || '');
        setEditedSummary2(data.team2_summary || '');
        setLoading(false);
      });
  }, [params.id]);

  const handleFinalSubmit = async () => {
    if (!match || match.status === 'COMPLETED') return;

    const finalScore1 = score1 + bonus1;
    const finalScore2 = score2 + bonus2;
    const winnerId = finalScore1 > finalScore2 ? match.team1_id : finalScore1 < finalScore2 ? match.team2_id : null;

    const res = await fetch(`/api/match/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        score1: finalScore1,
        score2: finalScore2,
        winnerId,
        caseDescription: caseDesc,
        status: 'COMPLETED',
        team1_summary: editedSummary1,
        team2_summary: editedSummary2,
        team1_bonus: bonus1,
        team2_bonus: bonus2
      }),
    });

    if (res.ok) {
      alert('Match finalized and leaderboard updated!');
      window.location.assign('/league');
    } else {
      const err = await res.json();
      alert(err.error || 'Failed to finalize match');
    }
  };

  if (loading || !match) return <div className="p-8">Loading...</div>;

  const isAdmin = !loggedInCaptain;
  const isCompleted = match.status === 'COMPLETED';

  // SCHEDULED/IN_PROGRESS Matches
  if (match.status === 'SCHEDULED' || match.status === 'IN_PROGRESS') {
    return (
      <main className="min-h-screen p-6 lg:p-12 flex flex-col items-center justify-center text-center space-y-6">
        <h1 className="text-4xl font-black text-white/20 uppercase tracking-tighter">In Battle Phase</h1>
        <p className="text-gray-500 max-w-md">Official results and AI summaries will be available here once the match enters the review phase.</p>
        <div className="flex flex-col items-center gap-4">
          <Link
            href={`/match/${params.id}/live`}
            className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-full font-black uppercase tracking-widest flex items-center gap-3 shadow-lg shadow-red-600/20 animate-pulse transition-all transform hover:scale-105"
          >
            <Activity className="w-5 h-5" /> Enter Live Stadium
          </Link>
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.location.href = '/league'}
              className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full font-bold flex items-center gap-2 transition-all"
            >
              <ChevronLeft size={18} /> Back to Standings
            </button>
            <Link
              href="/"
              className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full font-bold flex items-center gap-2 transition-all"
            >
              <Home size={18} /> Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // REVIEW PENDING VIEW (Admin Only) OR COMPLETED VIEW (If Admin wants to see details)
  if ((match.status === 'REVIEW_PENDING' || isCompleted) && isAdmin) {
    return (
      <main className="min-h-screen p-6 lg:p-12 max-w-6xl mx-auto space-y-12 pb-24">
        <header className="flex justify-between items-center bg-black/40 backdrop-blur-md p-8 rounded-2xl border border-white/5 relative">
          <div className="flex-1"></div>
          <div className="text-center space-y-4 flex-[2]">
            <div className={`inline-block px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest ${isCompleted ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
              {isCompleted ? 'Match Finalized - Locked' : 'Admin Review Required'}
            </div>
            <h1 className="text-4xl lg:text-5xl font-black">{match.team1Name} vs {match.team2Name}</h1>
          </div>
          <div className="flex-1 flex justify-end">
            <Link
              href="/"
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-6 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white transition-all font-bold"
            >
              <Home className="w-5 h-5" /> Home
            </Link>
          </div>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Team 1 Review */}
          <div className="glass-card p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-white/5 border border-white/10 overflow-hidden">
                <img
                  src={`/assets/teamlogos/${(match.team1Name || '').toLowerCase().replace(/ /g, '_')}.png`}
                  alt={match.team1Name}
                  className="w-full h-full object-cover"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              </div>
              <h3 className="text-xl font-bold">
                📊 {match.team1Name} Contributions
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black uppercase text-gray-500 mb-2 block">Base Score</label>
                <input
                  type="number"
                  disabled={isCompleted}
                  value={score1}
                  onChange={e => setScore1(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 p-3 rounded-lg font-mono text-xl outline-none focus:border-accent disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase text-accent mb-2 block">Bonus Points</label>
                <input
                  type="number"
                  disabled={isCompleted}
                  value={bonus1}
                  onChange={e => setBonus1(Number(e.target.value))}
                  className="w-full bg-accent/10 border border-accent/20 p-3 rounded-lg font-mono text-xl text-accent outline-none focus:border-accent disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase text-gray-500 mb-2 block">AI Summary (Review & Edit)</label>
              <textarea
                value={editedSummary1}
                disabled={isCompleted}
                onChange={e => setEditedSummary1(e.target.value)}
                className="w-full bg-white/5 border border-white/10 p-4 rounded-lg h-32 text-sm leading-relaxed outline-none focus:border-accent disabled:opacity-50"
                placeholder="AI is generating..."
              />
            </div>

            {/* Individual Ideas List */}
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Submission Audit Trail</label>
              <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                {match.ideas1?.map((idea: any) => (
                  <div key={idea.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className={idea.is_wicket ? 'text-red-500' : 'text-green-500'}>
                        {idea.is_wicket ? 'WICKET' : `+${idea.runs} RUNS`}
                      </span>
                      <span className="text-gray-600 italic">Score: {idea.score?.toFixed(1)}</span>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed italic">"{idea.content}"</p>
                  </div>
                ))}
                {(!match.ideas1 || match.ideas1.length === 0) && (
                  <div className="text-center py-8 text-xs text-gray-600 italic">No ideas submitted.</div>
                )}
              </div>
            </div>
          </div>

          {/* Team 2 Review */}
          <div className="glass-card p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-white/5 border border-white/10 overflow-hidden">
                <img
                  src={`/assets/teamlogos/${(match.team2Name || '').toLowerCase().replace(/ /g, '_')}.png`}
                  alt={match.team2Name}
                  className="w-full h-full object-cover"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              </div>
              <h3 className="text-xl font-bold">
                📊 {match.team2Name} Contributions
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black uppercase text-gray-500 mb-2 block">Base Score</label>
                <input
                  type="number"
                  disabled={isCompleted}
                  value={score2}
                  onChange={e => setScore2(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 p-3 rounded-lg font-mono text-xl outline-none focus:border-accent disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase text-accent mb-2 block">Bonus Points</label>
                <input
                  type="number"
                  disabled={isCompleted}
                  value={bonus2}
                  onChange={e => setBonus2(Number(e.target.value))}
                  className="w-full bg-accent/10 border border-accent/20 p-3 rounded-lg font-mono text-xl text-accent outline-none focus:border-accent disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase text-gray-500 mb-2 block">AI Summary (Review & Edit)</label>
              <textarea
                value={editedSummary2}
                disabled={isCompleted}
                onChange={e => setEditedSummary2(e.target.value)}
                className="w-full bg-white/5 border border-white/10 p-4 rounded-lg h-32 text-sm leading-relaxed outline-none focus:border-accent disabled:opacity-50"
                placeholder="AI is generating..."
              />
            </div>

            {/* Individual Ideas List */}
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Submission Audit Trail</label>
              <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                {match.ideas2?.map((idea: any) => (
                  <div key={idea.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className={idea.is_wicket ? 'text-red-500' : 'text-green-500'}>
                        {idea.is_wicket ? 'WICKET' : `+${idea.runs} RUNS`}
                      </span>
                      <span className="text-gray-600 italic">Score: {idea.score?.toFixed(1)}</span>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed italic">"{idea.content}"</p>
                  </div>
                ))}
                {(!match.ideas2 || match.ideas2.length === 0) && (
                  <div className="text-center py-8 text-xs text-gray-600 italic">No ideas submitted.</div>
                )}
              </div>
            </div>
          </div>
        </section>

        {!isCompleted && (
          <div className="bg-accent/5 border border-accent/20 p-8 rounded-2xl space-y-6 text-center max-w-2xl mx-auto shadow-2xl shadow-accent/10">
            <div className="flex justify-center items-center gap-12">
              <div className="text-center">
                <p className="text-xs font-bold text-gray-500 uppercase">Total {match.team1Name}</p>
                <p className="text-4xl font-black">{score1 + bonus1}</p>
              </div>
              <div className="text-2xl font-black italic text-gray-700">FINAL</div>
              <div className="text-center">
                <p className="text-xs font-bold text-gray-500 uppercase">Total {match.team2Name}</p>
                <p className="text-4xl font-black">{score2 + bonus2}</p>
              </div>
            </div>

            <button
              onClick={handleFinalSubmit}
              className="w-full btn-primary py-5 text-xl font-black tracking-widest flex items-center justify-center gap-3"
            >
              <Save className="w-6 h-6" /> CONFIRM & PUBLISH RESULTS
            </button>
            <p className="text-[10px] text-gray-500 italic">Once published, the result becomes immutable and the points table is updated.</p>
          </div>
        )}
      </main>
    );
  }

  // REVIEW PENDING (Public View)
  if (match.status === 'REVIEW_PENDING' && !isAdmin) {
    return (
      <main className="min-h-screen p-6 lg:p-12 flex flex-col items-center justify-center text-center space-y-6">
        <div className="w-16 h-16 bg-yellow-500/10 text-yellow-500 rounded-full flex items-center justify-center animate-pulse">
          <Timer size={32} />
        </div>
        <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Judging in Progress</h1>
        <p className="text-gray-500 max-w-md">Admins are currently reviewing the pitches and finalizing the summaries. Stand by for the official results!</p>
        <div className="flex items-center gap-4 mt-4">
          <button
            onClick={() => window.location.href = '/league'}
            className="btn-secondary flex items-center gap-2"
          >
            <ChevronLeft /> Back to League
          </button>
          <Link
            href="/"
            className="btn-secondary flex items-center gap-2"
          >
            <Home size={18} /> Home
          </Link>
        </div>
      </main>
    );
  }

  // COMPLETED VIEW
  return (
    <main className="min-h-screen p-6 lg:p-12 max-w-5xl mx-auto space-y-12">
      <header className="text-center space-y-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-block px-6 py-2 bg-accent/20 border border-accent/30 rounded-full text-accent font-black tracking-widest uppercase text-sm"
        >
          Match Result • Month {match.month}
        </motion.div>

        <div className="flex items-center justify-center gap-4 lg:gap-12">
          <div className="flex-1 flex flex-col items-end gap-4">
            <div className="w-16 h-16 lg:w-24 lg:h-24 rounded-2xl bg-white/5 border border-white/10 overflow-hidden shadow-2xl shadow-accent/20">
              <img
                src={`/assets/teamlogos/${(match.team1Name || '').toLowerCase().replace(/ /g, '_')}.png`}
                alt={match.team1Name}
                className="w-full h-full object-cover"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            </div>
            <div className="text-right">
              <h1 className="text-2xl lg:text-5xl font-black uppercase text-glow">{match.team1Name}</h1>
              <div className="text-4xl lg:text-7xl text-accent font-black mt-2">
                {match.score1}/{match.wickets1}
              </div>
              <div className="text-xs text-gray-500 font-mono mt-1">{Number(match.overs1).toFixed(1)} ov</div>
            </div>
          </div>
          <div className="text-gray-700 text-2xl lg:text-4xl font-black italic">VS</div>
          <div className="flex-1 flex flex-col items-start gap-4">
            <div className="w-16 h-16 lg:w-24 lg:h-24 rounded-2xl bg-white/5 border border-white/10 overflow-hidden shadow-2xl shadow-accent/20">
              <img
                src={`/assets/teamlogos/${(match.team2Name || '').toLowerCase().replace(/ /g, '_')}.png`}
                alt={match.team2Name}
                className="w-full h-full object-cover"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            </div>
            <div className="text-left">
              <h1 className="text-2xl lg:text-5xl font-black uppercase text-glow">{match.team2Name}</h1>
              <div className="text-4xl lg:text-7xl text-accent font-black mt-2">
                {match.score2}/{match.wickets2}
              </div>
              <div className="text-xs text-gray-500 font-mono mt-1">{Number(match.overs2).toFixed(1)} ov</div>
            </div>
          </div>
        </div>

        <div className="pt-8">
          <div className="inline-flex items-center gap-4 bg-white/5 border border-white/10 px-8 py-4 rounded-2xl">
            <Trophy className="text-yellow-500 w-8 h-8" />
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest text-left">Winner</p>
              <h2 className="text-2xl font-black text-white">{match.winnerName || 'DRAW'}</h2>
            </div>
          </div>
        </div>
      </header>

      <section className="glass-card p-8 border-white/5 bg-white/[0.02]">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2 uppercase tracking-tighter">
          <AlertCircle className="text-accent" /> Innovation Challenge
        </h3>
        <div className="bg-black/40 p-6 rounded-2xl border border-white/5 text-gray-300 leading-relaxed text-lg italic">
          "{match.case_description}"
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass-card overflow-hidden border-white/5">
          <div className="p-6 border-b border-white/5 bg-white/5 flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-white/5 border border-white/10 overflow-hidden">
              <img
                src={`/assets/teamlogos/${(match.team1Name || '').toLowerCase().replace(/ /g, '_')}.png`}
                alt={match.team1Name}
                className="w-full h-full object-cover"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            </div>
            <h4 className="font-black uppercase tracking-widest text-gray-400">Team {match.team1Name}</h4>
          </div>
          <div className="p-8 space-y-4">
            <div className="text-accent font-bold uppercase text-xs flex items-center gap-2">
              <Play className="w-3 h-3 fill-accent" /> AI Insights
            </div>
            <p className="text-gray-300 leading-relaxed italic">
              {match.team1_summary || "No summary available."}
            </p>
          </div>
        </div>

        <div className="glass-card overflow-hidden border-white/5">
          <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-end gap-3">
            <h4 className="font-black uppercase tracking-widest text-gray-400">Team {match.team2Name}</h4>
            <div className="w-8 h-8 rounded bg-white/5 border border-white/10 overflow-hidden">
              <img
                src={`/assets/teamlogos/${(match.team2Name || '').toLowerCase().replace(/ /g, '_')}.png`}
                alt={match.team2Name}
                className="w-full h-full object-cover"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            </div>
          </div>
          <div className="p-8 space-y-4">
            <div className="text-accent font-bold uppercase text-xs flex items-center gap-2 justify-end">
              AI Insights <Play className="w-3 h-3 fill-accent" />
            </div>
            <p className="text-gray-300 leading-relaxed italic text-right">
              {match.team2_summary || "No summary available."}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 pt-8">
        <button
          onClick={() => window.location.href = '/league'}
          className="text-gray-500 hover:text-white transition-colors font-bold uppercase tracking-widest text-xs flex items-center gap-2 mx-auto"
        >
          <ChevronLeft size={14} /> Back to Standings
        </button>
        <Link
          href="/"
          className="text-gray-500 hover:text-white transition-colors font-bold uppercase tracking-widest text-xs flex items-center gap-2 mx-auto"
        >
          <Home size={14} /> Home
        </Link>
      </div>
    </main>
  );
}
