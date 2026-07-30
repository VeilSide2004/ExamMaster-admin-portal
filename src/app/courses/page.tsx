'use client';

import React, { useEffect, useState } from 'react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { AdminHeader } from '@/components/layout/AdminHeader';
import { BookOpen, Plus, Trash2, AlertTriangle, X, Layers, Tag } from 'lucide-react';

export default function CourseManagementPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const [name, setName] = useState('');
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
        setDescription('');
        setSubjectsInput('Physics, Chemistry, Mathematics');
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

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader title="Course Management" subtitle="Manage course catalogue, subject structures, and marking schemes (FR-33, FR-34, FR-35)" />

        <main className="p-8 space-y-6 flex-1 overflow-y-auto">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Active Course Catalogue</h2>
              <p className="text-xs text-slate-500">Newly added courses automatically populate in student selection and question management.</p>
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full p-8 text-center text-xs text-slate-500">Loading course catalogue...</div>
            ) : courses.length === 0 ? (
              <div className="col-span-full p-8 text-center text-xs text-slate-500">No active courses in catalogue.</div>
            ) : (
              courses.map((course) => (
                <div
                  key={course._id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <span className="p-2.5 bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-300 rounded-lg">
                        <BookOpen className="w-5 h-5" />
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          course.is_active
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {course.is_active ? 'Active & Selectable' : 'Deactivated'}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">{course.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">{course.description}</p>

                    {/* Included Subjects Badges */}
                    <div className="mb-4 space-y-1">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Configured Subjects:</span>
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
                      <span>Marking Scheme: </span>
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
              ))
            )}
          </div>
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
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Course Title</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. NEET 2027 or JEE MAINS 2027"
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
                    className="px-2.5 py-1 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded text-[11px] font-extrabold border border-emerald-200"
                  >
                    🧬 NEET Preset (Physics, Chemistry, Biology)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubjectsInput('Physics, Chemistry, Mathematics')}
                    className="px-2.5 py-1 bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300 rounded text-[11px] font-extrabold border border-blue-200"
                  >
                    ⚡ JEE Preset (Physics, Chemistry, Maths)
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
