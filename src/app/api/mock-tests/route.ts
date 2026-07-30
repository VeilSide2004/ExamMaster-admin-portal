import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { MockTest, Question, AuditLog } from '@/lib/models';
import { readSharedDb, writeSharedDb, generateId } from '@/lib/sharedDb';
import { getAuthenticatedAdmin } from '@/lib/auth';

export async function GET() {
  try {
    const { isMemoryMode } = await dbConnect();

    if (isMemoryMode) {
      const db = readSharedDb();
      const activeTests = (db.mockTests || [])
        .filter((m) => m.is_active !== false)
        .map((m) => {
          const course = (db.courses || []).find((c) => c._id === m.course_id);
          const qCount = Array.isArray(m.question_ids) ? m.question_ids.length : 0;
          return {
            ...m,
            course_name: course ? course.name : 'General Course',
            question_count: qCount,
          };
        });
      return NextResponse.json({ tests: activeTests });
    }

    const tests = await MockTest.find({ is_active: true }).populate('course_id', 'name').sort({ created_at: -1 });
    return NextResponse.json({ tests });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { isMemoryMode } = await dbConnect();
    const admin = getAuthenticatedAdmin();

    const body = await req.json();
    const { course_id, title, type, duration_minutes, cutoff_marks, question_ids } = body;

    if (!course_id || !title || !duration_minutes) {
      return NextResponse.json({ error: 'Course, title, and duration are required' }, { status: 400 });
    }

    if (isMemoryMode) {
      const db = readSharedDb();

      let selectedQuestionIds = Array.isArray(question_ids) && question_ids.length > 0 ? question_ids : [];
      if (selectedQuestionIds.length === 0) {
        selectedQuestionIds = (db.questions || []).filter((q) => q.course_id === course_id && q.is_active).map((q) => q._id);
      }

      const newTest = {
        _id: generateId(),
        course_id,
        title,
        type: type || 'full',
        duration_minutes: Number(duration_minutes),
        cutoff_marks: Number(cutoff_marks || 0),
        question_ids: selectedQuestionIds,
        is_active: true,
        created_at: new Date().toISOString(),
      };

      if (!db.mockTests) db.mockTests = [];
      db.mockTests.unshift(newTest);

      if (!db.auditLogs) db.auditLogs = [];
      db.auditLogs.unshift({
        _id: generateId(),
        admin_id: admin?.adminId || 'admin_master_1',
        admin_name: admin?.name || 'Admin',
        action_type: 'CREATE_MOCK_TEST',
        affected_entity_id: newTest._id,
        details: `Created new mock test "${title}" (${selectedQuestionIds.length} questions, ${duration_minutes} mins)`,
        timestamp: new Date().toISOString(),
      });

      writeSharedDb(db);
      return NextResponse.json({ success: true, test: newTest });
    }

    // Mongoose mode
    let selectedQuestionIds = Array.isArray(question_ids) && question_ids.length > 0 ? question_ids : [];
    if (selectedQuestionIds.length === 0) {
      const qs = await Question.find({ course_id, is_active: true }).select('_id');
      selectedQuestionIds = qs.map((q) => q._id);
    }

    const test = await MockTest.create({
      course_id,
      title,
      type: type || 'full',
      duration_minutes: Number(duration_minutes),
      cutoff_marks: Number(cutoff_marks || 0),
      question_ids: selectedQuestionIds,
      is_active: true,
    });

    await AuditLog.create({
      admin_id: admin?.adminId,
      admin_name: admin?.name || 'Admin',
      action_type: 'CREATE_MOCK_TEST',
      affected_entity_id: test._id.toString(),
      details: `Created new mock test "${title}" (${selectedQuestionIds.length} questions, ${duration_minutes} mins)`,
    });

    return NextResponse.json({ success: true, test });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
