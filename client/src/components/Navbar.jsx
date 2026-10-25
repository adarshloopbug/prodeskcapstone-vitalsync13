import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Activity, User as UserIcon, LogOut, CheckCircle2, Lock } from 'lucide-react';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'DOCTOR': return 'badge-indigo';
      case 'ADMIN': return 'badge-rose';
      case 'STAFF': return 'badge-amber';
      case 'PATIENT':
      default: return 'badge-teal';
    }
  };

  return (
    <header>
      {/* Top Compliance Notice Bar */}
      <div className="top-notice-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="notice-status-dot" />
          <span>VitalSync Enterprise Healthcare Platform • <strong>Synthetic Data Only</strong></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', opacity: 0.9 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Lock size={12} /> HIPAA-Aligned Cryptography
          </span>
          <span>•</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Shield size={12} /> JWT Auth Pipeline Active
          </span>
        </div>
      </div>

      {/* Main Navbar */}
      <nav className="navbar">
        <Link to="/" className="brand-wrapper">
          <div className="brand-logo">VS</div>
          <div>
            <div className="brand-title">
              VitalSync
            </div>
            <div className="brand-subtitle">Secure Hospital EHR & Scheduling Platform</div>
          </div>
        </Link>

        <div className="nav-actions">
          {isAuthenticated && user ? (
            <>
              <Link to="/dashboard" className="btn btn-secondary btn-sm">
                <Activity size={14} /> Clinical Tasks
              </Link>

              <div className="user-badge">
                <div className="user-avatar">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <div className="user-meta-name">{user.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className={`badge ${getRoleBadgeClass(user.role)}`}>
                      {user.role}
                    </span>
                  </div>
                </div>
              </div>

              <button onClick={logout} className="btn btn-danger btn-sm" title="Sign Out">
                <LogOut size={14} /> Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-secondary btn-sm">
                Sign In
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Register New User
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
