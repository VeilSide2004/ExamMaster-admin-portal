'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Trophy,
  BookOpen,
  Users,
  Search,
  Zap,
  Clock,
  FileCheck,
  ChevronRight,
  Filter,
  BarChart3,
  Award,
  Crown,
  Eye,
} from 'lucide-react';
import { StudentStatsModal } from '@/components/ui/StudentStatsModal';

export default function StudentPerformancePage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resCourses, resUsers] = await Promise.all([
        fetch('/api/courses'),
        fetch('/api/users'),
      ]);

      const dataCourses = await resCourses.json();
      const dataUsers = await resUsers.json();

      if (dataCourses.courses) setCourses(dataCourses.courses);
      if (dataUsers.users) {
        const activeUsers = dataUsers.users.filter((u: any) => u.status !== 'Deleted');
        setUsers(activeUsers);
      }
    } catch (e) {
      console.error('Error fetching performance data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Build course card analytics
  const courseCards = useMemo(() => {
    return courses.map((course) => {
      const enrolledStudents = users
        .filter((u) => {
          if (!u.locked_course_id) return false;
          const userCourseId = typeof u.locked_course_id === 'object' ? u.locked_course_id._id : u.locked_course_id;
          return String(userCourseId) === String(course._id);
        })
        .sort((a, b) => (b.xp_total || 0) - (a.xp_total || 0));

      const topStudent = enrolledStudents[0] || null;

      return {
        ...course,
        enrolledCount: enrolledStudents.length,
        topStudent,
        top20Leaderboard: enrolledStudents.slice(0, 20),
      };
    });
  }, [courses, users]);

  // Selected course object
  const activeCourseObj = useMemo(() => {
    if (!selectedCourseId) return courseCards[0] || null;
    return courseCards.find((c) => String(c._id) === String(selectedCourseId)) || courseCards[0] || null;
  }, [courseCards, selectedCourseId]);

  // Leaderboard students for active course
  const currentLeaderboard = useMemo(() => {
    if (!activeCourseObj) return [];
    let list = activeCourseObj.top20Leaderboard;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((u: any) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    return list;
  }, [activeCourseObj, searchQuery]);

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Trophy className="w-7 h-7 text-amber-500" />
            Student Performance & Course Leaderboards
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
            Automated course cards, top 20 batch standings, mock tests attempted, and question pacing statistics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-extrabold text-xs rounded-xl border border-blue-200 dark:border-blue-800">
            📊 {courses.length} Active Courses Monitored
          </span>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-extrabold text-slate-500">Loading course leaderboards & student analytics...</p>
        </div>
      ) : (
        <>
          {/* Automated Course Cards Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                Automated Course Cards
              </h2>
              <span className="text-xs text-slate-400 font-medium">Click a card to view Top 20 leaderboard</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {courseCards.map((card) => {
                const isSelected = activeCourseObj && String(activeCourseObj._id) === String(card._id);
                return (
                  <div
                    key={card._id}
                    onClick={() => setSelectedCourseId(card._id)}
                    className={`p-5 rounded-3xl border transition-all cursor-pointer space-y-4 relative overflow-hidden group ${
                      isSelected
                        ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-blue-600 shadow-xl shadow-blue-500/20 scale-[1.01]'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                        }`}>
                          {card.category || 'Batch Course'}
                        </span>
                        <h3 className={`text-base font-black mt-2 ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                          {card.name}
                        </h3>
                      </div>

                      <div className={`p-3 rounded-2xl ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                        <Trophy className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100/10 dark:border-slate-800">
                      <div>
                        <span className={`text-[10px] font-bold block ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                          Enrolled Batch
                        </span>
                        <span className={`text-sm font-black ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                          {card.enrolledCount} Students
                        </span>
                      </div>
                      <div>
                        <span className={`text-[10px] font-bold block ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                          Batch Rank #1
                        </span>
                        <span className={`text-xs font-black truncate block ${isSelected ? 'text-white' : 'text-amber-600 dark:text-amber-400'}`}>
                          {card.topStudent ? `🥇 ${card.topStudent.name}` : 'No Students Yet'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className={`text-[11px] font-extrabold flex items-center gap-1 ${isSelected ? 'text-blue-100' : 'text-blue-600 dark:text-blue-400'}`}>
                        Monitor Top 20 Standings <ChevronRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Course Top 20 Leaderboard Section */}
          {activeCourseObj && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-extrabold uppercase">
                      Top 20 Leaderboard
                    </span>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">
                      {activeCourseObj.name} Batch Standings
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Showing top 20 ranked students in this course. Click any student row to view detailed statistics modal.
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search student name..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="p-3">Rank</th>
                      <th className="p-3">Student</th>
                      <th className="p-3">Course Batch</th>
                      <th className="p-3">XP Total</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Analytics</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {currentLeaderboard.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">
                          No students found in this course batch.
                        </td>
                      </tr>
                    ) : (
                      currentLeaderboard.map((student: any, idx: number) => {
                        const rank = idx + 1;
                        return (
                          <tr
                            key={student._id}
                            onClick={() => setSelectedStudentId(student._id)}
                            className="hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                          >
                            <td className="p-3.5">
                              <span className={`w-8 h-8 rounded-full font-black text-xs flex items-center justify-center ${
                                rank === 1
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                                  : rank === 2
                                  ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                  : rank === 3
                                  ? 'bg-amber-800/20 text-amber-800 dark:text-amber-400'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              }`}>
                                {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                              </span>
                            </td>

                            <td className="p-3.5">
                              <div className="font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                                {student.name}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono">{student.email}</div>
                            </td>

                            <td className="p-3.5 font-bold text-slate-700 dark:text-slate-300">
                              <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[11px]">
                                {activeCourseObj.name}
                              </span>
                            </td>

                            <td className="p-3.5 font-black text-emerald-600 dark:text-emerald-400 text-sm">
                              {(student.xp_total || 0).toLocaleString()} XP
                            </td>

                            <td className="p-3.5">
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-black uppercase rounded">
                                {student.status || 'Active'}
                              </span>
                            </td>

                            <td className="p-3.5 text-right">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedStudentId(student._id);
                                }}
                                className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 font-bold text-[11px] rounded-xl flex items-center gap-1.5 ml-auto cursor-pointer transition-all"
                              >
                                <Eye className="w-3.5 h-3.5" /> View Stats
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Student Statistics Analytics Modal */}
      {selectedStudentId && (
        <StudentStatsModal
          studentId={selectedStudentId}
          onClose={() => setSelectedStudentId(null)}
        />
      )}
    </div>
  );
}
