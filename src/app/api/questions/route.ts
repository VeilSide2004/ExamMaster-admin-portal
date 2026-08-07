import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { Question, AuditLog } from '@/lib/models';
import { readSharedDb, writeSharedDb, generateId } from '@/lib/sharedDb';
import { getAuthenticatedAdmin } from '@/lib/auth';

export async function GET() {
  try {
    const { isMemoryMode } = await dbConnect();

    if (isMemoryMode) {
      const db = readSharedDb();
      const activeQuestions = (db.questions || [])
        .filter((q) => q.is_active)
        .map((q) => {
          const course = (db.courses || []).find((c) => c._id === q.course_id);
          return {
            ...q,
            course_id: course ? { _id: course._id, name: course.name } : { name: 'General Course' },
          };
        });
      return NextResponse.json({ questions: activeQuestions });
    }

    const questions = await Question.find({ is_active: true }).populate('course_id', 'name').sort({ created_at: -1 });
    return NextResponse.json({ questions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { isMemoryMode } = await dbConnect();
    const admin = getAuthenticatedAdmin();

    const body = await req.json();
    const { course_id, topic_tag, question_type, question_text, options, correct_option, sample_answer, marks, explanation, detailed_explanation } = body;

    const qType = question_type === 'Short Answer' || question_type === 'Long Answer' ? question_type : 'MCQ';

    if (!course_id || !topic_tag || !question_text) {
      return NextResponse.json({ error: 'Missing required question fields' }, { status: 400 });
    }

    if (qType === 'MCQ' && (!options || options.length < 2 || correct_option === undefined)) {
      return NextResponse.json({ error: 'MCQ questions require at least 2 options and a correct option index' }, { status: 400 });
    }

    // RBAC validation
    if (admin) {
      const permissions = admin.permissions || [];
      const allowedCourses = admin.allowed_courses || ['all'];
      const isSuper = admin.role === 'Super Admin' || permissions.includes('all');

      if (!isSuper && !permissions.includes('manage_questions')) {
        return NextResponse.json({ error: 'Access Denied: You do not have permission to manage questions.' }, { status: 403 });
      }

      if (!isSuper && !allowedCourses.includes('all') && !allowedCourses.includes(course_id)) {
        return NextResponse.json({ error: 'Access Denied: You are not authorized to add questions for this course.' }, { status: 403 });
      }
    }

    const calculatedMarks = marks !== undefined ? Number(marks) : (qType === 'Long Answer' ? 5 : qType === 'Short Answer' ? 2 : 1);

    if (isMemoryMode) {
      const db = readSharedDb();
      if (!db.questions) db.questions = [];

      const newQ = {
        _id: generateId(),
        course_id,
        topic_tag,
        question_type: qType,
        question_text,
        options: qType === 'MCQ' ? (options || []) : [],
        correct_option: qType === 'MCQ' ? Number(correct_option || 0) : 0,
        sample_answer: sample_answer || '',
        marks: calculatedMarks,
        explanation: explanation || '',
        detailed_explanation: detailed_explanation || '',
        is_active: true,
        created_at: new Date().toISOString(),
      };
      db.questions.unshift(newQ);

      if (!db.auditLogs) db.auditLogs = [];
      db.auditLogs.unshift({
        _id: generateId(),
        admin_id: admin?.adminId || 'admin_master_1',
        admin_name: admin?.name || 'Admin',
        action_type: 'ADD_QUESTION',
        affected_entity_id: newQ._id,
        details: `Added new ${qType} question under topic "${topic_tag}"`,
        timestamp: new Date().toISOString(),
      });

      writeSharedDb(db);
      return NextResponse.json({ success: true, question: newQ });
    }

    // Mongoose mode
    const question = await Question.create({
      course_id,
      topic_tag,
      question_type: qType,
      question_text,
      options: qType === 'MCQ' ? (options || []) : [],
      correct_option: qType === 'MCQ' ? Number(correct_option || 0) : 0,
      sample_answer: sample_answer || '',
      marks: calculatedMarks,
      explanation: explanation || '',
      detailed_explanation: detailed_explanation || '',
      is_active: true,
    });

    await AuditLog.create({
      admin_id: admin?.adminId,
      admin_name: admin?.name || 'Admin',
      action_type: 'ADD_QUESTION',
      affected_entity_id: question._id.toString(),
      details: `Added new question under topic "${topic_tag}"`,
    });

    return NextResponse.json({ success: true, question });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
