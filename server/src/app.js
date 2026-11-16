const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/db');
const { hardenedCorsOptions } = require('./middleware/corsConfig');
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const aiRoutes = require('./routes/aiRoutes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// Global Middlewares (Phase 2: Production CORS Hardening - Wildcard '*' deprecated)
app.use(cors(hardenedCorsOptions));
app.options('*', cors(hardenedCorsOptions));
app.use(express.json({ limit: '1mb' }));

// Database Connection Middleware for Serverless / Cloud Execution
app.use(async (req, res, next) => {
  if (req.path === '/api/health') return next();

  try {
    await connectDB();
    next();
  } catch (dbErr) {
    return res.status(503).json({
      success: false,
      code: 'DATABASE_UNAVAILABLE',
      message: 'Database service unavailable. Ensure MongoDB connection is configured.'
    });
  }
});

// Primary API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/ai', aiRoutes); // Phase 2: Dedicated Server-Side AI Microservice Route

// System Health & Telemetry Route
app.get('/api/health', (req, res) => {
  return res.status(200).json({
    status: 'HEALTHY',
    service: 'VitalSync Healthcare API & AI Microservice',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

// Phase 1 Standardized 404 Handler for undefined routes
app.use(notFoundHandler);

// Phase 1 Centralized Standardized Error Handling Middleware
app.use(errorHandler);

module.exports = app;
