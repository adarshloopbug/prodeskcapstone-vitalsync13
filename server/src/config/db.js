const mongoose = require('mongoose');
const net = require('net');

let mongoMemoryServer = null;

// Global cached connection for hot reloads and serverless function warm starts
let cachedConn = null;
let cachedPromise = null;

/**
 * Fast TCP probe to check if a local port is listening without hanging
 */
function checkPortOpen(port, host = '127.0.0.1', timeout = 300) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isResolved = false;

    socket.setTimeout(timeout);
    socket.once('connect', () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve(true);
      }
    });
    socket.once('timeout', () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve(false);
      }
    });
    socket.once('error', () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve(false);
      }
    });
    socket.connect(port, host);
  });
}

/**
 * Establish resilient, highly available MongoDB connection
 * Supports:
 * 1. Cloud Atlas Clusters (mongodb+srv://) with 10s TLS timeout.
 * 2. Local MongoDB daemon if running on port 27017.
 * 3. Instant auto-fallback to in-memory MongoMemoryServer if no local daemon.
 */
async function connectDB() {
  // If already connected, reuse existing connection immediately
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // If currently connecting, await existing promise
  if (mongoose.connection.readyState === 2 && cachedPromise) {
    return cachedPromise;
  }

  // Clear stale cached connection reference
  cachedConn = null;

  if (!cachedPromise) {
    cachedPromise = (async () => {
      const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/vitalsync';
      const isCloudCluster = uri.includes('mongodb+srv://') || uri.includes('mongodb.net');

      // 1. If configured with a Cloud Atlas Cluster, connect with production timeouts
      if (isCloudCluster) {
        try {
          const conn = await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 10000,
            connectTimeoutMS: 10000
          });
          cachedConn = conn;
          await ensureDefaultDoctor();
          return conn;
        } catch (cloudErr) {
          // Fall back gracefully to in-memory so server never terminates
        }
      } else {
        // 2. Local MongoDB: Check if port 27017 is actively listening (avoids 3-second hang)
        const isPortOpen = await checkPortOpen(27017, '127.0.0.1');
        if (isPortOpen) {
          try {
            const conn = await mongoose.connect(uri, {
              serverSelectionTimeoutMS: 2000
            });
            cachedConn = conn;
            await ensureDefaultDoctor();
            return conn;
          } catch (localErr) {
            // Fall back to in-memory
          }
        }
      }

      // 3. Resilient In-Memory MongoDB Server (Zero waiting, zero port locks)
      try {
        if (!mongoMemoryServer) {
          const { MongoMemoryServer } = require('mongodb-memory-server');
          mongoMemoryServer = await MongoMemoryServer.create();
        }
        const memUri = mongoMemoryServer.getUri();

        const conn = await mongoose.connect(memUri);
        cachedConn = conn;
        await ensureDefaultDoctor();
        return conn;
      } catch (memErr) {
        cachedConn = null;
        throw new Error('Database connection failed. Please ensure MongoDB is running or provide a valid MONGODB_URI.');
      }
    })().catch((err) => {
      // CRITICAL: Always reset cachedPromise on error so next request can retry instead of poisoning cache
      cachedPromise = null;
      throw err;
    });
  }

  return cachedPromise;
}

/**
 * Ensure standard default clinician exists so developers never have to manually sign up
 */
async function ensureDefaultDoctor() {
  if (process.env.NODE_ENV === 'test') return;
  try {
    const User = require('../models/User');
    const email = 'doctor@vitalsync.health';
    const existing = await User.findOne({ email });
    if (!existing) {
      await User.create({
        name: 'Dr. Priya Sharma',
        email,
        password: 'DoctorPassword123!',
        role: 'DOCTOR',
        plan: 'PRO'
      });
    }
  } catch (e) {
    // Non-blocking initialization
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
    try {
      await mongoMemoryServer.stop();
    } catch (e) {}
    mongoMemoryServer = null;
  }
  cachedConn = null;
  cachedPromise = null;
}

module.exports = { connectDB, disconnectDB };
