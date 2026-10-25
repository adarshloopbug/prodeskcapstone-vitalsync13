const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * Helper to generate signed JWT
 */
function generateToken(user) {
  const secret = process.env.JWT_SECRET || 'vitalsync_secure_jwt_secret_key_2026_super_safe_and_strong';
  const expiresIn = process.env.JWT_EXPIRES_IN || '1h';

  return jwt.sign(
    {
      id: user._id || user.id,
      email: user.email,
      name: user.name,
      role: user.role
    },
    secret,
    { expiresIn }
  );
}

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user, hashes password with bcryptjs, and returns JWT
 * @access  Public
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // 1. Validate required inputs
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are all required.'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.'
      });
    }

    // 2. Check for duplicate email
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    // 3. Create user (password is salted & hashed via User pre-save hook)
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: role ? role.toUpperCase() : 'PATIENT'
    });

    await user.save();

    // 4. Generate JWT upon successful registration
    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error during registration.'
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user against bcryptjs password hash and return JWT
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validate presence of credentials
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.'
      });
    }

    // 2. Lookup user and explicitly include password hash
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // 3. Cryptographically verify password hash using bcryptjs
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // 4. Issue signed JWT
    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: 'Authentication successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error during authentication.'
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user profile
 * @access  Protected (Requires valid JWT)
 */
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.'
      });
    }

    return res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user profile.'
    });
  }
});

/**
 * @route   POST /api/auth/seed-demo-users
 * @desc    Seeds default demo accounts for testing all clinical roles
 * @access  Public
 */
router.post('/seed-demo-users', async (req, res) => {
  try {
    const demoAccounts = [
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
    ];

    const results = [];
    for (const acc of demoAccounts) {
      let existing = await User.findOne({ email: acc.email });
      if (!existing) {
        existing = await User.create(acc);
      }
      results.push({ email: existing.email, role: existing.role });
    }

    return res.status(200).json({
      success: true,
      message: 'Demo accounts verified/seeded successfully.',
      accounts: results
    });
  } catch (error) {
    console.error('Seed demo error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
