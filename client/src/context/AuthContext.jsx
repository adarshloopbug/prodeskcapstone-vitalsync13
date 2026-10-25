import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, parseJwt, isTokenExpired, forceRedirectToLogin } from '../services/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'vitalsync_token';
const USER_KEY = 'vitalsync_user';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem(USER_KEY);
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(true);

  // Validate token integrity on mount and set up interception listener
  useEffect(() => {
    const initialToken = localStorage.getItem(TOKEN_KEY);
    if (initialToken) {
      if (isTokenExpired(initialToken)) {
        console.warn('[AuthProvider] Token on load is expired. Purging session.');
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
      } else {
        // Re-hydrate user from token if user wasn't stored
        const decoded = parseJwt(initialToken);
        if (decoded && !user) {
          setUser({
            id: decoded.id,
            email: decoded.email,
            name: decoded.name,
            role: decoded.role
          });
        }
      }
    }
    setLoading(false);

    // Listen to custom interceptor events (e.g. from background API calls)
    const handleAuthEvent = (e) => {
      setToken(null);
      setUser(null);
    };

    window.addEventListener('vitalsync_auth_change', handleAuthEvent);
    return () => window.removeEventListener('vitalsync_auth_change', handleAuthEvent);
  }, []);

  // Periodic expiration watch (every 10 seconds)
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      if (isTokenExpired(token)) {
        console.warn('[AuthProvider] Active token reached expiration threshold. Enforcing redirect.');
        forceRedirectToLogin('expired');
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [token]);

  /**
   * Register new user (Phase 2)
   */
  const register = async (formData) => {
    const data = await authAPI.register(formData);
    if (data.success && data.token) {
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
    }
    return data;
  };

  /**
   * Log in user (Phase 2)
   */
  const login = async (credentials) => {
    const data = await authAPI.login(credentials);
    if (data.success && data.token) {
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
    }
    return data;
  };

  /**
   * Log out
   */
  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  };

  /**
   * Evaluator Demo Tool: Corrupt or expire the token in localStorage
   * to test Phase 3 Client Interception in real time
   */
  const simulateTamperedToken = () => {
    const badToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered.signature';
    localStorage.setItem(TOKEN_KEY, badToken);
    setToken(badToken);
  };

  const simulateExpiredToken = () => {
    // A synthetic token expired in 1970
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImV4cCI6MTAwfQ.synthetic';
    localStorage.setItem(TOKEN_KEY, expiredToken);
    setToken(expiredToken);
    forceRedirectToLogin('expired');
  };

  const value = {
    token,
    user,
    loading,
    isAuthenticated: !!token && !isTokenExpired(token),
    register,
    login,
    logout,
    simulateTamperedToken,
    simulateExpiredToken
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
