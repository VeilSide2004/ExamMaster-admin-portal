import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { Question, AuditLog } from '@/lib/models';
import { readSharedDb, writeSharedDb, generateId } from '@/lib/sharedDb';
import { getAuthenticatedAdmin } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { isMemoryMode } = await dbConnect();
    const admin = getAuthenticatedAdmin();

    const body = await req.json();
    let questionsRaw = body.questions !== undefined ? body.questions : body;

    let targetCourseId = body.course_id || '';
    let defaultSubject = body.subject || body.defaultSubject || '';
    let defaultChapter = body.chapter || body.defaultTopic || '';

    if (questionsRaw && typeof questionsRaw === 'object' && !Array.isArray(questionsRaw)) {
      if (!defaultSubject) defaultSubject = questionsRaw.subject || '';
      if (!defaultChapter) defaultChapter = questionsRaw.chapter || '';
      if (Array.isArray(questionsRaw.questions)) {
        questionsRaw = questionsRaw.questions;
      }
    }

    if (!Array.isArray(questionsRaw) || questionsRaw.length === 0) {
      return NextResponse.json({ error: 'Please provide a non-empty array of questions' }, { status: 400 });
    }

    const preparedQuestions: any[] = [];
    for (let i = 0; i < questionsRaw.length; i++) {
      const q = questionsRaw[i];
      const qText = q.question_text || q.question || q.prompt || '';
      const opts = Array.isArray(q.options) ? q.options : [];

      if (!qText || opts.length < 2) {
        return NextResponse.json(
          { error: `Question #${i + 1} is missing required question prompt or options array.` },
          { status: 400 }
        );
      }

      let correctIndex = 0;
      if (typeof q.correct_option === 'number') {
        correctIndex = q.correct_option;
      } else if (typeof q.correctAnswer === 'number') {
        correctIndex = q.correctAnswer;
      } else if (typeof q.correctAnswer === 'string') {
        const idx = opts.findIndex((o: any) => String(o).trim().toLowerCase() === q.correctAnswer.trim().toLowerCase());
        if (idx !== -1) {
          correctIndex = idx;
        } else {
          const char = q.correctAnswer.trim().toUpperCase();
          if (char === 'B' || char === '1') correctIndex = 1;
          else if (char === 'C' || char === '2') correctIndex = 2;
          else if (char === 'D' || char === '3') correctIndex = 3;
        }
      }

      const subj = q.subject || defaultSubject || 'Chemistry';
      const chap = q.chapter || q.topic || defaultChapter || 'General';
      let topicTag = q.topic_tag || (subj && chap ? `${subj} - ${chap}` : subj || chap || 'General');
      if (topicTag && !topicTag.includes('-') && subj) {
        topicTag = `${subj} - ${topicTag}`;
      }
      const courseId = q.course_id || targetCourseId || 'course_jee_2027';

      preparedQuestions.push({
        _id: generateId(),
        course_id: courseId,
        subject: subj,
        topic_tag: topicTag,
        question_text: qText,
        options: opts,
        correct_option: Number(correctIndex),
        explanation: q.explanation || `Correct Answer: ${opts[correctIndex] || ''}`,
        detailed_explanation: q.detailed_explanation || '',
        is_active: true,
        created_at: new Date().toISOString(),
      });
    }

    if (isMemoryMode) {
      const db = readSharedDb();
      if (!db.questions) db.questions = [];
      preparedQuestions.forEach((q) => db.questions.unshift(q));

      if (!db.auditLogs) db.auditLogs = [];
      db.auditLogs.unshift({
        _id: generateId(),
        admin_id: admin?.adminId || 'admin_master_1',
        admin_name: admin?.name || 'Admin',
        action_type: 'BULK_ADD_QUESTIONS',
        affected_entity_id: `batch_${preparedQuestions.length}`,
        details: `Bulk uploaded ${preparedQuestions.length} questions into question bank`,
        timestamp: new Date().toISOString(),
      });

      writeSharedDb(db);
      return NextResponse.json({ success: true, count: preparedQuestions.length, questions: preparedQuestions });
    }

    // Mongoose mode
    const inserted = await Question.insertMany(
      preparedQuestions.map((q) => ({
        course_id: q.course_id,
        topic_tag: q.topic_tag,
        question_text: q.question_text,
        options: q.options,
        correct_option: q.correct_option,
        explanation: q.explanation,
        detailed_explanation: q.detailed_explanation,
        is_active: true,
      }))
    );

    await AuditLog.create({
      admin_id: admin?.adminId,
      admin_name: admin?.name || 'Admin',
      action_type: 'BULK_ADD_QUESTIONS',
      affected_entity_id: `batch_${inserted.length}`,
      details: `Bulk uploaded ${inserted.length} questions into question bank`,
    });

    return NextResponse.json({ success: true, count: inserted.length, questions: inserted });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
