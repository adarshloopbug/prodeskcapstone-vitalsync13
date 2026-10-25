/**
 * VitalSync API Client & Client Interception Service
 * Fulfills Phase 2 (POST requests to /api/auth) and Phase 3 (Client Interception)
 */

const TOKEN_KEY = 'vitalsync_token';
const USER_KEY = 'vitalsync_user';

/**
 * Decode JWT payload without external library
 */
export function parseJwt(token) {
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Failed to parse JWT:', e);
    return null;
  }
}

/**
 * Check if the stored JWT is null, malformed, or expired
 */
export function isTokenExpired(token) {
  if (!token) return true;
  const decoded = parseJwt(token);
  if (!decoded || !decoded.exp) return true;
  // Exp is in seconds; Date.now() is in milliseconds
  return Date.now() >= decoded.exp * 1000;
}

/**
 * Purge tokens and force automatic redirect to /login
 * Fulfills Phase 3: "If the JWT is null or expired in the React client, automatically force a redirect to the /login route."
 */
export function forceRedirectToLogin(reason = 'expired') {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);

  // Dispatch custom window event so React AuthContext updates without hard reload
  window.dispatchEvent(new CustomEvent('vitalsync_auth_change', { detail: { reason } }));

  // Redirect if not already on /login
  if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
    window.location.href = `/login?reason=${reason}`;
  }
}

/**
 * Unified API Request Client with Request & Response Interceptors
 */
export async function apiFetch(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : endpoint;
  const token = localStorage.getItem(TOKEN_KEY);

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  // CLIENT INTERCEPTION (Request Phase):
  // If endpoint is a protected route (e.g. /api/tasks or /api/auth/me), verify token validity
  const isPublicAuthRoute = endpoint.includes('/api/auth/login') ||
                            endpoint.includes('/api/auth/register') ||
                            endpoint.includes('/api/auth/seed-demo-users') ||
                            endpoint.includes('/api/health');

  if (!isPublicAuthRoute) {
    if (!token || isTokenExpired(token)) {
      console.warn('[Client Interceptor] JWT is null or expired prior to request. Forcing redirect to /login.');
      forceRedirectToLogin(token ? 'expired' : 'unauthorized');
      throw new Error('Authentication required. Session expired.');
    }

    // Attach Authorization header
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    const data = await response.json().catch(() => ({}));

    // CLIENT INTERCEPTION (Response Phase):
    // Intercept 401 Unauthorized responses from the server
    if (response.status === 401) {
      console.warn('[Client Interceptor] Server rejected JWT (401 Unauthorized):', data.message);
      forceRedirectToLogin(data.code === 'TOKEN_EXPIRED' ? 'expired' : 'invalid');
      throw new Error(data.message || 'Session expired or unauthorized.');
    }

    if (!response.ok) {
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    return data;
  } catch (error) {
    throw error;
  }
}

/* ==========================================================================
   API Service Endpoints
   ========================================================================== */

export const authAPI = {
  // Phase 2: POST /api/auth/register
  register: async (userData) => {
    return apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  // Phase 2: POST /api/auth/login
  login: async (credentials) => {
    return apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  },

  // Protected /api/auth/me
  getMe: async () => {
    return apiFetch('/api/auth/me');
  },

  // Seed / Verify demo accounts
  seedDemo: async () => {
    return apiFetch('/api/auth/seed-demo-users', {
      method: 'POST'
    });
  }
};

export const tasksAPI = {
  // Phase 1 & 2 Protected CRUD endpoints
  getAll: async () => {
    return apiFetch('/api/tasks');
  },

  getById: async (id) => {
    return apiFetch(`/api/tasks/${id}`);
  },

  create: async (taskData) => {
    return apiFetch('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData)
    });
  },

  update: async (id, taskData) => {
    return apiFetch(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(taskData)
    });
  },

  delete: async (id) => {
    return apiFetch(`/api/tasks/${id}`, {
      method: 'DELETE'
    });
  }
};

export const paymentAPI = {
  // Phase 3 Monetization Architecture (Stripe Test Mode)
  getPlans: async () => {
    return apiFetch('/api/payment/plans');
  },

  createCheckoutSession: async (planId = 'PRO') => {
    return apiFetch('/api/payment/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify({
        planId,
        clientBaseUrl: window.location.origin
      })
    });
  },

  verifySession: async (sessionId, plan = 'PRO') => {
    return apiFetch(`/api/payment/verify-session/${sessionId}?plan=${plan}`);
  }
};

