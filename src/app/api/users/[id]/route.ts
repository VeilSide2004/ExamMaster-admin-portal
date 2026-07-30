import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { User, AuditLog } from '@/lib/models';
import { readSharedDb, writeSharedDb, generateId } from '@/lib/sharedDb';
import { getAuthenticatedAdmin } from '@/lib/auth';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const { isMemoryMode } = await dbConnect();
    const admin = getAuthenticatedAdmin();
    const { action } = await req.json();

    const newStatus = action === 'suspend' ? 'Suspended' : 'Active';

    if (isMemoryMode) {
      const db = readSharedDb();
      const u = (db.users || []).find((user) => user._id === params.id);
      if (u) {
        u.status = newStatus;
      }
      if (!db.auditLogs) db.auditLogs = [];
      db.auditLogs.unshift({
        _id: generateId(),
        admin_id: admin?.adminId || 'admin_master_1',
        admin_name: admin?.name || 'Admin',
        action_type: action === 'suspend' ? 'SUSPEND_USER' : 'ACTIVATE_USER',
        affected_entity_id: params.id,
        details: `${action === 'suspend' ? 'Suspended' : 'Reinstated'} student user account ID ${params.id}`,
        timestamp: new Date().toISOString(),
      });
      writeSharedDb(db);
      return NextResponse.json({ success: true, user: u });
    }

    const updated = await User.findByIdAndUpdate(params.id, { status: newStatus }, { new: true });

    await AuditLog.create({
      admin_id: admin?.adminId,
      admin_name: admin?.name || 'Admin',
      action_type: action === 'suspend' ? 'SUSPEND_USER' : 'ACTIVATE_USER',
      affected_entity_id: params.id,
      details: `${action === 'suspend' ? 'Suspended' : 'Reinstated'} student user account ID ${params.id}`,
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { isMemoryMode } = await dbConnect();
    const admin = getAuthenticatedAdmin();

    if (isMemoryMode) {
      const db = readSharedDb();
      const u = (db.users || []).find((user) => user._id === params.id);
      if (u) {
        u.status = 'Deleted';
        u.name = 'Deleted User';
        u.email = `deleted_${params.id}@anonymized.local`;
      }
      if (!db.auditLogs) db.auditLogs = [];
      db.auditLogs.unshift({
        _id: generateId(),
        admin_id: admin?.adminId || 'admin_master_1',
        admin_name: admin?.name || 'Admin',
        action_type: 'DELETE_USER',
        affected_entity_id: params.id,
        details: `Deleted student account ID ${params.id} and anonymized PII per data-retention policy`,
        timestamp: new Date().toISOString(),
      });
      writeSharedDb(db);
      return NextResponse.json({ success: true });
    }

    const user = await User.findById(params.id);
    if (user) {
      user.status = 'Deleted';
      user.name = 'Deleted User';
      user.email = `deleted_${params.id}@anonymized.local`;
      await user.save();
    }

    await AuditLog.create({
      admin_id: admin?.adminId,
      admin_name: admin?.name || 'Admin',
      action_type: 'DELETE_USER',
      affected_entity_id: params.id,
      details: `Deleted student account ID ${params.id} and anonymized PII per data-retention policy`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
