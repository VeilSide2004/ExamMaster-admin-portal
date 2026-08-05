import { NextResponse } from 'next/server';
import { readSharedDb, writeSharedDb } from '@/lib/sharedDb';
import { dbConnect } from '@/lib/db';
import { Resource } from '@/lib/models';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await request.json();

    const dbData = readSharedDb();
    if (!dbData.resources) dbData.resources = [];

    const idx = dbData.resources.findIndex((r: any) => String(r._id) === String(id));
    if (idx !== -1) {
      dbData.resources[idx] = {
        ...dbData.resources[idx],
        ...body,
      };
      writeSharedDb(dbData);
    }

    try {
      await dbConnect();
      await Resource.findByIdAndUpdate(id, body, { new: true });
    } catch (e) {}

    return NextResponse.json({ success: true, message: 'Resource updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update resource' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    const dbData = readSharedDb();
    if (!dbData.resources) dbData.resources = [];

    dbData.resources = dbData.resources.filter((r: any) => String(r._id) !== String(id));
    writeSharedDb(dbData);

    try {
      await dbConnect();
      await Resource.findByIdAndDelete(id);
    } catch (e) {}

    return NextResponse.json({ success: true, message: 'Resource deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete resource' }, { status: 500 });
  }
}
