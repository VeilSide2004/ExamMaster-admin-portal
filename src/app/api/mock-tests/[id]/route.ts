import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { MockTest, AuditLog } from '@/lib/models';
import { readSharedDb, writeSharedDb, generateId } from '@/lib/sharedDb';
import { getAuthenticatedAdmin } from '@/lib/auth';

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { isMemoryMode } = await dbConnect();
    const admin = getAuthenticatedAdmin();

    if (isMemoryMode) {
      const db = readSharedDb();
      const test = (db.mockTests || []).find((m) => m._id === params.id);
      if (test) {
        test.is_active = false;
      }
      if (!db.auditLogs) db.auditLogs = [];
      db.auditLogs.unshift({
        _id: generateId(),
        admin_id: admin?.adminId || 'admin_master_1',
        admin_name: admin?.name || 'Admin',
        action_type: 'DELETE_MOCK_TEST',
        affected_entity_id: params.id,
        details: `Deactivated mock test ID ${params.id}`,
        timestamp: new Date().toISOString(),
      });
      writeSharedDb(db);
      return NextResponse.json({ success: true });
    }

    await MockTest.findByIdAndUpdate(params.id, { is_active: false });

    await AuditLog.create({
      admin_id: admin?.adminId,
      admin_name: admin?.name || 'Admin',
      action_type: 'DELETE_MOCK_TEST',
      affected_entity_id: params.id,
      details: `Deactivated mock test ID ${params.id}`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
