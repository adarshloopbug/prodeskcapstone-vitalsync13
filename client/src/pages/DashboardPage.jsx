import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { tasksAPI, parseJwt } from '../services/api';
import {
  Shield,
  Key,
  Clock,
  User,
  Plus,
  Trash2,
  CheckCircle,
  Clock3,
  AlertTriangle,
  RefreshCw,
  Bug,
  Lock,
  Layers,
  Activity,
  FileText
} from 'lucide-react';

export default function DashboardPage() {
  const { user, token, logout, simulateExpiredToken, simulateTamperedToken } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [taskError, setTaskError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // New task form state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('CLINICAL');
  const [newTaskPriority, setNewTaskPriority] = useState('MEDIUM');
  const [newTaskPatient, setNewTaskPatient] = useState('Rajesh Patel');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [submittingTask, setSubmittingTask] = useState(false);

  // Decoded JWT inspection
  const decodedToken = parseJwt(token);
  const [secondsRemaining, setSecondsRemaining] = useState(null);

  // Countdown timer for JWT
  useEffect(() => {
    if (!decodedToken || !decodedToken.exp) return;

    const updateRemaining = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = decodedToken.exp - now;
      setSecondsRemaining(diff > 0 ? diff : 0);
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [decodedToken]);

  // Load tasks from protected backend endpoint
  const loadTasks = async () => {
    try {
      setLoadingTasks(true);
      setTaskError('');
      const data = await tasksAPI.getAll();
      setTasks(data.tasks || []);
    } catch (err) {
      setTaskError(err.message || 'Failed to load protected tasks.');
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  // Handle task creation
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      setSubmittingTask(true);
      await tasksAPI.create({
        title: newTaskTitle.trim(),
        category: newTaskCategory,
        priority: newTaskPriority,
        patientName: newTaskPatient.trim(),
        description: newTaskDescription.trim()
      });

      // Reset form & reload
      setNewTaskTitle('');
      setNewTaskDescription('');
      setShowAddModal(false);
      await loadTasks();
    } catch (err) {
      setTaskError(err.message || 'Error creating task');
    } finally {
      setSubmittingTask(false);
    }
  };

  // Toggle task status
  const handleToggleStatus = async (task) => {
    const nextStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    try {
      // Optimistic update
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: nextStatus } : t));
      await tasksAPI.update(task.id, { status: nextStatus });
    } catch (err) {
      await loadTasks(); // Revert on failure
    }
  };

  // Delete task
  const handleDeleteTask = async (id) => {
    try {
      setTasks(prev => prev.filter(t => t.id !== id));
      await tasksAPI.delete(id);
    } catch (err) {
      await loadTasks();
    }
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'URGENT':
      case 'HIGH': return 'badge-rose';
      case 'MEDIUM': return 'badge-amber';
      case 'LOW':
      default: return 'badge-teal';
    }
  };

  const formatSeconds = (sec) => {
    if (sec === null) return 'Calculating...';
    if (sec <= 0) return 'Expired';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  return (
    <div className="dashboard-viewport">
      {/* Hero Welcome */}
      <div className="dashboard-hero">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'rgba(13, 148, 136, 0.2)', color: '#5eead4', borderRadius: '9999px', fontSize: '11px', fontWeight: 700, marginBottom: '12px' }}>
              <Shield size={12} />
              <span>JWT PROTECTED PIPELINE ACTIVE</span>
            </div>
            <h1 className="dashboard-hero-title">
              Welcome back, {user?.name || 'Healthcare Practitioner'}
            </h1>
            <p className="dashboard-hero-sub">
              Role: <strong style={{ color: '#fff' }}>{user?.role}</strong> • Email: <strong style={{ color: '#fff' }}>{user?.email}</strong>
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={loadTasks} className="btn btn-secondary btn-sm" title="Refresh protected data">
              <RefreshCw size={14} /> Refresh Pipeline
            </button>
            <button onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm">
              <Plus size={14} /> New Clinical Task
            </button>
          </div>
        </div>
      </div>

      {/* Phase 3 Live JWT Inspector & Security Cockpit */}
      <div className="token-inspector-card">
        <div className="inspector-header">
          <div className="inspector-title">
            <Lock size={16} color="#0d9488" />
            <span>Phase 3: Cryptographic JWT Inspector & Client Interception Cockpit</span>
          </div>
          {user?.role !== 'PATIENT' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Simulate Auth Failures:</span>
              <button
                onClick={simulateExpiredToken}
                className="btn btn-secondary btn-sm"
                title="Expire token to trigger automatic redirect to /login"
              >
                <Clock size={12} /> Test Token Expiry
              </button>
              <button
                onClick={async () => {
                  simulateTamperedToken();
                  try {
                    await tasksAPI.getAll();
                  } catch (e) {
                    // Interceptor catches and redirects
                  }
                }}
                className="btn btn-secondary btn-sm"
                title="Tamper signature to trigger 401 client interceptor"
              >
                <Bug size={12} /> Test Tampered Token
              </button>
            </div>
          )}
        </div>

        {/* Raw Token string preview */}
        <div className="token-preview">
          <div style={{ color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.05em' }}>
            Authorization Header: Bearer [localStorage.getItem('vitalsync_token')]
          </div>
          <code>{token || 'No active token'}</code>
        </div>

        {/* Decoded Token Claims Grid */}
        <div className="inspector-grid">
          <div className="inspector-item">
            <div className="inspector-item-label">Decoded User ID (sub/id)</div>
            <div className="inspector-item-val" style={{ fontFamily: 'monospace', fontSize: '12px' }}>
              {decodedToken?.id || '—'}
            </div>
          </div>
          <div className="inspector-item">
            <div className="inspector-item-label">Claim: Role (RBAC)</div>
            <div className="inspector-item-val" style={{ color: '#0d9488' }}>
              {decodedToken?.role || '—'}
            </div>
          </div>
          <div className="inspector-item">
            <div className="inspector-item-label">Issued At (iat)</div>
            <div className="inspector-item-val" style={{ fontSize: '12px' }}>
              {decodedToken?.iat ? new Date(decodedToken.iat * 1000).toLocaleTimeString() : '—'}
            </div>
          </div>
          <div className="inspector-item">
            <div className="inspector-item-label">Expires In (exp countdown)</div>
            <div className="inspector-item-val" style={{ color: secondsRemaining < 60 ? '#dc2626' : '#059669' }}>
              {formatSeconds(secondsRemaining)}
            </div>
          </div>
        </div>
      </div>

      {/* Protected Pipeline Data: Clinical Tasks */}
      <div className="tasks-container">
        <div className="tasks-header">
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              Protected Data Pipeline (/api/tasks)
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
              Endpoint is guarded by Express <code>verifyToken</code> middleware. Only requests with valid Bearer JWT receive response data.
            </p>
          </div>
          <span className="badge badge-teal">
            {tasks.length} {tasks.length === 1 ? 'Task' : 'Tasks'} Loaded
          </span>
        </div>

        {taskError && (
          <div className="alert alert-danger">
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <div>{taskError}</div>
          </div>
        )}

        {loadingTasks ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
            <div style={{
              width: '32px',
              height: '32px',
              border: '3px solid #e2e8f0',
              borderTopColor: '#0d9488',
              borderRadius: '50%',
              margin: '0 auto 12px',
              animation: 'spin 1s linear infinite'
            }} />
            <p style={{ fontSize: '13px' }}>Executing cryptographically authenticated GET /api/tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#64748b', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
            <Layers size={36} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#334155' }}>No Clinical Tasks Logged</h3>
            <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '400px', margin: '4px auto 16px' }}>
              Create your first clinical task using the protected endpoint to verify your JWT write pipeline.
            </p>
            <button onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm">
              <Plus size={14} /> Add First Task
            </button>
          </div>
        ) : (
          <div className="task-list">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`task-card ${task.status === 'COMPLETED' ? 'completed' : ''}`}
              >
                <div className="task-main">
                  <input
                    type="checkbox"
                    className="task-checkbox"
                    checked={task.status === 'COMPLETED'}
                    onChange={() => handleToggleStatus(task)}
                    title="Mark task completed"
                  />
                  <div>
                    <div className="task-title">{task.title}</div>
                    {task.description && (
                      <div className="task-desc">{task.description}</div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', fontSize: '11px', color: '#64748b' }}>
                      <span>Patient: <strong>{task.patientName}</strong></span>
                      <span>•</span>
                      <span>Category: <strong>{task.category}</strong></span>
                      <span>•</span>
                      <span>Created: {new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>

                <div className="task-meta">
                  <span className={`badge ${getPriorityBadgeClass(task.priority)}`}>
                    {task.priority}
                  </span>
                  <span className={`badge ${task.status === 'COMPLETED' ? 'badge-emerald' : 'badge-amber'}`}>
                    {task.status}
                  </span>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '6px', color: '#94a3b8' }}
                    title="Delete task"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Task Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                Add Clinical Task (Protected POST)
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateTask}>
              <div className="form-group">
                <label className="form-label" htmlFor="task-title">Task Title</label>
                <input
                  id="task-title"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Verify Metformin 850mg dosage with Dr. Sharma"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="task-patient">Patient Name</label>
                <input
                  id="task-patient"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Rajesh Patel"
                  value={newTaskPatient}
                  onChange={(e) => setNewTaskPatient(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="task-category">Category</label>
                  <select
                    id="task-category"
                    className="form-input"
                    value={newTaskCategory}
                    onChange={(e) => setNewTaskCategory(e.target.value)}
                  >
                    <option value="CLINICAL">Clinical Review</option>
                    <option value="TRIAGE">Triage / Vitals</option>
                    <option value="PRESCRIPTION">Prescription Check</option>
                    <option value="FOLLOW_UP">Follow Up</option>
                    <option value="ADMIN">Administrative</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="task-priority">Priority</label>
                  <select
                    id="task-priority"
                    className="form-input"
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value)}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent / Stat</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="task-desc">Clinical Notes / Context</label>
                <textarea
                  id="task-desc"
                  className="form-input"
                  rows={3}
                  placeholder="Additional context for attending doctor or triage nurse..."
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingTask}
                >
                  {submittingTask ? 'Creating...' : 'Create Protected Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
