const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const Task = require('../src/models/Task');

describe('VitalSync Authentication & Security Suite (Phases 1, 2, 3)', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test_jwt_secret_vital_sync_secure_key_123';
    process.env.JWT_EXPIRES_IN = '1h';
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Task.deleteMany({});
  });

  // ==========================================
  // PHASE 1: Backend Security & Data Modeling (P0)
  // ==========================================
  describe('Phase 1: User Schema & Cryptographic Security (bcryptjs)', () => {
    it('MUST salt and hash the user password string before saving to MongoDB', async () => {
      const rawPassword = 'ClinicalSecurePass!2026';
      const user = new User({
        name: 'Dr. Arjun Roy',
        email: 'arjun.roy@vitalsync.health',
        password: rawPassword,
        role: 'DOCTOR'
      });

      await user.save();

      // Retrieve directly from database including raw stored password hash
      const savedInDb = await User.findById(user._id).select('+password');

      // CRITICAL CHECK: Plaintext password is NEVER saved in MongoDB
      expect(savedInDb.password).not.toBe(rawPassword);

      // CRITICAL CHECK: Valid bcrypt hash structure ($2a$ or $2b$)
      expect(savedInDb.password).toMatch(/^\$2[ab]\$\d{2}\$/);

      // Verify that bcrypt.compare successfully confirms identity
      const isMatch = await bcrypt.compare(rawPassword, savedInDb.password);
      expect(isMatch).toBe(true);

      // Verify model helper comparePassword
      const methodCheck = await savedInDb.comparePassword(rawPassword);
      expect(methodCheck).toBe(true);

      const wrongCheck = await savedInDb.comparePassword('WrongPassword!');
      expect(wrongCheck).toBe(false);
    });

    it('should strip password from JSON output to prevent client leakage', async () => {
      const user = await User.create({
        name: 'Nurse Kavita',
        email: 'kavita@vitalsync.health',
        password: 'Password123!',
        role: 'STAFF'
      });

      const json = user.toJSON();
      expect(json.password).toBeUndefined();
      expect(json.id).toBeDefined();
    });
  });

  // ==========================================
  // PHASE 2: JWT Generation & Endpoint Engineering (P1)
  // ==========================================
  describe('Phase 2: /api/auth/register and /api/auth/login JWT Generation', () => {
    it('POST /api/auth/register should create user and return signed JWT', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Rajesh Patel',
          email: 'rajesh.patel@example.com',
          password: 'Password123!',
          role: 'PATIENT'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('rajesh.patel@example.com');
      expect(res.body.user.role).toBe('PATIENT');

      // Verify JWT payload cryptographically
      const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
      expect(decoded.email).toBe('rajesh.patel@example.com');
      expect(decoded.role).toBe('PATIENT');
    });

    it('POST /api/auth/register should reject duplicate email with 409 Conflict', async () => {
      await User.create({
        name: 'Existing User',
        email: 'duplicate@example.com',
        password: 'Password123!'
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Second User',
          email: 'duplicate@example.com',
          password: 'NewPassword123!'
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/auth/login should authenticate valid user and return JWT', async () => {
      await User.create({
        name: 'Dr. Priya Sharma',
        email: 'dr.priya@vitalsync.health',
        password: 'DoctorSecretPassword123!',
        role: 'DOCTOR'
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'dr.priya@vitalsync.health',
          password: 'DoctorSecretPassword123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.name).toBe('Dr. Priya Sharma');

      const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
      expect(decoded.email).toBe('dr.priya@vitalsync.health');
    });

    it('POST /api/auth/login should reject invalid password with 401 Unauthorized', async () => {
      await User.create({
        name: 'Dr. Priya Sharma',
        email: 'dr.priya@vitalsync.health',
        password: 'DoctorSecretPassword123!'
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'dr.priya@vitalsync.health',
          password: 'IncorrectPassword!'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.token).toBeUndefined();
    });
  });

  // ==========================================
  // PHASE 3: Auth Middleware & Protected Pipelines (P2)
  // ==========================================
  describe('Phase 3: Auth Middleware & Protected Endpoints (/api/tasks)', () => {
    let authToken;
    let userId;

    beforeEach(async () => {
      const user = await User.create({
        name: 'Authenticated Doctor',
        email: 'doctor@vitalsync.health',
        password: 'SecurePassword123!',
        role: 'DOCTOR'
      });
      userId = user._id;
      authToken = jwt.sign(
        { id: user._id, email: user.email, name: user.name, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    });

    it('GET /api/tasks MUST reject request when Authorization header is missing (401)', async () => {
      const res = await request(app).get('/api/tasks');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('TOKEN_MISSING');
    });

    it('GET /api/tasks MUST reject request with invalid or tampered token (401)', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .set('Authorization', 'Bearer invalid.tampered.token');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('TOKEN_INVALID');
    });

    it('GET /api/tasks MUST reject expired JWT with TOKEN_EXPIRED code (401)', async () => {
      const expiredToken = jwt.sign(
        { id: userId, email: 'expired@vitalsync.health' },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' } // Expired 1 second ago
      );

      const res = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('TOKEN_EXPIRED');
    });

    it('POST & GET /api/tasks should succeed with valid Bearer JWT', async () => {
      // 1. Create a task via protected POST
      const postRes = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Review Type 2 Diabetes Lab Work',
          description: 'Check HbA1c panel for Rajesh Patel',
          priority: 'HIGH',
          category: 'CLINICAL',
          patientName: 'Rajesh Patel'
        });

      expect(postRes.status).toBe(201);
      expect(postRes.body.success).toBe(true);
      expect(postRes.body.task.title).toBe('Review Type 2 Diabetes Lab Work');

      // 2. Retrieve tasks via protected GET
      const getRes = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.success).toBe(true);
      expect(getRes.body.tasks.length).toBe(1);
      expect(getRes.body.tasks[0].title).toBe('Review Type 2 Diabetes Lab Work');
    });
  });
});
