import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isTokenExpired } from '../services/api';

/**
 * ProtectedRoute Component
 * Fulfills Phase 3 Client Interception:
 * If JWT is null or expired, automatically forces a redirect to /login.
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { token, user, loading, logout } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '16px' }}>
        <div style={{
          width: '36px',
          height: '36px',
          border: '3px solid #e2e8f0',
          borderTopColor: '#0d9488',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
          Verifying security credentials...
        </span>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Check 1: Token presence and expiration validity
  if (!token || isTokenExpired(token)) {
    console.warn('[ProtectedRoute] Intercepted unauthenticated access attempt. Redirecting to /login.');
    return <Navigate to="/login" replace state={{ from: location, reason: 'unauthorized' }} />;
  }

  // Check 2: Role-based authorization if route specifies allowedRoles
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div style={{ maxWidth: '600px', margin: '48px auto', padding: '24px', background: '#fff', borderRadius: '12px', border: '1px solid #fee2e2' }}>
        <h3 style={{ color: '#dc2626', marginBottom: '8px' }}>Access Restricted</h3>
        <p style={{ color: '#475569', fontSize: '14px', marginBottom: '16px' }}>
          Your current account role (<strong>{user.role}</strong>) does not have authorization to view this clinical module.
        </p>
        <button className="btn btn-secondary" onClick={() => window.history.back()}>
          Return Back
        </button>
      </div>
    );
  }

  return children;
}
