'use client';

import React, { useEffect, useState } from 'react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { AdminHeader } from '@/components/layout/AdminHeader';
import { Users, Search, UserPlus, ShieldCheck, Trash2, X, AlertTriangle, Shield, Edit3, BookOpen, Key, CheckSquare, Square } from 'lucide-react';

const ALL_PERMISSIONS = [
  { id: 'manage_questions', label: 'Manage & Add Questions', desc: 'Create, edit, and curate topic question bank' },
  { id: 'manage_courses', label: 'Manage Courses', desc: 'Create and update course subjects and marking schemes' },
  { id: 'manage_mock_tests', label: 'Manage Mock Tests', desc: 'Create and schedule mock tests' },
  { id: 'manage_users', label: 'Manage Users & Admins', desc: 'Onboard students and assign admin roles' },
  { id: 'view_audit_logs', label: 'View Audit Logs', desc: 'Access platform security logs and actions' },
];

export default function UserManagementPage() {
  const [activeTab, setActiveTab] = useState<'students' | 'admins'>('students');

  // Student State
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [studentError, setStudentError] = useState('');

  // Admin State & RBAC
  const [admins, setAdmins] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<any | null>(null);

  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminRole, setAdminRole] = useState('Question Contributor');
  const [adminPermissions, setAdminPermissions] = useState<string[]>(['manage_questions']);
  const [adminAllowedCourses, setAdminAllowedCourses] = useState<string[]>(['all']);
  const [adminError, setAdminError] = useState('');

  const [submitting, setSubmitting] = useState(false);

  // Destructive action modal state
  const [activeActionModal, setActiveActionModal] = useState<{
    entity: any;
    targetType: 'student' | 'admin';
    type: 'suspend' | 'activate' | 'delete';
  } | null>(null);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/users?${params.toString()}`);
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchAdmins = async () => {
    setLoadingAdmins(true);
    try {
      const [adminsRes, coursesRes] = await Promise.all([
        fetch('/api/admins'),
        fetch('/api/courses'),
      ]);
      const adminsData = await adminsRes.json();
      const coursesData = await coursesRes.json();
      setAdmins(adminsData.admins || []);
      setCourses(coursesData.courses || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAdmins(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'students') {
      fetchUsers();
    } else {
      fetchAdmins();
    }
  }, [activeTab, searchQuery, statusFilter]);

  const handleRolePreset = (selectedRole: string) => {
    setAdminRole(selectedRole);
    if (selectedRole === 'Super Admin') {
      setAdminPermissions(['manage_questions', 'manage_courses', 'manage_mock_tests', 'manage_users', 'view_audit_logs']);
      setAdminAllowedCourses(['all']);
    } else if (selectedRole === 'Question Contributor') {
      setAdminPermissions(['manage_questions']);
      if (adminAllowedCourses.length === 0 || adminAllowedCourses.includes('all')) {
        setAdminAllowedCourses(courses.length > 0 ? [courses[0]._id] : ['all']);
      }
    } else if (selectedRole === 'Course Manager') {
      setAdminPermissions(['manage_courses', 'manage_questions']);
      setAdminAllowedCourses(['all']);
    } else if (selectedRole === 'Exam Controller') {
      setAdminPermissions(['manage_mock_tests', 'manage_questions']);
      setAdminAllowedCourses(['all']);
    }
  };

  const togglePermission = (permId: string) => {
    setAdminPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  };

  const toggleCoursePermission = (courseId: string) => {
    if (courseId === 'all') {
      setAdminAllowedCourses(['all']);
      return;
    }

    setAdminAllowedCourses((prev) => {
      const filtered = prev.filter((c) => c !== 'all');
      if (filtered.includes(courseId)) {
        const next = filtered.filter((c) => c !== courseId);
        return next.length === 0 ? ['all'] : next;
      } else {
        return [...filtered, courseId];
      }
    });
  };

  const openCreateAdminModal = () => {
    setEditingAdmin(null);
    setAdminName('');
    setAdminEmail('');
    setAdminPassword('');
    setAdminRole('Question Contributor');
    setAdminPermissions(['manage_questions']);
    setAdminAllowedCourses(courses.length > 0 ? [courses[0]._id] : ['all']);
    setAdminError('');
    setShowAddAdminModal(true);
  };

  const openEditAdminModal = (admin: any) => {
    setEditingAdmin(admin);
    setAdminName(admin.name || '');
    setAdminEmail(admin.email || '');
    setAdminPassword('');
    setAdminRole(admin.role || 'Question Contributor');
    setAdminPermissions(admin.permissions || (admin.role === 'Super Admin' ? ['manage_questions', 'manage_courses', 'manage_mock_tests', 'manage_users', 'view_audit_logs'] : ['manage_questions']));
    setAdminAllowedCourses(admin.allowed_courses || ['all']);
    setAdminError('');
    setShowAddAdminModal(true);
  };

  const handleManualOnboardStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: studentName, email: studentEmail, password: studentPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStudentError(data.error || 'Failed to onboard student');
      } else {
        setShowAddStudentModal(false);
        setStudentName('');
        setStudentEmail('');
        setStudentPassword('');
        fetchUsers();
      }
    } catch (err: any) {
      setStudentError('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    setSubmitting(true);

    try {
      const isEdit = !!editingAdmin;
      const url = isEdit ? `/api/admins/${editingAdmin._id}` : '/api/admins';
      const method = isEdit ? 'PUT' : 'POST';

      const payload: any = {
        name: adminName,
        email: adminEmail,
        role: adminRole,
        permissions: adminPermissions,
        allowed_courses: adminAllowedCourses,
      };

      if (!isEdit || adminPassword) {
        payload.password = adminPassword;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setAdminError(data.error || 'Failed to save administrative account');
      } else {
        setShowAddAdminModal(false);
        fetchAdmins();
      }
    } catch (err: any) {
      setAdminError('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const executeConfirmedAction = async () => {
    if (!activeActionModal) return;
    const { entity, targetType, type } = activeActionModal;

    try {
      if (targetType === 'admin') {
        await fetch(`/api/admins/${entity._id}`, { method: 'DELETE' });
        setActiveActionModal(null);
        fetchAdmins();
      } else {
        if (type === 'delete') {
          await fetch(`/api/users/${entity._id}`, { method: 'DELETE' });
        } else {
          await fetch(`/api/users/${entity._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: type }),
          });
        }
        setActiveActionModal(null);
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader title="User & Admin Management" subtitle="Manage student accounts and assign platform administrative credentials (FR-36, FR-37)" />

        <main className="p-4 sm:p-6 lg:p-8 space-y-6 flex-1 overflow-y-auto">
          {/* Category Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('students')}
              className={`pb-3 px-5 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'students'
                  ? 'border-brand-800 text-brand-800 dark:border-brand-500 dark:text-brand-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-4 h-4" /> Student Accounts
            </button>
            <button
              onClick={() => setActiveTab('admins')}
              className={`pb-3 px-5 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'admins'
                  ? 'border-brand-800 text-brand-800 dark:border-brand-500 dark:text-brand-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4" /> Administrative Personnel
            </button>
          </div>

          {/* STUDENTS TAB CONTENT */}
          {activeTab === 'students' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-72">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search by student name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full text-xs pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="text-xs p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>

                <button
                  onClick={() => setShowAddStudentModal(true)}
                  type="button"
                  className="px-4 py-2 bg-[#0B192C] hover:bg-[#060E18] text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-colors shrink-0 shadow-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  Onboard New Student
                </button>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs">
                {loadingUsers ? (
                  <div className="p-8 text-center text-xs text-slate-500">Loading student accounts...</div>
                ) : users.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">No student accounts found.</div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-4">Student</th>
                        <th className="p-4">Locked Course</th>
                        <th className="p-4">XP Total</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {users.map((u) => (
                        <tr key={u._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-4 font-semibold text-slate-900 dark:text-white">
                            <div>{u.name}</div>
                            <div className="text-[11px] font-normal text-slate-500">{u.email}</div>
                          </td>
                          <td className="p-4 font-medium text-slate-700 dark:text-slate-300">
                            {u.locked_course_id?.name || (
                              <span className="text-amber-600 dark:text-amber-400 italic">Pending Selection</span>
                            )}
                          </td>
                          <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400">
                            {(u.xp_total || 0).toLocaleString()} XP
                          </td>
                          <td className="p-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                u.status === 'Active'
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                              }`}
                            >
                              {u.status}
                            </span>
                          </td>
                          <td className="p-4 text-right space-x-2">
                            {u.status === 'Active' ? (
                              <button
                                onClick={() => setActiveActionModal({ entity: u, targetType: 'student', type: 'suspend' })}
                                className="px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 rounded"
                              >
                                Suspend
                              </button>
                            ) : (
                              <button
                                onClick={() => setActiveActionModal({ entity: u, targetType: 'student', type: 'activate' })}
                                className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 rounded"
                              >
                                Reinstate
                              </button>
                            )}
                            <button
                              onClick={() => setActiveActionModal({ entity: u, targetType: 'student', type: 'delete' })}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                              title="Delete Student Account"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ADMINS TAB CONTENT */}
          {activeTab === 'admins' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Administrative Credentials & Roles</h3>
                  <p className="text-xs text-slate-500">Configure role-based access control (RBAC), specific action permissions, and assigned courses.</p>
                </div>
                <button
                  onClick={openCreateAdminModal}
                  type="button"
                  className="px-4 py-2 bg-[#0B192C] hover:bg-[#060E18] text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                >
                  <Shield className="w-4 h-4" />
                  Assign New Admin
                </button>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs">
                {loadingAdmins ? (
                  <div className="p-8 text-center text-xs text-slate-500">Loading admin credentials...</div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-4">Admin Personnel</th>
                        <th className="p-4">Assigned Role</th>
                        <th className="p-4">Assigned Course Scope</th>
                        <th className="p-4">Action Permissions</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {admins.map((a) => {
                        const isSuper = a.role === 'Super Admin' || (a.permissions && a.permissions.includes('all'));
                        const allowedCourseNames = (a.allowed_courses || []).includes('all')
                          ? 'All Courses (Unrestricted)'
                          : (a.allowed_courses || [])
                              .map((cid: string) => courses.find((c) => c._id === cid)?.name || cid)
                              .join(', ');

                        return (
                          <tr key={a._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="p-4 font-semibold text-slate-900 dark:text-white">
                              <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4 text-brand-700 dark:text-brand-400 shrink-0" />
                                <div>
                                  <div>{a.name}</div>
                                  <div className="text-[11px] font-mono font-normal text-slate-500">{a.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                                isSuper
                                  ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800'
                                  : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
                              }`}>
                                {a.role || 'Super Admin'}
                              </span>
                            </td>
                            <td className="p-4 max-w-xs">
                              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                                <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate" title={allowedCourseNames}>
                                  {allowedCourseNames || 'No Courses Assigned'}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-wrap gap-1">
                                {isSuper ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                    Full Platform Access
                                  </span>
                                ) : (a.permissions || []).length === 0 ? (
                                  <span className="text-[11px] text-slate-400 italic">No explicit actions</span>
                                ) : (
                                  (a.permissions || []).map((perm: string) => (
                                    <span key={perm} className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                      {ALL_PERMISSIONS.find((p) => p.id === perm)?.label || perm}
                                    </span>
                                  ))
                                )}
                              </div>
                            </td>
                            <td className="p-4 text-right">
                              {a._id === 'admin_master_1' || a.email === 'admin' ? (
                                <span className="text-[11px] font-bold text-slate-400 italic">Primary Admin</span>
                              ) : (
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => openEditAdminModal(a)}
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-md flex items-center gap-1 transition-colors"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" /> Edit Access
                                  </button>
                                  <button
                                    onClick={() => setActiveActionModal({ entity: a, targetType: 'admin', type: 'delete' })}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                    title="Remove Admin Account"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Onboard Student Modal */}
      {showAddStudentModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 max-w-md w-full shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Onboard New Student</h3>
              <button onClick={() => setShowAddStudentModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {studentError && <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-lg">{studentError}</div>}

            <form onSubmit={handleManualOnboardStudent} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Student Email Address</label>
                <input
                  type="email"
                  required
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  placeholder="student@example.com"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Initial Password</label>
                <input
                  type="password"
                  required
                  value={studentPassword}
                  onChange={(e) => setStudentPassword(e.target.value)}
                  placeholder="Password123"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-brand-800 hover:bg-brand-900 text-white font-bold rounded-lg disabled:opacity-50"
                >
                  {submitting ? 'Onboarding...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign / Edit Admin Modal */}
      {showAddAdminModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 max-w-lg w-full shadow-lg my-8">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-brand-800 dark:text-brand-400" />
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {editingAdmin ? 'Edit Admin Role & Permissions' : 'Assign New Admin Personnel'}
                </h3>
              </div>
              <button onClick={() => setShowAddAdminModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {adminError && <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-lg">{adminError}</div>}

            <form onSubmit={handleSaveAdmin} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Username / Email</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingAdmin}
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="sarah@exammaster.com"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Password {editingAdmin && <span className="font-normal text-slate-400">(Leave blank to keep unchanged)</span>}
                </label>
                <input
                  type="password"
                  required={!editingAdmin}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Assigned Administrative Role Preset</label>
                <select
                  value={adminRole}
                  onChange={(e) => handleRolePreset(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                >
                  <option value="Question Contributor">Question Contributor (Question Bank for Specific Courses)</option>
                  <option value="Super Admin">Super Admin (Full Unrestricted Platform Control)</option>
                  <option value="Course Manager">Course Manager (Curriculum & Questions)</option>
                  <option value="Exam Controller">Exam Controller (Mock Tests & Scoring)</option>
                  <option value="Custom">Custom Role (Manual Permission & Scope Configuration)</option>
                </select>
              </div>

              {/* Course Assignment Scope */}
              {adminRole !== 'Super Admin' && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-brand-700 dark:text-brand-400" />
                      Assigned Course Responsibilities
                    </label>
                    <span className="text-[11px] text-slate-500">Restricts question bank & test edits</span>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700/50">
                      <input
                        type="checkbox"
                        checked={adminAllowedCourses.includes('all')}
                        onChange={() => toggleCoursePermission('all')}
                        className="rounded border-slate-300 text-brand-800 focus:ring-brand-500"
                      />
                      <span className="font-semibold text-slate-900 dark:text-white">All Courses (Unrestricted Scope)</span>
                    </label>

                    {!adminAllowedCourses.includes('all') && (
                      <div className="pl-6 space-y-1">
                        {courses.length === 0 ? (
                          <div className="text-slate-400 italic">No courses found in database</div>
                        ) : (
                          courses.map((c) => (
                            <label key={c._id} className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700/50">
                              <input
                                type="checkbox"
                                checked={adminAllowedCourses.includes(c._id)}
                                onChange={() => toggleCoursePermission(c._id)}
                                className="rounded border-slate-300 text-brand-800 focus:ring-brand-500"
                              />
                              <span className="text-slate-800 dark:text-slate-200 font-medium">{c.name}</span>
                              <span className="text-[10px] text-slate-400">({c.description?.slice(0, 40)}...)</span>
                            </label>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Permissions */}
              {adminRole !== 'Super Admin' && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg space-y-2">
                  <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-brand-700 dark:text-brand-400" />
                    Specific Action Permissions
                  </label>

                  <div className="grid grid-cols-1 gap-2 pt-1">
                    {ALL_PERMISSIONS.map((perm) => {
                      const isChecked = adminPermissions.includes(perm.id);
                      return (
                        <label key={perm.id} className="flex items-start gap-2.5 cursor-pointer p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => togglePermission(perm.id)}
                            className="mt-0.5 rounded border-slate-300 text-brand-800 focus:ring-brand-500"
                          />
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">{perm.label}</div>
                            <div className="text-[10px] text-slate-500">{perm.desc}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddAdminModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 dark:text-slate-300 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#0B192C] hover:bg-[#060E18] text-white font-bold rounded-lg disabled:opacity-50"
                >
                  {submitting ? 'Saving Account...' : editingAdmin ? 'Update Access & Permissions' : 'Assign Admin Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Action Modal */}
      {activeActionModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 max-w-sm w-full shadow-lg text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1 capitalize">
              {activeActionModal.targetType === 'admin' ? 'Remove Admin Account' : `${activeActionModal.type} Account`}
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Target: <strong className="text-slate-800 dark:text-slate-200">{activeActionModal.entity.name}</strong> ({activeActionModal.entity.email})
            </p>

            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setActiveActionModal(null)}
                className="px-4 py-2 border border-slate-300 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeConfirmedAction}
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
