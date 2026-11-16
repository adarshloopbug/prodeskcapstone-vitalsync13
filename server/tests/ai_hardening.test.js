const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const Task = require('../src/models/Task');
const { strictAiLimiter, strictLoginLimiter } = require('../src/middleware/rateLimiter');

describe('Track B Verification Suite: AI Endpoint Architecture & Backend Hardening', () => {
  let user;
  let token;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test_secret_for_ai_hardening_key_999';
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Task.deleteMany({});

    user = await User.create({
      name: 'Dr. Sarah Connor',
      email: 'dr.sarah@vitalsync.health',
      password: 'StrongPassword123!',
      role: 'DOCTOR'
    });

    token = jwt.sign(
      { id: user._id.toString(), email: user.email, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  // ============================================================
  // PHASE 1: ERROR HANDLING & PAYLOAD VALIDATION (P0)
  // ============================================================
  describe('Phase 1: Standardized Error Handling & Zod Payload Validation (P0)', () => {
    it('Undefined route returns standardized 404 JSON response', async () => {
      const res = await request(app).get('/api/undefined-endpoint-for-testing');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('NOT_FOUND');
      expect(res.body.message).toMatch(/Resource not found/i);
    });

    it('Zod rejects registration with invalid email format (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Invalid User',
          email: 'not-a-valid-email',
          password: 'Password123!'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.errors).toBeDefined();
      expect(res.body.message).toMatch(/valid email/i);
    });

    it('Zod rejects registration with short password under 8 chars (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Valid Name',
          email: 'user@example.com',
          password: '123'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.message).toMatch(/at least 8 characters/i);
    });

    it('Zod rejects task creation with empty title (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: '',
          category: 'CLINICAL'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.message).toMatch(/cannot be empty/i);
    });

    it('Zod rejects task creation with invalid priority enum (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Valid Task Title',
          priority: 'SUPER_URGENT_INVALID'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('Valid task creation passes Zod validation and persists to MongoDB (201 Created)', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Review 12-lead ECG telemetry',
          description: 'Assess QTc interval',
          priority: 'HIGH',
          category: 'CLINICAL',
          patientName: 'Jane Doe'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.task.title).toBe('Review 12-lead ECG telemetry');
      expect(res.body.task.authorId.toString()).toBe(user._id.toString());
    });
  });

  // ============================================================
  // PHASE 2: THE SERVER-SIDE AI MICROSERVICE (P1)
  // ============================================================
  describe('Phase 2: Server-Side AI Microservice Architecture (P1)', () => {
    it('GET /api/ai/status: Exposes AI microservice operational telemetry', async () => {
      const res = await request(app).get('/api/ai/status');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('OPERATIONAL');
      expect(res.body.supportedCategories).toContain('DIAGNOSIS');
    });

    it('POST /api/ai/suggest: Rejects unauthenticated requests with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/ai/suggest')
        .send({ prompt: 'Patient presents with acute chest pain and diaphoresis' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/ai/suggest: Zod rejects short prompts under 3 characters with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/ai/suggest')
        .set('Authorization', `Bearer ${token}`)
        .send({ prompt: 'ok' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('POST /api/ai/suggest: Securely executes server-side LLM microservice and returns sanitized response', async () => {
      const res = await request(app)
        .post('/api/ai/suggest')
        .set('Authorization', `Bearer ${token}`)
        .send({
          prompt: 'Evaluate cardiac telemetry for 62yo male with suspected myocardial ischemia',
          context: 'History of hypertension and dyslipidemia',
          category: 'DIAGNOSIS'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.suggestion).toBeDefined();
      expect(res.body.data.recommendations.length).toBeGreaterThan(0);
      expect(res.body.data.disclaimer).toMatch(/clinical/i);
    });
  });

  // ============================================================
  // PHASE 3: SECURITY, THROTTLING & PRODUCTION SANITIZATION (P2)
  // ============================================================
  describe('Phase 3: Security, Throttling & Codebase Sanitization (P2)', () => {
    it('Rate limiting: Enforces 429 Too Many Requests when threshold exceeded', async () => {
      // Test strict rate limiter middleware directly
      const express = require('express');
      const testApp = express();
      testApp.use(express.json());
      testApp.post('/test-throttle', strictAiLimiter, (req, res) => res.json({ ok: true }));

      // Request 1: OK
      const res1 = await request(testApp).post('/test-throttle');
      expect(res1.status).toBe(200);

      // Request 2: OK
      const res2 = await request(testApp).post('/test-throttle');
      expect(res2.status).toBe(200);

      // Request 3: Exceeds threshold -> 429
      const res3 = await request(testApp).post('/test-throttle');
      expect(res3.status).toBe(429);
      expect(res3.body.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(res3.body.message).toMatch(/limit exceeded/i);
    });

    it('Production Sanitization: Zero console.log statements exist in server/src backend code', () => {
      const srcDir = path.join(__dirname, '../src');

      function scanFiles(dir) {
        let results = [];
        const list = fs.readdirSync(dir);
        list.forEach(file => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          if (stat && stat.isDirectory()) {
            results = results.concat(scanFiles(filePath));
          } else if (file.endsWith('.js')) {
            results.push(filePath);
          }
        });
        return results;
      }

      const files = scanFiles(srcDir);
      const violations = [];

      files.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        // Match active console.log statements
        const regex = /console\.log\s*\(/g;
        if (regex.test(content)) {
          violations.push(path.relative(srcDir, file));
        }
      });

      expect(violations).toEqual([]);
    });
  });
});
