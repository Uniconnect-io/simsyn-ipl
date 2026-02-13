import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function PATCH(request: Request) {
    try {
        const { id, date } = await request.json();

        if (!id || !date) {
            return NextResponse.json({ error: 'ID and Date are required' }, { status: 400 });
        }

        // Update match date and also update the month based on the new date
        const newDate = new Date(date);
        const month = newDate.getMonth() + 1;

        db.prepare('UPDATE matches SET date = ?, month = ? WHERE id = ?').run(date, month, id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Schedule update error:', error);
        return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 });
    }
}
