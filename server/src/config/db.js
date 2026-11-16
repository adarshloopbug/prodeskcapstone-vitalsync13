const mongoose = require('mongoose');

let mongoMemoryServer = null;

// Global cached connection for hot reloads and serverless function warm starts
let cachedConn = null;
let cachedPromise = null;

async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/vitalsync';

  // If already connected, reuse existing connection
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (cachedConn) {
    return cachedConn;
  }

  if (!cachedPromise) {
    cachedPromise = (async () => {
      // 1. Attempt connection to configured MONGODB_URI (e.g. Atlas in production)
      try {
        const conn = await mongoose.connect(uri, {
          serverSelectionTimeoutMS: 2500 // Fast fail to in-memory if no local daemon reachable
        });
        cachedConn = conn;
        return conn;
      } catch (err) {
        // Fallback to in-memory mongodb for sandbox/test environments
        try {
          const { MongoMemoryServer } = require('mongodb-memory-server');
          const serverOpts = {};

          if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
            serverOpts.binary = { downloadDir: '/tmp/mongodb-binaries' };
            serverOpts.instance = { dbPath: '/tmp/mongo-mem-db' };
          }

          mongoMemoryServer = await MongoMemoryServer.create(serverOpts);
          const memUri = mongoMemoryServer.getUri();

          const conn = await mongoose.connect(memUri);
          cachedConn = conn;
          return conn;
        } catch (memErr) {
          cachedPromise = null;
          throw new Error('Database connection failed. Please provide a valid MONGODB_URI.');
        }
      }
    })();
  }

  return cachedPromise;
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
  cachedConn = null;
  cachedPromise = null;
}

module.exports = { connectDB, disconnectDB };
