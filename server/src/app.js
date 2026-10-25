const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/db');
const User = require('./models/User');
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');

const app = express();

// Global Middlewares
app.use(cors({
  origin: '*', // Allow React client in dev and production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Resilient DB Connection & Initial Seeding Middleware for Serverless Execution
let isSeeded = false;
app.use(async (req, res, next) => {
  // Allow health check without blocking
  if (req.path === '/api/health') return next();

  try {
    await connectDB();

    // Auto-seed demo accounts on first connect if not running in test mode
    if (process.env.NODE_ENV !== 'test' && !isSeeded) {
      const userCount = await User.countDocuments();
      if (userCount === 0) {
        console.log('[Serverless] Seeding initial demonstration clinical accounts...');
        await User.create([
          {
            name: 'Rajesh Patel',
            email: 'rajesh.patel@example.com',
            password: 'Password123!',
            role: 'PATIENT'
          },
          {
            name: 'Dr. Priya Sharma',
            email: 'dr.priya.sharma@vitalsync.health',
            password: 'Password123!',
            role: 'DOCTOR'
          },
          {
            name: 'Ananya Sen (RN)',
            email: 'ananya.sen@vitalsync.health',
            password: 'Password123!',
            role: 'STAFF'
          },
          {
            name: 'Victoria Sterling',
            email: 'admin@vitalsync.health',
            password: 'Password123!',
            role: 'ADMIN'
          }
        ]);
        console.log('[Serverless] Initial clinical accounts seeded.');
      }
      isSeeded = true;
    }

    next();
  } catch (dbErr) {
    console.error('[DB Middleware Error]:', dbErr.message);
    return res.status(503).json({
      success: false,
      message: 'Database service unavailable. Ensure MONGODB_URI environment variable is configured.'
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

// System Health & Information Route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'HEALTHY',
    service: 'VitalSync Healthcare API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// 404 Handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err);
  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error occurred.'
  });
});

module.exports = app;
