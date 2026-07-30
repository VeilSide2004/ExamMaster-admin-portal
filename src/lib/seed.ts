import { dbConnect } from './db';
import { readSharedDb, writeSharedDb } from './sharedDb';
import bcrypt from 'bcryptjs';

export async function seedDatabase() {
  const { isMemoryMode } = await dbConnect();

  if (isMemoryMode) {
    const db = readSharedDb();
    if (!db.admins || db.admins.length === 0) {
      const hashedAdminPassword = await bcrypt.hash('Admin@123456', 10);
      db.admins.push({
        _id: 'admin_master_1',
        name: 'Master Controller',
        email: 'admin@exammaster.com',
        password_hash: hashedAdminPassword,
        role: 'Super Admin',
        created_at: new Date().toISOString(),
      });
      writeSharedDb(db);
    }
  }
}
