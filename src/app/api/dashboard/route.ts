import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { User, Question, Course, Attempt, AuditLog, MockTest } from '@/lib/models';

export async function GET() {
  try {
    await dbConnect();

    const totalStudents = await User.countDocuments({ status: { $ne: 'Deleted' } });
    const totalQuestions = await Question.countDocuments({ is_active: true });
    const activeCourses = await Course.countDocuments({ is_active: true });
    const activeMockTests = await MockTest.countDocuments({ is_active: true });

    const attempts = await Attempt.find();
    const totalAttempts = attempts.length;
    let passRate = 'No attempts yet';

    if (totalAttempts > 0) {
      const passed = attempts.filter((a: any) => (a.score / (((a.responses?.length || a.total_questions || 1)) * 4)) >= 0.4).length;
      passRate = `${((passed / totalAttempts) * 100).toFixed(1)}%`;
    }

    const hourlyData = [
      { time: '00:00', count: 0 },
      { time: '02:00', count: 0 },
      { time: '04:00', count: 0 },
      { time: '06:00', count: 0 },
      { time: '08:00', count: 0 },
      { time: '10:00', count: 0 },
      { time: '12:00', count: 0 },
      { time: '14:00', count: 0 },
      { time: '16:00', count: 0 },
      { time: '18:00', count: 0 },
      { time: '20:00', count: 0 },
      { time: '22:00', count: 0 },
    ];

    attempts.forEach((att: any) => {
      const dateStr = att.submitted_at || att.started_at || att.completed_at || att.created_at;
      if (dateStr) {
        const hour = new Date(dateStr).getHours();
        const index = Math.floor(hour / 2);
        if (hourlyData[index]) {
          hourlyData[index].count += 1;
        }
      }
    });

    const auditLogs = await AuditLog.find().sort({ timestamp: -1 }).limit(5);

    return NextResponse.json({
      metrics: {
        totalStudents,
        totalQuestions,
        activeCourses,
        activeMockTests,
        totalAttempts,
        passRate,
      },
      hourlyData,
      auditLogs,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
