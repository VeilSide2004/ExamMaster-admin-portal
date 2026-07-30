import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { Admin, AuditLog } from '@/lib/models';
import { readSharedDb, writeSharedDb, generateId } from '@/lib/sharedDb';
import { getAuthenticatedAdmin } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const { isMemoryMode } = await dbConnect();

    if (isMemoryMode) {
      const db = readSharedDb();
      const safeAdmins = (db.admins || []).map((a) => ({
        _id: a._id,
        name: a.name,
        email: a.email,
        role: a.role || 'Admin',
        permissions: a.permissions || (a.role === 'Super Admin' ? ['all'] : ['manage_questions']),
        allowed_courses: a.allowed_courses || ['all'],
        created_at: a.created_at || new Date().toISOString(),
      }));
      return NextResponse.json({ admins: safeAdmins });
    }

    const admins = await Admin.find().select('-password_hash').sort({ created_at: -1 });
    return NextResponse.json({ admins });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { isMemoryMode } = await dbConnect();
    const currentAdmin = getAuthenticatedAdmin();
    const { name, email, password, role, permissions, allowed_courses } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, username/email, and password are required' }, { status: 400 });
    }

    const lowerEmail = email.toLowerCase().trim();
    const finalPermissions = permissions && permissions.length > 0 ? permissions : (role === 'Super Admin' ? ['all'] : ['manage_questions']);
    const finalCourses = allowed_courses && allowed_courses.length > 0 ? allowed_courses : ['all'];

    if (isMemoryMode) {
      const db = readSharedDb();
      const existing = (db.admins || []).find((a) => a.email.toLowerCase() === lowerEmail);
      if (existing) {
        return NextResponse.json({ error: 'An admin with this username/email already exists' }, { status: 400 });
      }

      const password_hash = await bcrypt.hash(password, 10);
      const newAdmin = {
        _id: generateId(),
        name,
        email: lowerEmail,
        password_hash,
        role: role || 'Course Manager',
        permissions: finalPermissions,
        allowed_courses: finalCourses,
        created_at: new Date().toISOString(),
      };

      if (!db.admins) db.admins = [];
      db.admins.unshift(newAdmin);

      if (!db.auditLogs) db.auditLogs = [];
      db.auditLogs.unshift({
        _id: generateId(),
        admin_id: currentAdmin?.adminId || 'admin_master_1',
        admin_name: currentAdmin?.name || 'Admin',
        action_type: 'ASSIGN_ADMIN',
        affected_entity_id: newAdmin._id,
        details: `Assigned new admin user "${lowerEmail}" with role "${newAdmin.role}"`,
        timestamp: new Date().toISOString(),
      });

      writeSharedDb(db);
      return NextResponse.json({ success: true, admin: { id: newAdmin._id, name, email: lowerEmail, role: newAdmin.role, permissions: finalPermissions, allowed_courses: finalCourses } });
    }

    // Mongoose mode
    const existing = await Admin.findOne({ email: lowerEmail });
    if (existing) {
      return NextResponse.json({ error: 'An admin with this username/email already exists' }, { status: 400 });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const admin = await Admin.create({
      name,
      email: lowerEmail,
      password_hash,
      role: role || 'Course Manager',
      permissions: finalPermissions,
      allowed_courses: finalCourses,
    });

    await AuditLog.create({
      admin_id: currentAdmin?.adminId,
      admin_name: currentAdmin?.name || 'Admin',
      action_type: 'ASSIGN_ADMIN',
      affected_entity_id: admin._id.toString(),
      details: `Assigned new admin user "${lowerEmail}" with role "${admin.role}"`,
    });

    return NextResponse.json({ success: true, admin: { id: admin._id, name, email: lowerEmail, role: admin.role, permissions: finalPermissions, allowed_courses: finalCourses } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
