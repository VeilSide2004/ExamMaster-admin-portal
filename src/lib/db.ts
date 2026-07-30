import mongoose from 'mongoose';

mongoose.set('bufferCommands', false);

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null, isMemoryMode: false };
}

export async function dbConnect() {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return { isMemoryMode: false, conn: cached.conn };
  }

  if (cached.isMemoryMode) {
    return { isMemoryMode: true, conn: null };
  }

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/exammaster';

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(uri, {
        serverSelectionTimeoutMS: 3000,
        socketTimeoutMS: 45000,
      })
      .then((conn) => {
        console.log('[DB] Connected successfully to MongoDB Atlas');
        cached.isMemoryMode = false;
        return conn;
      })
      .catch((err) => {
        console.warn('[DB] MongoDB Atlas connection pending/unavailable. Falling back to resilient JSON database store.');
        cached.isMemoryMode = true;
        cached.promise = null;
        return null;
      });
  }

  try {
    cached.conn = await cached.promise;
    if (!cached.conn) {
      cached.isMemoryMode = true;
    }
  } catch (e) {
    cached.isMemoryMode = true;
    cached.promise = null;
  }

  return { isMemoryMode: cached.isMemoryMode, conn: cached.conn };
}
