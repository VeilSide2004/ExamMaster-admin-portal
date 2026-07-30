import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { AuditLog } from '@/lib/models';

export async function GET() {
  try {
    await dbConnect();
    const logs = await AuditLog.find().sort({ timestamp: -1 });
    return NextResponse.json({ logs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
