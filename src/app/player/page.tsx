import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import PlayerClient from './PlayerClient';

export default async function PlayerPage() {
    const session = await getSession();

    // Check if session exists and is a player.
    if (!session || !session.user || session.user.role !== 'PLAYER') {
        redirect('/player/login');
    }

    return <PlayerClient user={session.user} />;
}
