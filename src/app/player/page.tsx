import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import PlayerClient from './PlayerClient';

export default async function PlayerPage() {
    const session = await getSession();

    // Check if session exists and is a player or owner.
    if (!session || !session.user || (session.user.role !== 'PLAYER' && session.user.role !== 'OWNER')) {
        redirect('/player/login');
    }

    return <PlayerClient user={session.user} />;
}
