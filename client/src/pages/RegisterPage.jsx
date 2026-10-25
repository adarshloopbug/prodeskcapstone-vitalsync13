import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Stethoscope,
  UserCheck,
  Building,
  Activity
} from 'lucide-react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('PATIENT');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  // Simple password strength calculation
  const getPasswordStrength = (pass) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score; // 0 to 4
  };

  const strengthScore = getPasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please provide your full legal name.');
      return;
    }
    if (!email.trim()) {
      setError('Please provide a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must contain at least 8 characters for clinical compliance.');
      return;
    }

    try {
      setLoading(true);
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        role
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed. Please check inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-split-layout">
      {/* Left Hero & Security Branding Panel (50%) */}
      <div className="auth-hero-panel">
        <div className="auth-glow-teal" />
        <div className="auth-glow-blue" />

        <div className="hero-content">
          <div className="hero-badge">
            <ShieldCheck size={14} />
            <span>P0 & P1 Cryptographic Registration</span>
          </div>

          <h1 className="hero-headline">
            Create your secure VitalSync credential.
          </h1>

          <p className="hero-description">
            Your clinical password is never stored in plaintext. It is cryptographically salted and hashed via bcryptjs with 10 salt rounds prior to MongoDB storage.
          </p>
        </div>

        {/* Security Checklist */}
        <div className="security-matrix">
          <div className="security-matrix-label">Authentication Pipeline Checklist</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#cbd5e1' }}>
              <CheckCircle2 size={16} color="#2dd4bf" />
              <span><strong>Mongoose Schema:</strong> Validated Email, Name, and Role constraints</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#cbd5e1' }}>
              <CheckCircle2 size={16} color="#2dd4bf" />
              <span><strong>Cryptographic Security:</strong> bcryptjs pre-save salting hook (P0 mandatory)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#cbd5e1' }}>
              <CheckCircle2 size={16} color="#2dd4bf" />
              <span><strong>JWT Generation:</strong> Signed token issued and saved in localStorage</span>
            </div>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 10, fontSize: '11px', color: '#64748b' }}>
          VitalSync Architecture Reference • 100% Synthetic Patient Data Benchmark
        </div>
      </div>

      {/* Right Interactive Form Panel */}
      <div className="auth-form-panel">
        <div className="auth-form-container">
          {error && (
            <div className="alert alert-danger">
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <div>{error}</div>
            </div>
          )}

          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Register for VitalSync
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
              Set up your profile to generate your cryptographically verified session.
            </p>
          </div>

          <div className="auth-tabs">
            <button
              type="button"
              className="auth-tab"
              onClick={() => navigate('/login')}
            >
              Sign In
            </button>
            <button type="button" className="auth-tab active">
              Register New Account
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Full Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="reg-name">Full Legal Name</label>
              <div className="input-wrapper">
                <input
                  id="reg-name"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Dr. Priya Sharma or Rajesh Patel"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="form-label" htmlFor="reg-email">Email Address</label>
              <div className="input-wrapper">
                <input
                  id="reg-email"
                  type="email"
                  className="form-input"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Role Selection */}
            <div className="form-group">
              <label className="form-label">Clinical Persona Role</label>
              <div className="role-grid">
                <button
                  type="button"
                  className={`role-card-btn ${role === 'PATIENT' ? 'active' : ''}`}
                  onClick={() => setRole('PATIENT')}
                >
                  <UserCheck size={16} />
                  <span>Patient</span>
                </button>
                <button
                  type="button"
                  className={`role-card-btn ${role === 'DOCTOR' ? 'active' : ''}`}
                  onClick={() => setRole('DOCTOR')}
                >
                  <Stethoscope size={16} />
                  <span>Doctor</span>
                </button>
                <button
                  type="button"
                  className={`role-card-btn ${role === 'STAFF' ? 'active' : ''}`}
                  onClick={() => setRole('STAFF')}
                >
                  <Activity size={16} />
                  <span>Staff</span>
                </button>
                <button
                  type="button"
                  className={`role-card-btn ${role === 'ADMIN' ? 'active' : ''}`}
                  onClick={() => setRole('ADMIN')}
                >
                  <Building size={16} />
                  <span>Admin</span>
                </button>
              </div>
            </div>

            {/* Password */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" htmlFor="reg-password" style={{ marginBottom: 0 }}>Password</label>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Min. 8 characters</span>
              </div>
              <div className="input-wrapper">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

              {/* Password Strength Meter */}
              {password && (
                <div style={{ marginTop: '8px' }}>
                  <div className="strength-bar">
                    <div className={`strength-segment ${strengthScore >= 1 ? (strengthScore <= 2 ? 'strength-weak' : strengthScore === 3 ? 'strength-medium' : 'strength-strong') : ''}`} />
                    <div className={`strength-segment ${strengthScore >= 2 ? (strengthScore === 2 ? 'strength-weak' : strengthScore === 3 ? 'strength-medium' : 'strength-strong') : ''}`} />
                    <div className={`strength-segment ${strengthScore >= 3 ? (strengthScore === 3 ? 'strength-medium' : 'strength-strong') : ''}`} />
                    <div className={`strength-segment ${strengthScore >= 4 ? 'strength-strong' : ''}`} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                    <span>Cryptographic Security Meter</span>
                    <span style={{ fontWeight: 600 }}>
                      {strengthScore <= 1 && 'Weak (Needs length/symbols)'}
                      {strengthScore === 2 && 'Fair'}
                      {strengthScore === 3 && 'Good'}
                      {strengthScore >= 4 && 'Strong Clinical Grade'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
              style={{ marginTop: '16px' }}
            >
              {loading ? (
                <>Hashing with bcryptjs & Registering...</>
              ) : (
                <>
                  <span>Create Account & Issue JWT</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
            Already have an existing account?{' '}
            <Link to="/login" style={{ color: '#0d9488', fontWeight: 600, textDecoration: 'none' }}>
              Sign In →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
