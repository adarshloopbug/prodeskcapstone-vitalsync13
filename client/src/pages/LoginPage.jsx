import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Stethoscope,
  Sparkles,
  Bot
} from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectReason = searchParams.get('reason');

  // If already authenticated, forward to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please provide both email address and password.');
      return;
    }

    try {
      setLoading(true);
      await login({ email: email.trim(), password });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-split-layout">
      {/* Left Brand Panel */}
      <div className="auth-hero-panel">
        <div className="auth-glow-teal" />
        <div className="auth-glow-blue" />

        <div className="hero-content">
          <div className="hero-badge">
            <ShieldCheck size={14} />
            <span>Secure Clinical EHR & AI Microservice</span>
          </div>

          <h1 className="hero-headline">
            Precision clinical workflows powered by server-side AI.
          </h1>

          <p className="hero-description">
            Hardened REST API architecture with Zod schema validation, aggressive rate throttling, and Google Gemini clinical decision support.
          </p>
        </div>

        {/* Security Pillars */}
        <div className="security-matrix">
          <div className="security-matrix-label">Backend Hardening & Architecture</div>
          <div className="security-grid">
            <div className="security-box">
              <div className="security-box-title">Zod Schema Guard</div>
              <div className="security-box-desc">Strict payload rules intercept malformed requests before touching database.</div>
            </div>
            <div className="security-box">
              <div className="security-box-title">AI Microservice</div>
              <div className="security-box-desc">Server-side LLM execution with sanitization and zero client key leaks.</div>
            </div>
            <div className="security-box">
              <div className="security-box-title">Rate Throttling</div>
              <div className="security-box-desc">DDoS and token-spam protection with express-rate-limit 429 guards.</div>
            </div>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 10, fontSize: '11px', color: '#64748b' }}>
          © 2026 VitalSync Healthcare Technologies Inc. Secure Enterprise Platform.
        </div>
      </div>

      {/* Right Login Card */}
      <div className="auth-form-panel">
        <div className="auth-form-container">
          {redirectReason === 'expired' && (
            <div className="alert alert-warning">
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <div>
                <strong>Session Expired:</strong> Your security token has expired. Please sign in again.
              </div>
            </div>
          )}

          {error && (
            <div className="alert alert-danger">
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <div>{error}</div>
            </div>
          )}

          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Sign In to VitalSync
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
              Enter your clinical credentials to access the EHR platform.
            </p>
          </div>

          {/* Clean Form */}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">Email Address</label>
              <div className="input-wrapper">
                <input
                  id="login-email"
                  type="email"
                  className="form-input"
                  placeholder="e.g. doctor@vitalsync.health"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" htmlFor="login-password" style={{ marginBottom: 0 }}>Password</label>
              </div>
              <div className="input-wrapper">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="input-icon-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('doctor@vitalsync.health');
                    setPassword('DoctorPassword123!');
                    setError('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0d9488',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: 0
                  }}
                >
                  <span>⚡ Quick Fill: doctor@vitalsync.health</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
              style={{ marginTop: '16px' }}
            >
              {loading ? (
                <>Authenticating...</>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
            New practitioner?{' '}
            <Link to="/register" style={{ color: '#0d9488', fontWeight: 600, textDecoration: 'none' }}>
              Create an Account →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
