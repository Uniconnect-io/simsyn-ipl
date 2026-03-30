import { useState } from 'react';
import { Mail, Calendar, UploadCloud, TestTube } from 'lucide-react';

export default function EmailsTab() {
    const [sendingWeekly, setSendingWeekly] = useState(false);
    const [sendingMonthly, setSendingMonthly] = useState(false);
    const [trialEmail, setTrialEmail] = useState('');

    const triggerWeekly = async (isTrial: boolean) => {
        if (!isTrial && !confirm('WARNING: This will calculate stats and send personalized emails to ALL registered players in the system. Are you absolutely sure?')) return;
        if (isTrial && !trialEmail) return alert('Please enter a trial email address first.');

        setSendingWeekly(true);
        try {
            const res = await fetch('/api/emails/weekly-digest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(isTrial ? { trialEmail } : {})
            });
            if (res.ok) alert(isTrial ? 'Weekly digest trial sent successfully!' : 'Weekly digest sent to everyone!');
            else alert('Failed to send weekly digest.');
        } catch (e) {
            alert('Error sending weekly digest.');
        } finally {
            setSendingWeekly(false);
        }
    };

    const triggerMonthly = async (isTrial: boolean) => {
        if (!isTrial && !confirm('WARNING: This will calculate top 3 players/teams and send a common email to EVERYONE. Proceed?')) return;
        if (isTrial && !trialEmail) return alert('Please enter a trial email address first.');

        setSendingMonthly(true);
        try {
            const res = await fetch('/api/emails/monthly-digest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(isTrial ? { trialEmail } : {})
            });
            if (res.ok) alert(isTrial ? 'Monthly digest trial sent successfully!' : 'Monthly digest sent to everyone!');
            else alert('Failed to send monthly digest.');
        } catch (e) {
            alert('Error sending monthly digest.');
        } finally {
            setSendingMonthly(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                <h2 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-2 mb-2">
                    <Mail className="w-6 h-6 text-red-500" /> Notifications & Digests
                </h2>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-relaxed max-w-2xl">
                    Trigger automated digests and review email sending statuses. 
                    Weekly digests contain personalized stats. Monthly digests contain global highlights.
                </p>

                <div className="mt-6 pt-6 border-t border-white/10 flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex-1 max-w-sm w-full">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Trial Email Address</label>
                        <input 
                            type="email" 
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500"
                            placeholder="tester@domain.com"
                            value={trialEmail}
                            onChange={(e) => setTrialEmail(e.target.value)}
                        />
                    </div>
                    <div className="flex-1">
                        <p className="text-xs text-blue-400 mt-2 md:mt-0 max-w-sm">Provide an email address here to safely dry-run these mailers. The system will mock the digest and send it only to this address without pinging MS Teams.</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 group hover:border-blue-500/50 transition-all">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center mb-4">
                        <Calendar className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-black uppercase tracking-tight mb-2">Weekly Digest</h3>
                    <p className="text-xs text-gray-400 font-bold mb-6 min-h-[40px]">
                        Sends detailed individual stats, team rankings, and personal performance analysis to every active player.
                    </p>
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => triggerWeekly(true)}
                            disabled={sendingWeekly || !trialEmail}
                            className="flex items-center justify-center gap-2 w-full bg-blue-600/10 text-blue-400 border border-blue-600/30 hover:bg-blue-600/20 px-4 py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all disabled:opacity-50"
                        >
                            <TestTube className="w-4 h-4" /> Send Trial
                        </button>
                        <button
                            onClick={() => triggerWeekly(false)}
                            disabled={sendingWeekly}
                            className="w-full bg-red-600/20 text-red-500 border border-red-600/50 hover:bg-red-600 hover:text-white px-4 py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all"
                        >
                            {sendingWeekly ? 'Sending...' : 'Send Live to Everyone'}
                        </button>
                    </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 group hover:border-purple-500/50 transition-all">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-500 flex items-center justify-center mb-4">
                        <UploadCloud className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-black uppercase tracking-tight mb-2">Monthly Digest</h3>
                    <p className="text-xs text-gray-400 font-bold mb-6 min-h-[40px]">
                        Sends a system-wide common email featuring the past month highlights, top 3 players, and top 3 teams.
                    </p>
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => triggerMonthly(true)}
                            disabled={sendingMonthly || !trialEmail}
                            className="flex items-center justify-center gap-2 w-full bg-purple-600/10 text-purple-400 border border-purple-600/30 hover:bg-purple-600/20 px-4 py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all disabled:opacity-50"
                        >
                            <TestTube className="w-4 h-4" /> Send Trial
                        </button>
                        <button
                            onClick={() => triggerMonthly(false)}
                            disabled={sendingMonthly}
                            className="w-full bg-red-600/20 text-red-500 border border-red-600/50 hover:bg-red-600 hover:text-white px-4 py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all"
                        >
                            {sendingMonthly ? 'Sending...' : 'Send Live to Everyone'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
