const rateLimit = require('express-rate-limit');

/**
 * Rate Limiter Configuration (Phase 3: Security & Throttling)
 * Protects endpoints from DDoS and token-spam with aggressive throttling.
 */

// Login Route Rate Limiter: Max 10 attempts per 15 minutes window in production
// Skips successful logins, and skips in development so developers never get locked out locally.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 100 : (process.env.NODE_ENV === 'production' ? 10 : 1000),
  skipSuccessfulRequests: true,
  skip: (req) => {
    // In local development, avoid locking out legitimate testing
    return process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test';
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many login attempts. Please try again after 15 minutes.'
    });
  }
});

// Dedicated strict test limiter to explicitly test 429 response in Jest suite
const strictLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many login attempts. Please try again after 15 minutes.'
    });
  }
});

// AI Microservice Rate Limiter: Max 10 requests per minute to prevent LLM quota exhaustion
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'test' ? 100 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'AI microservice rate limit exceeded. Maximum 10 requests per minute.'
    });
  }
});

// Dedicated strict AI limiter to explicitly test 429 response in Jest suite
const strictAiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 2,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'AI microservice rate limit exceeded. Maximum 10 requests per minute.'
    });
  }
});

module.exports = {
  loginLimiter,
  strictLoginLimiter,
  aiLimiter,
  strictAiLimiter
};
