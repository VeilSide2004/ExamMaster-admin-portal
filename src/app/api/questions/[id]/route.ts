import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { Question, AuditLog } from '@/lib/models';
import { readSharedDb, writeSharedDb, generateId } from '@/lib/sharedDb';
import { getAuthenticatedAdmin } from '@/lib/auth';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const { isMemoryMode } = await dbConnect();
    const admin = getAuthenticatedAdmin();
    const body = await req.json();

    if (isMemoryMode) {
      const db = readSharedDb();
      const q = (db.questions || []).find((item) => item._id === params.id);
      if (q) {
        Object.assign(q, body);
      }

      if (!db.auditLogs) db.auditLogs = [];
      db.auditLogs.unshift({
        _id: generateId(),
        admin_id: admin?.adminId || 'admin_master_1',
        admin_name: admin?.name || 'Admin',
        action_type: 'EDIT_QUESTION',
        affected_entity_id: params.id,
        details: `Updated question ID ${params.id}`,
        timestamp: new Date().toISOString(),
      });
      writeSharedDb(db);
      return NextResponse.json({ success: true, question: q });
    }

    const updated = await Question.findByIdAndUpdate(params.id, body, { new: true });

    await AuditLog.create({
      admin_id: admin?.adminId,
      admin_name: admin?.name || 'Admin',
      action_type: 'EDIT_QUESTION',
      affected_entity_id: params.id,
      details: `Updated question text / options for ID ${params.id}`,
    });

    return NextResponse.json({ success: true, question: updated });
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
      const q = (db.questions || []).find((item) => item._id === params.id);
      if (q) {
        q.is_active = false;
      }

      if (!db.auditLogs) db.auditLogs = [];
      db.auditLogs.unshift({
        _id: generateId(),
        admin_id: admin?.adminId || 'admin_master_1',
        admin_name: admin?.name || 'Admin',
        action_type: 'DELETE_QUESTION',
        affected_entity_id: params.id,
        details: `Deactivated question ID ${params.id} (soft-delete per RULE-07)`,
        timestamp: new Date().toISOString(),
      });
      writeSharedDb(db);
      return NextResponse.json({ success: true });
    }

    await Question.findByIdAndUpdate(params.id, { is_active: false });

    await AuditLog.create({
      admin_id: admin?.adminId,
      admin_name: admin?.name || 'Admin',
      action_type: 'DELETE_QUESTION',
      affected_entity_id: params.id,
      details: `Deactivated question ID ${params.id} (soft-delete per RULE-07)`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
