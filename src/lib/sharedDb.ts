import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

function getDbPath(): string {
  const p1 = path.join(process.cwd(), '..', 'shared-db.json');
  if (fs.existsSync(p1)) return p1;
  const p2 = path.join(process.cwd(), 'shared-db.json');
  if (fs.existsSync(p2)) return p2;
  return path.join('/tmp', 'shared-db.json');
}

export interface SharedDbData {
  users: any[];
  courses: any[];
  questions: any[];
  mockTests: any[];
  weeklyDpps?: any[];
  attempts: any[];
  xpTransactions: any[];
  admins: any[];
  auditLogs: any[];
}

const initialDb: SharedDbData = {
  users: [],
  courses: [],
  questions: [],
  mockTests: [],
  weeklyDpps: [],
  attempts: [],
  xpTransactions: [],
  admins: [],
  auditLogs: [],
};

export function readSharedDb(): SharedDbData {
  const dbPath = getDbPath();
  try {
    if (!fs.existsSync(dbPath)) {
      writeSharedDb(initialDb);
    }
    const raw = fs.readFileSync(dbPath, 'utf-8');
    const data = JSON.parse(raw);

    // Ensure default admin exists
    if (!data.admins || data.admins.length === 0) {
      const hashedAdminPassword = bcrypt.hashSync('Admin@123456', 10);
      data.admins = [
        {
          _id: 'admin_master_1',
          name: 'Master Controller',
          email: 'admin@exammaster.com',
          password_hash: hashedAdminPassword,
          role: 'Super Admin',
          created_at: new Date().toISOString(),
        },
      ];
      writeSharedDb(data);
    }

    return data;
  } catch (error) {
    console.error('Error reading shared database:', error);
    return initialDb;
  }
}

export function writeSharedDb(data: SharedDbData): void {
  const dbPath = getDbPath();
  try {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing to shared database:', error);
  }
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}
