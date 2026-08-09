import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { User, AuditLog } from '@/lib/models';
import { readSharedDb, writeSharedDb, generateId } from '@/lib/sharedDb';
import { getAuthenticatedAdmin } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET(req: Request) {
  try {
    const { isMemoryMode } = await dbConnect();
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const statusFilter = searchParams.get('status') || '';
    const courseFilter = searchParams.get('course') || '';

    if (isMemoryMode) {
      const db = readSharedDb();
      let filtered = (db.users || []).filter((u) => u.status !== 'Deleted');

      if (query) {
        filtered = filtered.filter(
          (u) => u.name.toLowerCase().includes(query.toLowerCase()) || u.email.toLowerCase().includes(query.toLowerCase())
        );
      }
      if (statusFilter) {
        filtered = filtered.filter((u) => u.status === statusFilter);
      }

      if (courseFilter) {
        if (courseFilter === 'pending') {
          filtered = filtered.filter((u) => !u.locked_course_id);
        } else {
          filtered = filtered.filter((u) => u.locked_course_id && String(u.locked_course_id) === String(courseFilter));
        }
      }

      const formatted = filtered.map((u) => {
        const course = u.locked_course_id ? (db.courses || []).find((c) => String(c._id) === String(u.locked_course_id)) : null;
        return {
          ...u,
          locked_course_id: course ? { _id: course._id, name: course.name, category: course.category } : null,
        };
      });

      return NextResponse.json({ users: formatted });
    }

    // Mongoose mode
    const filter: any = { status: { $ne: 'Deleted' } };
    if (statusFilter) filter.status = statusFilter;
    if (courseFilter) {
      if (courseFilter === 'pending') {
        filter.$or = [{ locked_course_id: null }, { locked_course_id: { $exists: false } }];
      } else {
        filter.locked_course_id = courseFilter;
      }
    }

    if (query) {
      const searchOr = [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
      ];
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchOr }];
        delete filter.$or;
      } else {
        filter.$or = searchOr;
      }
    }

    const users = await User.find(filter).populate('locked_course_id', 'name category').sort({ created_at: -1 });
    return NextResponse.json({ users });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { isMemoryMode } = await dbConnect();
    const admin = getAuthenticatedAdmin();
    const { name, email, password, locked_course_id } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    const lowerEmail = email.toLowerCase().trim();

    if (isMemoryMode) {
      const db = readSharedDb();
      const existing = (db.users || []).find((u) => u.email.toLowerCase() === lowerEmail);
      if (existing) {
        return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
      }

      const password_hash = await bcrypt.hash(password, 10);
      const newUser = {
        _id: generateId(),
        name,
        email: lowerEmail,
        password_hash,
        status: 'Active',
        xp_total: 0,
        locked_course_id: locked_course_id || null,
        created_at: new Date().toISOString(),
      };

      if (!db.users) db.users = [];
      db.users.unshift(newUser);

      if (!db.auditLogs) db.auditLogs = [];
      db.auditLogs.unshift({
        _id: generateId(),
        admin_id: admin?.adminId || 'admin_master_1',
        admin_name: admin?.name || 'Admin',
        action_type: 'REGISTER_USER',
        affected_entity_id: newUser._id,
        details: `Manually onboarded student account "${lowerEmail}"`,
        timestamp: new Date().toISOString(),
      });

      writeSharedDb(db);
      return NextResponse.json({ success: true, user: newUser });
    }

    // Mongoose mode
    const existing = await User.findOne({ email: lowerEmail });
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name,
      email: lowerEmail,
      password_hash,
      status: 'Active',
      xp_total: 0,
      locked_course_id: locked_course_id || null,
    });

    await AuditLog.create({
      admin_id: admin?.adminId,
      admin_name: admin?.name || 'Admin',
      action_type: 'REGISTER_USER',
      affected_entity_id: newUser._id.toString(),
      details: `Manually onboarded student account "${lowerEmail}"`,
    });

    return NextResponse.json({ success: true, user: newUser });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
