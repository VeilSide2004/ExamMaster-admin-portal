import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { Course, AuditLog } from '@/lib/models';
import { readSharedDb, writeSharedDb, generateId } from '@/lib/sharedDb';
import { getAuthenticatedAdmin } from '@/lib/auth';

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { isMemoryMode } = await dbConnect();
    const currentAdmin = getAuthenticatedAdmin();
    const courseId = params.id;

    if (isMemoryMode) {
      const db = readSharedDb();
      const courseIdx = (db.courses || []).findIndex((c) => c._id === courseId);
      if (courseIdx === -1) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 });
      }

      const removedCourse = db.courses[courseIdx];
      db.courses.splice(courseIdx, 1);

      if (!db.auditLogs) db.auditLogs = [];
      db.auditLogs.unshift({
        _id: generateId(),
        admin_id: currentAdmin?.adminId || 'admin_master_1',
        admin_name: currentAdmin?.name || 'Admin',
        action_type: 'REMOVE_COURSE',
        affected_entity_id: courseId,
        details: `Removed course "${removedCourse.name}" (${removedCourse._id})`,
        timestamp: new Date().toISOString(),
      });

      writeSharedDb(db);
      return NextResponse.json({ success: true });
    }

    // Mongoose mode
    const course = await Course.findById(courseId);
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    await Course.findByIdAndDelete(courseId);

    await AuditLog.create({
      admin_id: currentAdmin?.adminId,
      admin_name: currentAdmin?.name || 'Admin',
      action_type: 'REMOVE_COURSE',
      affected_entity_id: courseId,
      details: `Removed course "${course.name}" (${course._id})`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const { isMemoryMode } = await dbConnect();
    const currentAdmin = getAuthenticatedAdmin();
    const courseId = params.id;
    const body = await req.json();
    const { name, category, board, curriculum, description, subjects, marks_per_correct, penalty_per_incorrect } = body;

    if (!name) {
      return NextResponse.json({ error: 'Course name is required' }, { status: 400 });
    }

    if (isMemoryMode) {
      const db = readSharedDb();
      const course = (db.courses || []).find((c) => c._id === courseId);
      if (!course) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 });
      }

      course.name = name;
      course.category = category || course.category;
      course.board = board !== undefined ? board : course.board;
      course.curriculum = curriculum !== undefined ? curriculum : course.curriculum;
      course.description = description !== undefined ? description : course.description;
      course.subjects = subjects || course.subjects;
      if (!course.marking_scheme) course.marking_scheme = {};
      course.marking_scheme.marks_per_correct = marks_per_correct !== undefined ? Number(marks_per_correct) : course.marking_scheme.marks_per_correct;
      course.marking_scheme.penalty_per_incorrect = penalty_per_incorrect !== undefined ? Number(penalty_per_incorrect) : course.marking_scheme.penalty_per_incorrect;

      if (!db.auditLogs) db.auditLogs = [];
      db.auditLogs.unshift({
        _id: generateId(),
        admin_id: currentAdmin?.adminId || 'admin_master_1',
        admin_name: currentAdmin?.name || 'Admin',
        action_type: 'UPDATE_COURSE',
        affected_entity_id: courseId,
        details: `Updated course "${course.name}" (${courseId})`,
        timestamp: new Date().toISOString(),
      });

      writeSharedDb(db);
      return NextResponse.json({ success: true, course });
    }

    // Mongoose mode
    const course = await Course.findById(courseId);
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    course.name = name;
    if (category) course.category = category;
    if (board !== undefined) course.board = board;
    if (curriculum !== undefined) course.curriculum = curriculum;
    if (description !== undefined) course.description = description;
    if (subjects) course.subjects = subjects;
    if (!course.marking_scheme) course.marking_scheme = { marks_per_correct: 4, penalty_per_incorrect: 1 };
    if (marks_per_correct !== undefined) course.marking_scheme.marks_per_correct = Number(marks_per_correct);
    if (penalty_per_incorrect !== undefined) course.marking_scheme.penalty_per_incorrect = Number(penalty_per_incorrect);

    await course.save();

    await AuditLog.create({
      admin_id: currentAdmin?.adminId,
      admin_name: currentAdmin?.name || 'Admin',
      action_type: 'UPDATE_COURSE',
      affected_entity_id: courseId,
      details: `Updated course "${course.name}" (${course._id})`,
    });

    return NextResponse.json({ success: true, course });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
