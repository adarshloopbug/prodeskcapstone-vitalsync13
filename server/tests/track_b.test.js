const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const Task = require('../src/models/Task');

describe('Track B Verification Suite: CRUD, Data Ownership & Monetization Pipeline', () => {
  let userA, userB;
  let tokenA, tokenB;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test_secret_for_track_b_verification_key_123';
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Task.deleteMany({});

    // Create User A (Dr. Sharma)
    userA = await User.create({
      name: 'Dr. Priya Sharma',
      email: 'dr.priya@vitalsync.health',
      password: 'Password123!',
      role: 'DOCTOR'
    });

    // Create User B (Rajesh Patel)
    userB = await User.create({
      name: 'Rajesh Patel',
      email: 'rajesh@example.com',
      password: 'Password123!',
      role: 'PATIENT'
    });

    tokenA = jwt.sign(
      { id: userA._id.toString(), email: userA.email, name: userA.name, role: userA.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    tokenB = jwt.sign(
      { id: userB._id.toString(), email: userB.email, name: userB.name, role: userB.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  // ============================================================
  // PHASE 1: REST API CRUD & CRITICAL DATA OWNERSHIP VALIDATION
  // ============================================================
  describe('Phase 1: Secure Backend CRUD & Ownership Validation (P0)', () => {
    it('POST /api/tasks: User A creates a task and authorId is persisted', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'Prescribe Metformin 500mg',
          description: 'Follow-up on HbA1c results',
          priority: 'HIGH',
          category: 'PRESCRIPTION',
          patientName: 'Rajesh Patel'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.task.title).toBe('Prescribe Metformin 500mg');
      expect(res.body.task.authorId.toString()).toBe(userA._id.toString());
    });

    it('GET /api/tasks/:id: User A can read their own task', async () => {
      const task = await Task.create({
        title: 'Perform Cardiac Auscultation',
        authorId: userA._id,
        userId: userA._id
      });

      const res = await request(app)
        .get(`/api/tasks/${task._id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.task.title).toBe('Perform Cardiac Auscultation');
    });

    it('GET /api/tasks/:id: User B CANNOT read User A task -> MUST return 403 Forbidden', async () => {
      const task = await Task.create({
        title: 'Confidential Doctor Consultation Notes',
        authorId: userA._id,
        userId: userA._id
      });

      // User B attempts to access User A's task
      const res = await request(app)
        .get(`/api/tasks/${task._id}`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Forbidden/i);
    });

    it('PUT /api/tasks/:id: User A can update their own task', async () => {
      const task = await Task.create({
        title: 'Initial Diagnosis Pending',
        status: 'PENDING',
        authorId: userA._id,
        userId: userA._id
      });

      const res = await request(app)
        .put(`/api/tasks/${task._id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'Diagnosis Confirmed: Hypertension',
          status: 'COMPLETED'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.task.title).toBe('Diagnosis Confirmed: Hypertension');
      expect(res.body.task.status).toBe('COMPLETED');
    });

    it('PUT /api/tasks/:id: User B CANNOT update User A task -> MUST return 403 Forbidden', async () => {
      const task = await Task.create({
        title: 'Doctor Surgical Schedule',
        authorId: userA._id,
        userId: userA._id
      });

      // User B attempts to tamper with User A's task
      const res = await request(app)
        .put(`/api/tasks/${task._id}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ title: 'Tampered Schedule' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Forbidden/i);

      // Verify unchanged in DB
      const unchanged = await Task.findById(task._id);
      expect(unchanged.title).toBe('Doctor Surgical Schedule');
    });

    it('DELETE /api/tasks/:id: User B CANNOT delete User A task -> MUST return 403 Forbidden', async () => {
      const task = await Task.create({
        title: 'Critical Medical Record',
        authorId: userA._id,
        userId: userA._id
      });

      // User B attempts unauthorized deletion
      const res = await request(app)
        .delete(`/api/tasks/${task._id}`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Forbidden/i);

      // Verify still exists in DB
      const stillExists = await Task.findById(task._id);
      expect(stillExists).not.toBeNull();
    });

    it('DELETE /api/tasks/:id: User A can delete their own task', async () => {
      const task = await Task.create({
        title: 'Temporary Task to Delete',
        authorId: userA._id,
        userId: userA._id
      });

      const res = await request(app)
        .delete(`/api/tasks/${task._id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const deleted = await Task.findById(task._id);
      expect(deleted).toBeNull();
    });

    it('Non-existent task ID returns 404 Not Found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/tasks/${nonExistentId}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ============================================================
  // PHASE 3: MONETIZATION ARCHITECTURE (STRIPE CHECKOUT PIPELINE)
  // ============================================================
  describe('Phase 3: Monetization Architecture & Stripe Gateway (P2)', () => {
    it('GET /api/payment/plans: Exposes available monetization tiers', async () => {
      const res = await request(app).get('/api/payment/plans');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.plans.length).toBeGreaterThanOrEqual(2);
      expect(res.body.plans.some(p => p.id === 'PRO')).toBe(true);
    });

    it('POST /api/payment/create-checkout-session: Generates checkout session with verified payload', async () => {
      const res = await request(app)
        .post('/api/payment/create-checkout-session')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ planId: 'PRO' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.url).toBeDefined();
      expect(res.body.sessionId).toBeDefined();
    });

    it('GET /api/payment/verify-session/:sessionId: Verifies checkout and upgrades user tier', async () => {
      const mockSessionId = 'cs_test_mock_session_123';
      const res = await request(app)
        .get(`/api/payment/verify-session/${mockSessionId}?plan=PRO`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.verified).toBe(true);
      expect(res.body.user.plan).toBe('PRO');

      // Verify DB persistence
      const updatedUser = await User.findById(userA._id);
      expect(updatedUser.plan).toBe('PRO');
    });
  });
});
