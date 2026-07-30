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
