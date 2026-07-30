'use client';

import React, { useEffect, useState } from 'react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { AdminHeader } from '@/components/layout/AdminHeader';
import { ClipboardList, Shield } from 'lucide-react';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/audit-logs')
      .then((res) => res.json())
      .then((data) => setLogs(data.logs || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader title="Audit Trail & System Logs" subtitle="Immutable administrative action logs (FR-40)" />

        <main className="p-8 space-y-6 flex-1 overflow-y-auto">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Admin Activity Records</h2>
              <p className="text-xs text-slate-500">Every add, edit, suspend, and delete operation is permanently logged for accountability.</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading audit log entries...</div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">No audit logs recorded yet.</div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-4">Timestamp</th>
                    <th className="p-4">Admin</th>
                    <th className="p-4">Action Type</th>
                    <th className="p-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                  {logs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-4 text-[11px] text-slate-500 font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="p-4 font-bold text-slate-900 dark:text-white">{log.admin_name || 'System Admin'}</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                          {log.action_type}
                        </span>
                      </td>
                      <td className="p-4 text-xs font-medium text-slate-700 dark:text-slate-300">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
