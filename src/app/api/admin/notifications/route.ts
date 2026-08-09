import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { Notification, AuditLog } from '@/lib/models';
import { readSharedDb, writeSharedDb, generateId } from '@/lib/sharedDb';
import { getAuthenticatedAdmin } from '@/lib/auth';

// POST: Admin sends a notification to a specific user, course batch, or broadcast to all students
export async function POST(request: Request) {
  try {
    const { isMemoryMode } = await dbConnect();
    const admin = getAuthenticatedAdmin();

    const body = await request.json();
    const { targetType, targetUserId, targetCourseId, title, message, type } = body;

    if (!title || !message) {
      return NextResponse.json({ error: 'Notification title and message content are required' }, { status: 400 });
    }

    const notifType = ['info', 'alert', 'announcement', 'warning', 'success'].includes(type)
      ? type
      : 'announcement';

    const validTargetType = ['all', 'user', 'course'].includes(targetType) ? targetType : 'all';

    if (isMemoryMode) {
      const db = readSharedDb();
      if (!db.notifications) db.notifications = [];

      const newNotif = {
        _id: generateId(),
        targetType: validTargetType,
        targetUserId: validTargetType === 'user' ? targetUserId : null,
        targetCourseId: validTargetType === 'course' ? targetCourseId : null,
        title: title.trim(),
        message: message.trim(),
        type: notifType,
        readBy: [],
        created_at: new Date().toISOString(),
      };

      db.notifications.unshift(newNotif);

      // Add audit log
      if (!db.auditLogs) db.auditLogs = [];
      db.auditLogs.unshift({
        _id: generateId(),
        admin_email: admin?.email || 'admin@exammaster.com',
        action: 'SEND_NOTIFICATION',
        details: `Sent notification "${title}" (Target: ${validTargetType})`,
        timestamp: new Date().toISOString(),
      });

      writeSharedDb(db);

      return NextResponse.json({
        success: true,
        message: `Notification sent successfully to ${validTargetType === 'all' ? 'all students' : validTargetType}!`,
        notification: newNotif,
      });
    }

    // Mongoose Mode
    const newNotif = await Notification.create({
      targetType: validTargetType,
      targetUserId: validTargetType === 'user' ? targetUserId : null,
      targetCourseId: validTargetType === 'course' ? targetCourseId : null,
      title: title.trim(),
      message: message.trim(),
      type: notifType,
      readBy: [],
      created_at: new Date(),
    });

    await AuditLog.create({
      admin_name: admin?.name || 'Master Controller',
      action_type: 'SEND_NOTIFICATION',
      details: `Sent notification "${title}" (Target: ${validTargetType})`,
    });

    return NextResponse.json({
      success: true,
      message: `Notification sent successfully to ${validTargetType === 'all' ? 'all students' : validTargetType}!`,
      notification: newNotif,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
