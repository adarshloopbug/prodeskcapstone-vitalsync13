const jwt = require('jsonwebtoken');

/**
 * Authentication Middleware
 * Fulfills Phase 3:
 * 1. Intercepts incoming requests.
 * 2. Parses the 'Authorization: Bearer <token>' header.
 * 3. Cryptographically verifies the signature against JWT_SECRET.
 * 4. Protects downstream data endpoints by attaching decoded user payload or rejecting unauthorized traffic.
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  // 1. Check if Authorization header is present
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      code: 'TOKEN_MISSING',
      message: 'Access denied. No authorization header provided.'
    });
  }

  // 2. Validate Bearer token format
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      success: false,
      code: 'TOKEN_MALFORMED',
      message: 'Access denied. Authorization format must be "Bearer <token>".'
    });
  }

  const token = parts[1];

  // 3. Cryptographically verify token
  const secret = process.env.JWT_SECRET || 'vitalsync_secure_jwt_secret_key_2026_super_safe_and_strong';

  try {
    const decoded = jwt.verify(token, secret);
    // Attach decoded user payload (id, email, role, name) to request
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        code: 'TOKEN_EXPIRED',
        message: 'Your session has expired. Please log in again.'
      });
    }

    return res.status(401).json({
      success: false,
      code: 'TOKEN_INVALID',
      message: 'Authentication failed. Invalid or tampered token.'
    });
  }
}

/**
 * Role-Based Access Control (RBAC) guard middleware
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: `Forbidden: requires one of the following roles: [${allowedRoles.join(', ')}]`
      });
    }
    next();
  };
}

module.exports = {
  verifyToken,
  authorizeRoles
};
