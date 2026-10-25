const mongoose = require('mongoose');

let mongoMemoryServer = null;

/**
 * Connect to MongoDB with automatic local / in-memory fallback.
 * Allows zero-config out-of-the-box development and testing.
 */
async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/vitalsync';

  // If already connected, reuse
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // Attempt connection to configured MONGODB_URI
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500 // Fast fail to in-memory if no local daemon
    });
    console.log(`[MongoDB] Connected to external instance: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    console.warn(`[MongoDB] Could not reach "${uri}" (${err.message}).`);
    console.log('[MongoDB] Initializing in-memory MongoDB fallback (mongodb-memory-server)...');

    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongoMemoryServer = await MongoMemoryServer.create();
      const memUri = mongoMemoryServer.getUri();

      const conn = await mongoose.connect(memUri);
      console.log(`[MongoDB] In-memory database active at: ${memUri}`);
      return conn;
    } catch (memErr) {
      console.error('[MongoDB] Failed to initialize in-memory database:', memErr);
      throw memErr;
    }
  }
}

/**
 * Disconnect and cleanup DB connections
 */
async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
    mongoMemoryServer = null;
  }
}

module.exports = { connectDB, disconnectDB };
