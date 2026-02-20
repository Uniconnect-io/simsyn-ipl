import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import OwnerClient from './OwnerClient';

export default async function OwnerPage() {
    const session = await getSession();

    // Check if session exists and is an owner
    if (!session || !session.user || session.user.role !== 'OWNER') {
        redirect('/owner/login');
    }

    return <OwnerClient user={session.user} />;
}
