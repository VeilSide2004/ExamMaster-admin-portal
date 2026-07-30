import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { WeeklyDPP } from '@/lib/models';
import { getAuthenticatedAdmin } from '@/lib/auth';

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const admin = getAuthenticatedAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    await WeeklyDPP.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: 'Weekly DPP deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
