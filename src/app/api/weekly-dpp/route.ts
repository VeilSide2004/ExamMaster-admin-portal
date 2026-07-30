import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { WeeklyDPP } from '@/lib/models';
import { getAuthenticatedAdmin } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('course_id');

    const query: any = { is_active: true };
    if (courseId) query.course_id = courseId;

    const dpps = await WeeklyDPP.find(query).populate('course_id', 'name');
    const formatted = dpps.map((d) => ({
      _id: d._id.toString(),
      course_id: (d.course_id as any)?._id?.toString() || d.course_id?.toString(),
      course_name: (d.course_id as any)?.name || 'Unknown Course',
      title: d.title,
      duration_minutes: d.duration_minutes,
      question_ids: (d.question_ids || []).map((q) => q.toString()),
      is_active: d.is_active,
      created_at: d.created_at,
    }));

    return NextResponse.json({ weeklyDpps: formatted });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const admin = getAuthenticatedAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const perms = admin.permissions || [];
    const isSuper = admin.role === 'Super Admin' || perms.includes('all');
    if (!isSuper && !perms.includes('manage_mock_tests') && !perms.includes('manage_questions')) {
      return NextResponse.json({ error: 'Access Denied: Missing permissions to manage Weekly DPPs' }, { status: 403 });
    }

    const body = await req.json();
    const { course_id, title, duration_minutes, question_ids } = body;

    if (!course_id || !title || !duration_minutes) {
      return NextResponse.json({ error: 'Course, Title, and Duration are required' }, { status: 400 });
    }

    const newDpp = await WeeklyDPP.create({
      course_id,
      title,
      duration_minutes: Number(duration_minutes),
      question_ids: question_ids || [],
      is_active: true,
    });

    return NextResponse.json({ success: true, weeklyDpp: newDpp }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
