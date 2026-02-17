import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/auth';

export async function middleware(request: NextRequest) {
    const session = request.cookies.get('session')?.value;

    // Paths requiring authentication
    const isAdminPath = request.nextUrl.pathname.startsWith('/admin');
    const isCaptainPath = request.nextUrl.pathname.startsWith('/captain');

    if (isAdminPath || isCaptainPath) {
        if (session) {
            try {
                const payload = await decrypt(session);
                const user = payload.user;

                if (isAdminPath && user.role !== 'ADMIN') {
                    return NextResponse.redirect(new URL('/', request.url));
                }
            } catch (e) {
                // Invalid session cookie - clear it and let the page handle login
                const res = NextResponse.redirect(new URL(request.url));
                res.cookies.set('session', '', { expires: new Date(0) });
                return res;
            }
        }
    }

    // Also protect API routes starts with /api/admin, /api/battle, or /api/auction
    const isProtectedApi = ['/api/admin', '/api/battle', '/api/auction'].some(path => request.nextUrl.pathname.startsWith(path));

    // Public auction APIs (e.g., getting status)
    const isPublicApi = [
        '/api/auction/status',
        '/api/captains',
        '/api/teams'
    ].some(path => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith('/api/teams/'));

    if (isProtectedApi && !isPublicApi) {
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        try {
            const payload = await decrypt(session);
            const user = payload.user;

            if (request.nextUrl.pathname.startsWith('/api/admin') && user.role !== 'ADMIN') {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            // For auction bidding, we just check if they have a session,
            // the API route will handle the fine-grained team_id check against the DB.
            if (request.nextUrl.pathname.startsWith('/api/auction/place-bid')) {
                // Allow through to API route
            }
        } catch (e) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
    matcher: ['/admin/:path*', '/captain/:path*', '/api/admin/:path*', '/api/battle/:path*', '/api/auction/:path*'],
};
