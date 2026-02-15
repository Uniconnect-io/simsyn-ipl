import React, { useState } from 'react';
import { List, CheckCircle, Edit2, Save, X, UploadCloud, LogOut } from 'lucide-react';

interface BattleIdea {
    id: string;
    match_id: string;
    team_id: string;
    captain_id: string;
    content: string;
    score: number;
    runs: number;
    is_wicket: boolean;
    is_duplicate: boolean;
    feedback: string;
    created_at: string;
    match_type: string;
    team_name: string;
    captain_name: string;
}

interface Match {
    id: string;
    team1_id?: string | null;
    team2_id?: string | null;
    team1Name?: string;
    team2Name?: string;
    date: string;
    case_description?: string;
    is_published?: boolean;
    status?: string;
}

interface BattleHistoryTableProps {
    ideas: BattleIdea[];
    matches: Match[];
    teamFilter?: string; // Optional: Show only ideas from this team ID
    searchTerm?: string;
    editable?: boolean;
    onUpdateIdea?: (idea: any, newScore: number, breakdown: any) => Promise<void>;
    onPublishMatch?: (matchId: string) => Promise<void>;
    onUnpublishMatch?: (matchId: string) => Promise<void>;
}

export default function BattleHistoryTable({ ideas, matches, teamFilter, searchTerm = '', editable = false, onUpdateIdea, onPublishMatch, onUnpublishMatch }: BattleHistoryTableProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValues, setEditValues] = useState<any>({});
    const [processing, setProcessing] = useState(false);

    // 1. Group ideas by match_id
    // Filter by team first if needed
    const filteredIdeas = teamFilter
        ? ideas.filter(i => i.team_id === teamFilter)
        : ideas;

    // Filter by search term
    const searchedIdeas = filteredIdeas.filter(idea =>
        idea.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        idea.team_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        idea.match_type?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const grouped = searchedIdeas.reduce((acc, idea) => {
        if (!acc[idea.match_id]) acc[idea.match_id] = [];
        acc[idea.match_id].push(idea);
        return acc;
    }, {} as Record<string, BattleIdea[]>);

    // Sort groups by Match Date (Desc) or creation time
    const sortedMatchIds = Object.keys(grouped).sort((a, b) => {
        const ideasA = grouped[a];
        const ideasB = grouped[b];
        const dateA = new Date(ideasA[0].created_at).getTime();
        const dateB = new Date(ideasB[0].created_at).getTime();
        return dateB - dateA;
    });

    const handleEditClick = (idea: any) => {
        let scores: any = {};
        try {
            const fb = JSON.parse(idea.feedback);
            scores = fb.breakdown || {};
        } catch { }

        setEditValues({
            alignment: scores.alignment || 0,
            feasibility: scores.feasibility || 0,
            innovation: scores.innovation || 0,
            value: scores.value || 0,
            effort: scores.effort || 0
        });
        setEditingId(idea.id);
    };

    const handleSave = async (idea: any) => {
        // Calculate Weighted Score
        // Formula: (alignment * 0.2) + (feasibility * 0.2) + (value * 0.2) + (effort * 0.1) + (innovation * 0.3)
        const w = editValues;
        const weighted = (Number(w.alignment) * 0.2) + (Number(w.feasibility) * 0.2) + (Number(w.value) * 0.2) + (Number(w.effort) * 0.1) + (Number(w.innovation) * 0.3);

        if (onUpdateIdea) {
            setProcessing(true);
            await onUpdateIdea(idea, weighted, editValues);
            setProcessing(false);
        }
        setEditingId(null);
    };

    if (sortedMatchIds.length === 0) {
        return (
            <div className="py-20 text-center glass-card border-dashed border-white/10 opacity-60">
                <List className="w-12 h-12 text-gray-600 mx-auto mb-4 opacity-20" />
                <h4 className="text-xl font-bold text-gray-500">No History Found</h4>
                <p className="text-sm text-gray-600">No battle records match your criteria.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {sortedMatchIds.map(matchId => {
                const matchIdeas = grouped[matchId];
                // Sort ideas by creation time desc
                matchIdeas.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                const match = matches.find(m => m.id === matchId);
                const team1Name = match?.team1Name || matchIdeas.find(i => i.team_name)?.team_name || 'Unknown Team';
                const team2Name = match?.team2Name || 'Unknown Team';

                // Determine if this match is publishable
                // (It's completed, logic says "decision pending", and not published yet)
                const isDecisionPending = match?.status === 'COMPLETED' && !match?.is_published;

                return (
                    <div key={matchId} className={`glass-card overflow-hidden border-white/5 ${isDecisionPending ? 'border-yellow-500/30' : ''}`}>
                        {/* Match Header */}
                        <div className="bg-white/5 p-4 border-b border-white/5 flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                                <h3 className="text-lg font-black uppercase text-white flex items-center gap-2">
                                    <span className="text-accent">{team1Name}</span>
                                    {match?.team2_id && (
                                        <>
                                            <span className="text-gray-600 text-xs">vs</span>
                                            <span className="text-accent">{team2Name}</span>
                                        </>
                                    )}
                                </h3>
                                <div className="flex items-center gap-2">
                                    {isDecisionPending && (
                                        <span className="text-[10px] font-bold bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded animate-pulse">
                                            DECISION PENDING
                                        </span>
                                    )}
                                    {editable && isDecisionPending && onPublishMatch && (
                                        <button
                                            onClick={() => onPublishMatch(matchId)}
                                            className="text-[10px] font-bold bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded uppercase flex items-center gap-1 transition-colors"
                                        >
                                            <UploadCloud className="w-3 h-3" />
                                            Publish Results
                                        </button>
                                    )}
                                    {editable && match?.is_published && onUnpublishMatch && (
                                        <button
                                            onClick={() => onUnpublishMatch(matchId)}
                                            className="text-[10px] font-bold bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 px-3 py-1 rounded uppercase flex items-center gap-1 transition-all"
                                        >
                                            <LogOut className="w-3 h-3" />
                                            Unpublish
                                        </button>
                                    )}
                                    <span className="text-[10px] font-mono text-gray-500 bg-black/40 px-2 py-1 rounded">
                                        {match?.date || new Date(matchIdeas[0].created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                            {match?.case_description && (
                                <div className="text-sm text-gray-400 bg-black/20 p-3 rounded-lg border border-white/5 italic line-clamp-2 hover:line-clamp-none transition-all cursor-default relative group">
                                    <span className="text-gray-500 font-bold not-italic mr-2 text-[10px] uppercase">Case:</span>
                                    {match.case_description}
                                </div>
                            )}
                        </div>

                        {/* Ideas Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-black/40 border-b border-white/10 text-[10px] uppercase text-gray-500 font-bold tracking-wider">
                                        <th className="p-3 w-32">Team</th>
                                        <th className="p-3">Idea Content</th>
                                        <th className="p-3 w-20 text-center">Align</th>
                                        <th className="p-3 w-20 text-center">Feasib</th>
                                        <th className="p-3 w-20 text-center">Innov</th>
                                        <th className="p-3 w-20 text-center">Value</th>
                                        <th className="p-3 w-20 text-center">Effort</th>
                                        <th className="p-3 w-20 text-center text-white">Score</th>
                                        <th className="p-3 w-24 text-right">Result</th>
                                        {editable && !match?.is_published && <th className="p-3 w-10"></th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {matchIdeas.map(idea => {
                                        const isEditing = editingId === idea.id;
                                        let scores: any = null;
                                        try { scores = JSON.parse(idea.feedback); } catch (e) { }
                                        const breakdown = scores?.breakdown || scores || {};

                                        const renderBarOrInput = (key: string, val: number, colorClass: string = 'bg-gray-500') => {
                                            if (isEditing) {
                                                return (
                                                    <input
                                                        type="number"
                                                        min="0" max="100"
                                                        value={editValues[key]}
                                                        onChange={(e) => setEditValues({ ...editValues, [key]: Number(e.target.value) })}
                                                        className="w-12 bg-black/40 border border-white/20 rounded px-1 text-center text-xs text-white focus:border-accent outline-none"
                                                    />
                                                );
                                            }
                                            return (
                                                <div className="flex flex-col items-center gap-1 group/bar">
                                                    <div className="w-full h-1 bg-white/10 rounded overflow-hidden">
                                                        <div className={`h-full ${colorClass}`} style={{ width: `${Math.min(100, val)}%` }}></div>
                                                    </div>
                                                    <span className="text-[10px] font-mono text-gray-400 group-hover/bar:text-white transition-colors">{val?.toFixed(0) || '-'}</span>
                                                </div>
                                            );
                                        };

                                        return (
                                            <tr key={idea.id} className={`hover:bg-white/5 transition-colors group ${isEditing ? 'bg-white/5' : ''}`}>
                                                <td className="p-3 align-top">
                                                    <div className="font-bold text-xs text-white">{idea.team_name}</div>
                                                    <div className="text-[10px] text-gray-500">{idea.captain_name}</div>
                                                </td>
                                                <td className="p-3 align-top">
                                                    <p className="text-xs text-gray-300 line-clamp-2 group-hover:line-clamp-none transition-all">
                                                        {idea.content}
                                                    </p>
                                                    {scores?.commentary && !isEditing && (
                                                        <p className="text-[10px] text-gray-500 mt-1 italic opacity-70">"{scores.commentary}"</p>
                                                    )}
                                                </td>

                                                {/* Breakdown Columns */}
                                                <td className="p-3 align-top text-center">{renderBarOrInput('alignment', Number(breakdown.alignment), 'bg-blue-500')}</td>
                                                <td className="p-3 align-top text-center">{renderBarOrInput('feasibility', Number(breakdown.feasibility), 'bg-green-500')}</td>
                                                <td className="p-3 align-top text-center">{renderBarOrInput('innovation', Number(breakdown.innovation), 'bg-purple-500')}</td>
                                                <td className="p-3 align-top text-center">{renderBarOrInput('value', Number(breakdown.value), 'bg-yellow-500')}</td>
                                                <td className="p-3 align-top text-center">{renderBarOrInput('effort', Number(breakdown.effort), 'bg-red-500')}</td>

                                                {/* Total Score */}
                                                <td className="p-3 align-top text-center">
                                                    <div className="flex flex-col items-center justify-center h-full">
                                                        <span className={`text-sm font-black font-mono ${idea.score >= 80 ? 'text-accent' : idea.score >= 60 ? 'text-white' : 'text-gray-500'}`}>
                                                            {isEditing ? '...' : Number(idea.score).toFixed(0)}
                                                        </span>
                                                    </div>
                                                </td>

                                                <td className="p-3 align-top text-right">
                                                    <div className={`inline-block px-2 py-1 rounded text-[10px] font-black ${idea.is_wicket ? 'bg-red-500/20 text-red-500' :
                                                        idea.runs === 6 ? 'bg-yellow-500/20 text-yellow-500' :
                                                            idea.runs === 4 ? 'bg-purple-500/20 text-purple-500' :
                                                                'bg-green-500/20 text-green-500'
                                                        }`}>
                                                        {idea.is_wicket ? 'WICKET' : `${idea.runs} RUNS`}
                                                    </div>
                                                    {Boolean(idea.is_duplicate) && (
                                                        <div className="text-[9px] text-orange-500 font-bold mt-1">DUPLICATE</div>
                                                    )}
                                                </td>

                                                {/* Edit Action */}
                                                {editable && !match?.is_published && (
                                                    <td className="p-3 align-top text-right">
                                                        {/* Only allow editing if match is NOT published? Or always allow correction? User said "until then it should show Decision Pending", but admin might want to fix published scores too. Let's allow edit always for Admin. */}
                                                        {isEditing ? (
                                                            <div className="flex flex-col gap-2">
                                                                <button onClick={() => handleSave(idea)} className="text-green-500 hover:text-green-400" disabled={processing}>
                                                                    <Save className="w-4 h-4" />
                                                                </button>
                                                                <button onClick={() => setEditingId(null)} className="text-red-500 hover:text-red-400">
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleEditClick(idea)}
                                                                className="text-gray-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                                                                title="Edit Score"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
