import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
    try {
        const res = await db.execute('SELECT tags FROM players WHERE tags IS NOT NULL AND tags != \'\'');
        const allTags = new Set<string>();

        res.rows.forEach((row: any) => {
            const tags = row.tags.split(',').map((t: string) => t.trim());
            tags.forEach((t: string) => {
                if (t) allTags.add(t);
            });
        });

        return NextResponse.json(Array.from(allTags).sort());
    } catch (error) {
        console.error('Fetch tags error:', error);
        return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
    }
}
