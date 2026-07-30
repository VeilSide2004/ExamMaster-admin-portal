export const memStore = {
  users: [] as any[],
  courses: [] as any[],
  questions: [] as any[],
  mockTests: [] as any[],
  attempts: [] as any[],
  xpTransactions: [] as any[],
  admins: [] as any[],
  auditLogs: [] as any[],
};

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}
