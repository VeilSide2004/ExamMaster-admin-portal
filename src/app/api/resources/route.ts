import { NextResponse } from 'next/server';
import { readSharedDb, writeSharedDb, generateId } from '@/lib/sharedDb';
import { dbConnect } from '@/lib/db';
import { Resource, Course } from '@/lib/models';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('course_id');

    let dbData = readSharedDb();
    let courses = dbData.courses || [];
    let resources = dbData.resources || [];

    try {
      await dbConnect();
      const mongoCourses = await Course.find().lean();
      if (mongoCourses && mongoCourses.length > 0) courses = mongoCourses;

      const mongoResources = await Resource.find().lean();
      if (mongoResources && mongoResources.length > 0) resources = mongoResources;
    } catch (e) {}

    if (courseId) {
      resources = resources.filter((r: any) => String(r.course_id) === String(courseId));
    }

    return NextResponse.json({
      courses,
      resources,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch admin resources' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { course_id, title, description, subject, resource_type, file_url, file_size, page_count } = body;

    if (!course_id || !title || !file_url) {
      return NextResponse.json({ error: 'Course, Title, and File URL are required' }, { status: 400 });
    }

    const newResource = {
      _id: generateId(),
      course_id,
      title,
      description: description || '',
      subject: subject || 'General',
      resource_type: resource_type || 'PDF Book',
      file_url,
      file_size: file_size || '3.5 MB',
      page_count: page_count ? parseInt(page_count, 10) : 100,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    // Save to sharedDb
    const dbData = readSharedDb();
    if (!dbData.resources) dbData.resources = [];
    dbData.resources.unshift(newResource);
    writeSharedDb(dbData);

    // Save to Mongo if connected
    try {
      await dbConnect();
      await Resource.create(newResource);
    } catch (e) {}

    return NextResponse.json({ success: true, resource: newResource });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create resource' }, { status: 500 });
  }
}
