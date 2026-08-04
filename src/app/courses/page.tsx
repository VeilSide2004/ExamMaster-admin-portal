'use client';

import React, { useEffect, useState } from 'react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { AdminHeader } from '@/components/layout/AdminHeader';
import { BookOpen, Plus, Trash2, AlertTriangle, X, Trophy, GraduationCap, Sparkles } from 'lucide-react';

export default function CourseManagementPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeCatalogTab, setActiveCatalogTab] = useState<'all' | 'competitive' | 'school'>('all');

  const [name, setName] = useState('');
  const [category, setCategory] = useState<'Competitive Exams' | 'School Exams'>('Competitive Exams');
  const [description, setDescription] = useState('');
  const [subjectsInput, setSubjectsInput] = useState('Physics, Chemistry, Mathematics');
  const [marksPerCorrect, setMarksPerCorrect] = useState(4);
  const [penaltyPerIncorrect, setPenaltyPerIncorrect] = useState(1);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Remove Course Confirmation Modal
  const [deletingCourse, setDeletingCourse] = useState<any | null>(null);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/courses');
      const data = await res.json();
      setCourses(data.courses || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const parsedSubjects = subjectsInput.split(',').map((s) => s.trim()).filter(Boolean);

      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          category,
          description,
          subjects: parsedSubjects,
          marks_per_correct: marksPerCorrect,
          penalty_per_incorrect: penaltyPerIncorrect,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create course');
      } else {
        setShowAddModal(false);
        setName('');
        setCategory('Competitive Exams');
        setDescription('');
        setSubjectsInput('Physics, Chemistry, Mathematics');
        setMarksPerCorrect(4);
        setPenaltyPerIncorrect(1);
        fetchCourses();
      }
    } catch (err: any) {
      setError('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveCourse = async () => {
    if (!deletingCourse) return;
    try {
      await fetch(`/api/courses/${deletingCourse._id}`, { method: 'DELETE' });
      setDeletingCourse(null);
      fetchCourses();
    } catch (err) {
      console.error(err);
    }
  };

  const isSchoolCategory = (c: any) => {
    if (!c.category) return false;
    const cat = String(c.category).toLowerCase().trim();
    return cat.includes('school') || cat.includes('class') || cat.includes('6-12') || cat.includes('board');
  };

  const schoolCourses = courses.filter((c) => isSchoolCategory(c));
  const competitiveCourses = courses.filter((c) => !isSchoolCategory(c));

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader title="Course Management" subtitle="Manage course catalogue across Competitive & School Exams (FR-33, FR-34, FR-35)" />

        <main className="p-8 space-y-6 flex-1 overflow-y-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Active Course Catalogue</h2>
              <p className="text-xs text-slate-500">Newly added courses automatically populate in student selection and question management.</p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Filter Tabs */}
              <div className="flex items-center bg-slate-200/70 dark:bg-slate-800 p-1 rounded-lg text-xs font-semibold">
                <button
                  onClick={() => setActiveCatalogTab('all')}
                  className={`px-3 py-1.5 rounded-md transition-colors ${
                    activeCatalogTab === 'all' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  All ({courses.length})
                </button>
                <button
                  onClick={() => setActiveCatalogTab('competitive')}
                  className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1 ${
                    activeCatalogTab === 'competitive' ? 'bg-amber-500 text-white shadow-xs font-bold' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Trophy className="w-3 h-3" /> Competitive ({competitiveCourses.length})
                </button>
                <button
                  onClick={() => setActiveCatalogTab('school')}
                  className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1 ${
                    activeCatalogTab === 'school' ? 'bg-emerald-600 text-white shadow-xs font-bold' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <GraduationCap className="w-3 h-3" /> School Class 6-12 ({schoolCourses.length})
                </button>
              </div>

              <button
                onClick={() => setShowAddModal(true)}
                type="button"
                className="px-4 py-2 bg-[#0B192C] hover:bg-[#060E18] text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Create New Course
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading course catalogue...</div>
          ) : courses.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">No active courses in catalogue.</div>
          ) : (
            <div className="space-y-8">
              {/* Competitive Exams Section */}
              {(activeCatalogTab === 'all' || activeCatalogTab === 'competitive') && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                    <div className="p-1.5 bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-md">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                      Competitive Entrance Exams ({competitiveCourses.length})
                    </h3>
                  </div>

                  {competitiveCourses.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No competitive exam courses added yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {competitiveCourses.map((course) => (
                        <div
                          key={course._id}
                          className="bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-900/30 rounded-xl p-5 shadow-xs flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex justify-between items-start mb-3">
                              <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold flex items-center gap-1">
                                <Trophy className="w-3 h-3" /> Competitive
                              </span>
                              <span
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                  course.is_active
                                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                                    : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {course.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>

                            <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">{course.name}</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">{course.description}</p>

                            <div className="mb-4 space-y-1">
                              <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Subjects:</span>
                              <div className="flex flex-wrap gap-1.5">
                                {(course.subjects || ['Physics', 'Chemistry', 'Mathematics']).map((subj: string, sIdx: number) => (
                                  <span
                                    key={sIdx}
                                    className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold border border-slate-200/60 dark:border-slate-700"
                                  >
                                    {subj}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="border-t border-slate-200 dark:border-slate-800 pt-3 flex justify-between items-center">
                            <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                              <span>Marking: </span>
                              <strong className="text-slate-900 dark:text-white">
                                +{course.marking_scheme?.marks_per_correct || 4} / -{course.marking_scheme?.penalty_per_incorrect || 1}
                              </strong>
                            </div>

                            <button
                              onClick={() => setDeletingCourse(course)}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors"
                              title="Remove Course"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* School Exams Section */}
              {(activeCatalogTab === 'all' || activeCatalogTab === 'school') && (
                <div className="space-y-4 pt-4">
                  <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                    <div className="p-1.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-md">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                      School Exams (Class 6 to 12) ({schoolCourses.length})
                    </h3>
                  </div>

                  {schoolCourses.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No school exam courses added yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {schoolCourses.map((course) => (
                        <div
                          key={course._id}
                          className="bg-white dark:bg-slate-900 border border-emerald-200/60 dark:border-emerald-900/30 rounded-xl p-5 shadow-xs flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex justify-between items-start mb-3">
                              <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-extrabold flex items-center gap-1">
                                <GraduationCap className="w-3 h-3" /> Class 6-12
                              </span>
                              <span
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                  course.is_active
                                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                                    : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {course.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>

                            <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">{course.name}</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">{course.description}</p>

                            <div className="mb-4 space-y-1">
                              <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Subjects:</span>
                              <div className="flex flex-wrap gap-1.5">
                                {(course.subjects || ['Science', 'Mathematics']).map((subj: string, sIdx: number) => (
                                  <span
                                    key={sIdx}
                                    className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold border border-slate-200/60 dark:border-slate-700"
                                  >
                                    {subj}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="border-t border-slate-200 dark:border-slate-800 pt-3 flex justify-between items-center">
                            <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                              <span>Marking: </span>
                              <strong className="text-slate-900 dark:text-white">
                                +{course.marking_scheme?.marks_per_correct || 1} / -{course.marking_scheme?.penalty_per_incorrect || 0}
                              </strong>
                            </div>

                            <button
                              onClick={() => setDeletingCourse(course)}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors"
                              title="Remove Course"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Add Course Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full shadow-lg my-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Create New Course (FR-33)</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && <div className="mb-3 p-2 bg-rose-50 text-rose-600 text-xs rounded border border-rose-200">{error}</div>}

            <form onSubmit={handleCreateCourse} className="space-y-4 text-xs">
              {/* Category Selector */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Course Category / Exam Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCategory('Competitive Exams');
                      setSubjectsInput('Physics, Chemistry, Mathematics');
                      setMarksPerCorrect(4);
                      setPenaltyPerIncorrect(1);
                    }}
                    className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all ${
                      category === 'Competitive Exams'
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 font-bold'
                        : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <div>
                      <div className="text-xs">Competitive Exams</div>
                      <div className="text-[10px] text-slate-400 font-normal">JEE, NEET, etc.</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCategory('School Exams');
                      setSubjectsInput('Science, Mathematics, Social Studies');
                      setMarksPerCorrect(1);
                      setPenaltyPerIncorrect(0);
                    }}
                    className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all ${
                      category === 'School Exams'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 font-bold'
                        : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4 text-emerald-500" />
                    <div>
                      <div className="text-xs">School Exams</div>
                      <div className="text-[10px] text-slate-400 font-normal">Class 6 to 12</div>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Course Title</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={category === 'Competitive Exams' ? 'e.g. NEET 2027 or JEE MAINS 2027' : 'e.g. Class 10 CBSE Board Exam'}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Course Description</label>
                <textarea
                  required
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed track description..."
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              {/* Subjects Included Input + Presets */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Subjects Included (Comma-separated)</label>
                </div>

                <input
                  type="text"
                  required
                  value={subjectsInput}
                  onChange={(e) => setSubjectsInput(e.target.value)}
                  placeholder="Physics, Chemistry, Biology"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white mb-2"
                />

                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSubjectsInput('Physics, Chemistry, Biology')}
                    className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[10px] font-bold border border-slate-300 dark:border-slate-700"
                  >
                    🧬 NEET Preset
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubjectsInput('Physics, Chemistry, Mathematics')}
                    className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[10px] font-bold border border-slate-300 dark:border-slate-700"
                  >
                    ⚡ JEE Preset
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubjectsInput('Science, Mathematics, Social Studies')}
                    className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[10px] font-bold border border-slate-300 dark:border-slate-700"
                  >
                    🎓 School Class 6-10 Preset
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Marks for Correct</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={marksPerCorrect}
                    onChange={(e) => setMarksPerCorrect(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Negative Penalty</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={penaltyPerIncorrect}
                    onChange={(e) => setPenaltyPerIncorrect(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-brand-800 hover:bg-brand-900 text-white font-bold rounded-lg disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Save & Publish Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove Course Confirmation Modal */}
      {deletingCourse && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 max-w-sm w-full shadow-lg text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1">Remove Course</h3>
            <p className="text-xs text-slate-500 mb-6">
              Are you sure you want to remove <strong className="text-slate-800 dark:text-slate-200">{deletingCourse.name}</strong>? This action cannot be undone.
            </p>

            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeletingCourse(null)}
                className="px-4 py-2 border border-slate-300 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemoveCourse}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm"
              >
                Confirm Removal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
