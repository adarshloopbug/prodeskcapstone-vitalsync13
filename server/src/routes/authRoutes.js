const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyToken } = require('../middleware/authMiddleware');
const { validateBody, registerSchema, loginSchema } = require('../middleware/validate');
const { loginLimiter } = require('../middleware/rateLimiter');

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
 * @desc    Register a new user with Zod schema validation (Phase 1)
 * @access  Public
 */
router.post('/register', validateBody(registerSchema), async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // Duplicate email check
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        code: 'CONFLICT',
        message: 'An account with this email address already exists.'
      });
    }

    // Create user (password is salted & hashed via User pre-save hook)
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: role ? role.toUpperCase() : 'PATIENT'
    });

    await user.save();

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
    return res.status(500).json({
      success: false,
      code: 'REGISTRATION_FAILED',
      message: error.message || 'Internal server error during registration.'
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user with rate limiting (Phase 3) and Zod validation (Phase 1)
 * @access  Public
 */
router.post('/login', loginLimiter, validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.'
      });
    }

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
        plan: user.plan || 'FREE',
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      code: 'AUTHENTICATION_FAILED',
      message: error.message || 'Internal server error during authentication.'
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user profile
 * @access  Protected (Requires valid JWT)
 */
router.get('/me', verifyToken, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        code: 'NOT_FOUND',
        message: 'User profile not found.'
      });
    }

    return res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      code: 'PROFILE_FETCH_FAILED',
      message: 'Failed to retrieve user profile.'
    });
  }
});

module.exports = router;
