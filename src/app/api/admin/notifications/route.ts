import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { Notification, AuditLog } from '@/lib/models';
import { readSharedDb, writeSharedDb, generateId } from '@/lib/sharedDb';
import { getAuthenticatedAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET: Fetch all sent notifications for admin management
export async function GET() {
  try {
    const { isMemoryMode } = await dbConnect();

    if (isMemoryMode) {
      const db = readSharedDb();
      const notifications = (db.notifications || []).sort(
        (a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
      return NextResponse.json({ notifications });
    }

    const notifications = await Notification.find({}).sort({ created_at: -1 });
    return NextResponse.json({ notifications });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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

// DELETE: Admin removes / revokes a previously sent notification
export async function DELETE(request: Request) {
  try {
    const { isMemoryMode } = await dbConnect();
    const admin = getAuthenticatedAdmin();

    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await request.json();
        id = body.id || body.notificationId;
      } catch (e) {}
    }

    if (!id) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }

    if (isMemoryMode) {
      const db = readSharedDb();
      if (!db.notifications) db.notifications = [];

      const target = db.notifications.find((n: any) => String(n._id) === String(id));
      db.notifications = db.notifications.filter((n: any) => String(n._id) !== String(id));

      if (!db.auditLogs) db.auditLogs = [];
      db.auditLogs.unshift({
        _id: generateId(),
        admin_email: admin?.email || 'admin@exammaster.com',
        action: 'DELETE_NOTIFICATION',
        details: `Deleted notification "${target?.title || id}"`,
        timestamp: new Date().toISOString(),
      });

      writeSharedDb(db);
      return NextResponse.json({ success: true, message: 'Notification removed successfully!' });
    }

    // Mongoose Mode
    const target = await Notification.findById(id);
    await Notification.findByIdAndDelete(id);

    await AuditLog.create({
      admin_name: admin?.name || 'Master Controller',
      action_type: 'DELETE_NOTIFICATION',
      details: `Deleted notification "${target?.title || id}"`,
    });

    return NextResponse.json({ success: true, message: 'Notification removed successfully!' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
