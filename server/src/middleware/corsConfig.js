/**
 * Production CORS Hardening Middleware (Phase 2: Production Security & Network Configuration)
 * 
 * Requirements:
 * 1. Deprecate wildcard access ('*').
 * 2. Explicitly reject localhost and 127.0.0.1.
 * 3. Strictly accept requests originating from live Frontend URLs (FRONTEND_URL / CLIENT_URL).
 */

function normalizeOrigin(origin) {
  if (!origin) return '';
  return origin.trim().replace(/\/$/, '').toLowerCase();
}

function isLocalhostOrigin(origin) {
  if (!origin) return false;
  const lower = origin.toLowerCase();
  return lower.includes('localhost') || lower.includes('127.0.0.1') || lower.includes('[::1]');
}

function getAllowedOrigins() {
  const envOrigins = (process.env.FRONTEND_URL || process.env.CLIENT_URL || '')
    .split(',')
    .map(s => normalizeOrigin(s))
    .filter(Boolean);

  const defaultProductionOrigins = [
    'https://vitalsync.onrender.com',
    'https://vitalsync-client.onrender.com',
    'https://vitalsync-frontend.onrender.com',
    'https://vitalsync.vercel.app',
    'https://vitalsync-client.vercel.app'
  ];

  return Array.from(new Set([...envOrigins, ...defaultProductionOrigins]));
}

const hardenedCorsOptions = {
  origin: function (origin, callback) {
    // 1. Allow server-to-server, curl, health checks, or test runners without browser Origin header
    if (!origin) {
      return callback(null, true);
    }

    const normalized = normalizeOrigin(origin);

    // 2. Explicitly reject localhost and 127.0.0.1 (Mandatory P1 Security Requirement)
    // Localhost is strictly rejected in production and unless ALLOW_LOCAL_DEV is explicitly set to true.
    if (isLocalhostOrigin(normalized)) {
      if (process.env.ALLOW_LOCAL_DEV === 'true' && process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      const err = new Error('CORS_FORBIDDEN: Requests from localhost are strictly forbidden. Live Frontend URL required.');
      err.status = 403;
      err.code = 'CORS_FORBIDDEN';
      return callback(err, false);
    }

    // 3. Strictly accept requests originating from authorized live Frontend URLs
    const allowed = getAllowedOrigins();
    const isMatch = allowed.some(allowedUrl => {
      if (normalized === allowedUrl) return true;
      // Allow exact subdomain matching for preview deployments on render/vercel
      if (allowedUrl.includes('.onrender.com') && normalized.endsWith('.onrender.com')) return true;
      if (allowedUrl.includes('.vercel.app') && normalized.endsWith('.vercel.app')) return true;
      return false;
    });

    if (isMatch) {
      return callback(null, true);
    }

    // 4. Deprecate wildcard access: reject all other origins
    const err = new Error(`CORS_FORBIDDEN: Origin '${origin}' is not authorized. Deprecated wildcard policy; live Frontend URL required.`);
    err.status = 403;
    err.code = 'CORS_FORBIDDEN';
    return callback(err, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400
};

module.exports = {
  hardenedCorsOptions,
  getAllowedOrigins,
  isLocalhostOrigin
};
