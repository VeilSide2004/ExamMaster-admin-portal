import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const DB_PATH = path.join(process.cwd(), '..', 'shared-db.json');

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
  try {
    if (!fs.existsSync(DB_PATH)) {
      writeSharedDb(initialDb);
    }
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
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
          permissions: ['all'],
          allowed_courses: ['all'],
          created_at: new Date().toISOString(),
        },
      ];
      writeSharedDb(data);
    } else {
      // Backfill missing fields for existing admins
      let updated = false;
      data.admins.forEach((a: any) => {
        if (!a.permissions) {
          a.permissions = a.role === 'Super Admin' ? ['all'] : ['manage_questions'];
          updated = true;
        }
        if (!a.allowed_courses) {
          a.allowed_courses = ['all'];
          updated = true;
        }
      });
      if (updated) {
        writeSharedDb(data);
      }
    }

    return data;
  } catch (error) {
    console.error('Error reading shared database:', error);
    return initialDb;
  }
}

export function writeSharedDb(data: SharedDbData): void {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing to shared database:', error);
  }
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}
