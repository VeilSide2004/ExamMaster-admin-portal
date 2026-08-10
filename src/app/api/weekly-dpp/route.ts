import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { WeeklyDPP, Course, AuditLog } from '@/lib/models';
import { readSharedDb, writeSharedDb, generateId } from '@/lib/sharedDb';
import { getAuthenticatedAdmin } from '@/lib/auth';
import { getEquivalentCourseIds } from '@/lib/courseMatcher';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { isMemoryMode } = await dbConnect();
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('course_id');

    if (isMemoryMode) {
      const db = readSharedDb();
      let dpps = (db.weeklyDpps || []).filter((d: any) => d.is_active !== false);

      if (courseId) {
        const validCourseIds = getEquivalentCourseIds(courseId, db.courses || []);
        dpps = dpps.filter((d: any) => {
          const dCourseId = String(typeof d.course_id === 'object' ? d.course_id?._id : d.course_id);
          return validCourseIds.includes(dCourseId);
        });
      }

      const formatted = dpps.map((d: any) => {
        const dCourseId = String(typeof d.course_id === 'object' ? d.course_id?._id : d.course_id);
        const courseObj = (db.courses || []).find((c: any) => String(c._id) === dCourseId || c.name === dCourseId);
        return {
          _id: String(d._id),
          course_id: dCourseId,
          course_name: courseObj?.name || 'Unknown Course',
          title: d.title,
          duration_minutes: d.duration_minutes || 30,
          question_ids: (d.question_ids || []).map((q: any) => String(q?._id || q)),
          is_active: d.is_active !== false,
          created_at: d.created_at || new Date().toISOString(),
        };
      });

      return NextResponse.json({ weeklyDpps: formatted });
    }

    // Mongoose Mode
    const query: any = { is_active: true };
    if (courseId) {
      const allCourses = await Course.find({});
      const validCourseIds = getEquivalentCourseIds(courseId, allCourses);
      query.course_id = { $in: validCourseIds };
    }

    const dpps = await WeeklyDPP.find(query).populate('course_id', 'name');
    const formatted = dpps.map((d) => ({
      _id: d._id.toString(),
      course_id: (d.course_id as any)?._id?.toString() || d.course_id?.toString(),
      course_name: (d.course_id as any)?.name || 'Unknown Course',
      title: d.title,
      duration_minutes: d.duration_minutes,
      question_ids: (d.question_ids || []).map((q) => q._id?.toString() || q.toString()),
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
    const { isMemoryMode } = await dbConnect();
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

    if (isMemoryMode) {
      const db = readSharedDb();
      if (!db.weeklyDpps) db.weeklyDpps = [];

      const newDpp = {
        _id: generateId(),
        course_id,
        title: title.trim(),
        duration_minutes: Number(duration_minutes),
        question_ids: question_ids || [],
        is_active: true,
        created_at: new Date().toISOString(),
      };

      db.weeklyDpps.unshift(newDpp);

      if (!db.auditLogs) db.auditLogs = [];
      db.auditLogs.unshift({
        _id: generateId(),
        admin_email: admin?.email || 'admin@exammaster.com',
        action: 'CREATE_WEEKLY_DPP',
        details: `Created Weekly DPP "${title}" for course ID ${course_id}`,
        timestamp: new Date().toISOString(),
      });

      writeSharedDb(db);
      return NextResponse.json({ success: true, weeklyDpp: newDpp }, { status: 201 });
    }

    // Mongoose Mode
    const newDpp = await WeeklyDPP.create({
      course_id,
      title: title.trim(),
      duration_minutes: Number(duration_minutes),
      question_ids: question_ids || [],
      is_active: true,
      created_at: new Date(),
    });

    await AuditLog.create({
      admin_name: admin?.name || 'Master Controller',
      action_type: 'CREATE_WEEKLY_DPP',
      details: `Created Weekly DPP "${title}" for course ID ${course_id}`,
    });

    return NextResponse.json({ success: true, weeklyDpp: newDpp }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
