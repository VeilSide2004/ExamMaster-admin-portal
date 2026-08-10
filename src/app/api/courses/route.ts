import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { Course, AuditLog } from '@/lib/models';
import { readSharedDb, writeSharedDb, generateId } from '@/lib/sharedDb';
import { getAuthenticatedAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const { isMemoryMode } = await dbConnect();

    if (isMemoryMode) {
      const db = readSharedDb();
      return NextResponse.json({ courses: db.courses || [] });
    }

    const courses = await Course.find({}).sort({ created_at: -1 });
    return NextResponse.json({ courses });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { isMemoryMode } = await dbConnect();
    const admin = getAuthenticatedAdmin();
    const body = await req.json();

    const { name, description, category, board, curriculum, subjects, marks_per_correct, penalty_per_incorrect } = body;

    if (!name || !description) {
      return NextResponse.json({ error: 'Name and description are required' }, { status: 400 });
    }

    const catStr = String(category || '').toLowerCase().trim();
    const isSchool = catStr.includes('school') || catStr.includes('class') || catStr.includes('3-12') || catStr.includes('6-12') || catStr.includes('board');
    const courseCategory = isSchool ? 'School Exams' : 'Competitive Exams';
    const courseBoard = isSchool ? String(board || 'CBSE').trim() : (board ? String(board).trim() : 'N/A');
    const courseCurriculum = String(curriculum || '').trim();

    const parsedSubjects = Array.isArray(subjects) && subjects.length > 0
      ? subjects
      : typeof subjects === 'string'
      ? subjects.split(',').map((s: string) => s.trim()).filter(Boolean)
      : ['Physics', 'Chemistry', 'Mathematics'];

    if (isMemoryMode) {
      const db = readSharedDb();
      if (!db.courses) db.courses = [];

      const existing = db.courses.find((c) => c.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        return NextResponse.json({ error: 'Course with this name already exists' }, { status: 400 });
      }

      const newCourse = {
        _id: generateId(),
        name,
        description,
        category: courseCategory,
        board: courseBoard,
        curriculum: courseCurriculum,
        subjects: parsedSubjects,
        marking_scheme: {
          marks_per_correct: marks_per_correct !== undefined ? Number(marks_per_correct) : 4,
          penalty_per_incorrect: penalty_per_incorrect !== undefined ? Number(penalty_per_incorrect) : 1,
        },
        is_active: true,
        created_at: new Date().toISOString(),
      };

      db.courses.unshift(newCourse);

      if (!db.auditLogs) db.auditLogs = [];
      db.auditLogs.unshift({
        _id: generateId(),
        admin_id: admin?.adminId || 'admin_master_1',
        admin_name: admin?.name || 'Admin',
        action_type: 'ADD_COURSE',
        affected_entity_id: newCourse._id,
        details: `Created new course "${name}" (${courseCategory} - ${courseBoard}) with subjects: ${parsedSubjects.join(', ')}`,
        timestamp: new Date().toISOString(),
      });

      writeSharedDb(db);
      return NextResponse.json({ success: true, course: newCourse });
    }

    // Mongoose mode
    const existing = await Course.findOne({ name });
    if (existing) {
      return NextResponse.json({ error: 'Course with this name already exists' }, { status: 400 });
    }

    const course = await Course.create({
      name,
      description,
      category: courseCategory,
      board: courseBoard,
      curriculum: courseCurriculum,
      subjects: parsedSubjects,
      marking_scheme: {
        marks_per_correct: marks_per_correct !== undefined ? Number(marks_per_correct) : 4,
        penalty_per_incorrect: penalty_per_incorrect !== undefined ? Number(penalty_per_incorrect) : 1,
      },
      is_active: true,
    });

    await AuditLog.create({
      admin_id: admin?.adminId,
      admin_name: admin?.name || 'Admin',
      action_type: 'ADD_COURSE',
      affected_entity_id: course._id.toString(),
      details: `Created new course "${name}" (${courseCategory}) with subjects: ${parsedSubjects.join(', ')}`,
    });

    return NextResponse.json({ success: true, course });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
