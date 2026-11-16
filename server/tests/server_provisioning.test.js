const request = require('supertest');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const Task = require('../src/models/Task');
const { getAllowedOrigins, isLocalhostOrigin } = require('../src/middleware/corsConfig');

describe('TRACK B: Server Provisioning & Secure MERN Integration Test Suite', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'production';
    process.env.FRONTEND_URL = 'https://vitalsync-frontend.onrender.com,https://vitalsync.vercel.app';
    delete process.env.ALLOW_LOCAL_DEV;
    await connectDB();
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Task.deleteMany({});
    await disconnectDB();
  });

  /* ==========================================================================
     Phase 1: Backend Provisioning (P0)
     ========================================================================== */
  describe('Phase 1: Backend Provisioning & Boot Script (P0)', () => {
    test('1.1. package.json contains valid "start": "node server.js" boot script', () => {
      const pkgPath = path.join(__dirname, '../package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

      expect(pkg.scripts).toBeDefined();
      expect(pkg.scripts.start).toBe('node server.js');
    });

    test('1.2. server.js exists in server directory and exports the Express application', () => {
      const serverEntryPath = path.join(__dirname, '../server.js');
      expect(fs.existsSync(serverEntryPath)).toBe(true);

      const serverModule = require('../server');
      expect(serverModule).toBeDefined();
      expect(typeof serverModule.bootstrap).toBe('function');
    });

    test('1.3. Cloud deployment configuration files exist (render.yaml, Procfile, railway.json)', () => {
      const renderPath = path.join(__dirname, '../../render.yaml');
      const procfilePath = path.join(__dirname, '../Procfile');
      const railwayPath = path.join(__dirname, '../railway.json');

      expect(fs.existsSync(renderPath)).toBe(true);
      expect(fs.existsSync(procfilePath)).toBe(true);
      expect(fs.existsSync(railwayPath)).toBe(true);
    });
  });

  /* ==========================================================================
     Phase 2: Production Security & Network Configuration (P1)
     ========================================================================== */
  describe('Phase 2: CORS Hardening & MongoDB Bridging (P1)', () => {
    test('2.1. Deprecate wildcard access: Origin helper identifies configured live frontend URLs', () => {
      const allowed = getAllowedOrigins();
      expect(allowed).toContain('https://vitalsync-frontend.onrender.com');
      expect(allowed).toContain('https://vitalsync.vercel.app');
      expect(allowed).not.toContain('*');
    });

    test('2.2. Explicitly reject requests originating from localhost (403 Forbidden)', async () => {
      expect(isLocalhostOrigin('http://localhost:3000')).toBe(true);
      expect(isLocalhostOrigin('http://127.0.0.1:5173')).toBe(true);

      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:3000');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('CORS_FORBIDDEN');
    });

    test('2.3. Strictly accept requests originating from live Frontend URL', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'https://vitalsync-frontend.onrender.com');

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('https://vitalsync-frontend.onrender.com');
      expect(res.body.status).toBe('HEALTHY');
    });

    test('2.4. Cloud Database connection is active and connected to MongoDB cluster', () => {
      expect(mongoose.connection.readyState).toBe(1); // 1 = connected
    });
  });

  /* ==========================================================================
     Phase 3: The Live Integration (P2)
     ========================================================================== */
  describe('Phase 3: Live End-to-End MERN Integration (P2)', () => {
    let authToken = '';
    let registeredUserId = '';

    const testUser = {
      name: 'Dr. Evelyn Reed',
      email: `evelyn.reed.${Date.now()}@vitalsync.cloud`,
      password: 'SecureMernPassword2026!',
      role: 'DOCTOR'
    };

    test('3.1. E2E Dispatch: Register user and verify persistence in MongoDB', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Origin', 'https://vitalsync-frontend.onrender.com')
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();

      authToken = res.body.token;
      registeredUserId = res.body.user.id || res.body.user._id;

      // Direct MongoDB cluster verification
      const dbUser = await User.findById(registeredUserId);
      expect(dbUser).not.toBeNull();
      expect(dbUser.email).toBe(testUser.email.toLowerCase());
      expect(dbUser.name).toBe(testUser.name);
    });

    test('3.2. E2E Dispatch: Authenticate and retrieve verified claims', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .set('Origin', 'https://vitalsync-frontend.onrender.com')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      authToken = res.body.token;
    });

    test('3.3. E2E Dispatch: Create clinical task payload and verify MongoDB persistence', async () => {
      const taskPayload = {
        title: 'Post-Op Telemetry Monitoring Protocol',
        category: 'CLINICAL',
        priority: 'HIGH',
        patientName: 'Patient #408',
        description: 'Initiate continuous 12-lead telemetry following coronary intervention.'
      };

      const res = await request(app)
        .post('/api/tasks')
        .set('Origin', 'https://vitalsync-frontend.onrender.com')
        .set('Authorization', `Bearer ${authToken}`)
        .send(taskPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.task.title).toBe(taskPayload.title);

      const taskId = res.body.task.id || res.body.task._id;

      // Direct MongoDB cluster verification
      const dbTask = await Task.findById(taskId);
      expect(dbTask).not.toBeNull();
      expect(dbTask.title).toBe(taskPayload.title);
      expect(dbTask.authorId.toString()).toBe(registeredUserId.toString());
    });

    test('3.4. E2E Dispatch: Execute server-side AI decision support via live pipeline', async () => {
      const res = await request(app)
        .post('/api/ai/suggest')
        .set('Origin', 'https://vitalsync-frontend.onrender.com')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          prompt: 'Assess telemetry for 62yo patient with ST elevation on V2-V4',
          category: 'DIAGNOSIS'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.suggestion).toBeDefined();
      expect(Array.isArray(res.body.data.recommendations)).toBe(true);
    });

    test('3.5. E2E Query: Retrieve persisted patient tasks across cloud bridge', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .set('Origin', 'https://vitalsync-frontend.onrender.com')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.tasks)).toBe(true);
      expect(res.body.tasks.length).toBeGreaterThanOrEqual(1);
    });
  });
});
