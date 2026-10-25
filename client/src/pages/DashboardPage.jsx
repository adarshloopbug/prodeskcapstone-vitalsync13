import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { tasksAPI, paymentAPI, parseJwt } from '../services/api';
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
  FileText,
  CreditCard,
  Sparkles,
  Edit3,
  Eye,
  CheckCircle2,
  Zap,
  Building2,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

export default function DashboardPage() {
  const { user, token, logout, simulateExpiredToken, simulateTamperedToken } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [taskError, setTaskError] = useState('');
  const [optimisticNotice, setOptimisticNotice] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Active Task for Edit / View
  const [selectedTask, setSelectedTask] = useState(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    category: 'CLINICAL',
    priority: 'MEDIUM',
    status: 'PENDING',
    patientName: '',
    description: ''
  });

  // New task form state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('CLINICAL');
  const [newTaskPriority, setNewTaskPriority] = useState('MEDIUM');
  const [newTaskPatient, setNewTaskPatient] = useState('Rajesh Patel');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [submittingTask, setSubmittingTask] = useState(false);

  // Payment / Upgrade state
  const [upgradingPlan, setUpgradingPlan] = useState(false);
  const [upgradeError, setUpgradeError] = useState('');

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

  // Load tasks from protected backend endpoint (GET /api/tasks)
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

  // Handle task creation (POST /api/tasks)
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

  // View Task Details (GET /api/tasks/:id) - Ownership Verified
  const handleInspectTask = async (taskId) => {
    try {
      setTaskError('');
      const data = await tasksAPI.getById(taskId);
      setSelectedTask(data.task);
      setShowViewModal(true);
    } catch (err) {
      setTaskError(`Failed to fetch task: ${err.message}`);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (task) => {
    setSelectedTask(task);
    setEditFormData({
      title: task.title || '',
      category: task.category || 'CLINICAL',
      priority: task.priority || 'MEDIUM',
      status: task.status || 'PENDING',
      patientName: task.patientName || '',
      description: task.description || ''
    });
    setShowEditModal(true);
  };

  // Save Task Update (PUT /api/tasks/:id) - Ownership Verified
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;

    try {
      setSubmittingTask(true);
      const res = await tasksAPI.update(selectedTask.id || selectedTask._id, editFormData);
      
      // Update local state
      setTasks(prev => prev.map(t => (t.id === selectedTask.id || t._id === selectedTask._id) ? res.task : t));
      setShowEditModal(false);
      setSelectedTask(null);
    } catch (err) {
      setTaskError(`Update failed: ${err.message}`);
    } finally {
      setSubmittingTask(false);
    }
  };

  // Toggle task status
  const handleToggleStatus = async (task) => {
    const nextStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    const taskId = task.id || task._id;
    try {
      // Optimistic update
      setTasks(prev => prev.map(t => (t.id === taskId || t._id === taskId) ? { ...t, status: nextStatus } : t));
      await tasksAPI.update(taskId, { status: nextStatus });
    } catch (err) {
      await loadTasks(); // Revert on failure
    }
  };

  /**
   * OPTIMISTIC UI DELETION (Phase 2 Requirement)
   * "When a user deletes an object, do not wait for the backend response or trigger a page reload.
   * Utilize your state setter to filter the object out of the DOM array instantly, while the
   * asynchronous API call resolves in the background."
   */
  const handleDeleteTaskOptimistic = (id) => {
    // 1. Snapshot previous state for rollback if network/ownership error occurs
    const previousTasks = [...tasks];

    // 2. Instantly filter object out of DOM array using state setter (Zero Delay)
    setTasks(prev => prev.filter(t => (t.id || t._id) !== id));
    
    // Visual indicator of optimistic state mutation
    setOptimisticNotice(`⚡ Optimistic UI: Task filtered from DOM instantly. Resolving DELETE /api/tasks/${id} asynchronously in background...`);
    setTimeout(() => setOptimisticNotice(''), 4500);

    // 3. Asynchronous API call resolves in the background without blocking the UI
    tasksAPI.delete(id).catch(err => {
      console.error('Optimistic delete rejected by server:', err);
      // Revert state if unauthorized (e.g. 403 Forbidden) or network error
      setTasks(previousTasks);
      setTaskError(`Delete failed: ${err.message}. Optimistic state reverted.`);
    });
  };

  /**
   * MONETIZATION PIPELINE (Phase 3 Requirement)
   * Triggers Stripe Checkout pipeline for subscription upgrade
   */
  const handleTriggerCheckout = async (planId) => {
    try {
      setUpgradingPlan(true);
      setUpgradeError('');
      
      const res = await paymentAPI.createCheckoutSession(planId);
      if (res.url) {
        // Direct redirect to Stripe Checkout or verified success route
        window.location.href = res.url;
      } else {
        throw new Error('No checkout URL received from gateway.');
      }
    } catch (err) {
      setUpgradeError(err.message || 'Payment pipeline failed to initialize.');
      setUpgradingPlan(false);
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
      {/* Hero Welcome & Plan Tier Banner */}
      <div className="dashboard-hero">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'rgba(13, 148, 136, 0.2)', color: '#5eead4', borderRadius: '9999px', fontSize: '11px', fontWeight: 700 }}>
                <Shield size={12} />
                <span>JWT DATA OWNERSHIP PIPELINE (P0)</span>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'rgba(56, 189, 248, 0.2)', color: '#bae6fd', borderRadius: '9999px', fontSize: '11px', fontWeight: 700 }}>
                <Sparkles size={12} />
                <span>TIER: {user?.plan || 'PRO CLINICAL'}</span>
              </div>
            </div>

            <h1 className="dashboard-hero-title">
              Welcome back, {user?.name || 'Healthcare Practitioner'}
            </h1>
            <p className="dashboard-hero-sub">
              Role: <strong style={{ color: '#fff' }}>{user?.role}</strong> • Email: <strong style={{ color: '#fff' }}>{user?.email}</strong> • User ID: <code style={{ color: '#5eead4', fontSize: '11px' }}>{decodedToken?.id}</code>
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={() => setShowUpgradeModal(true)} className="btn btn-secondary btn-sm" style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: '#fff', border: 'none' }}>
              <CreditCard size={14} /> Upgrade Plan (Stripe)
            </button>
            <button onClick={loadTasks} className="btn btn-secondary btn-sm" title="Refresh protected data">
              <RefreshCw size={14} /> Refresh Pipeline
            </button>
            <button onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm">
              <Plus size={14} /> New Clinical Task
            </button>
          </div>
        </div>
      </div>

      {/* Optimistic UI Real-time Feedback Banner */}
      {optimisticNotice && (
        <div className="alert alert-info" style={{ animation: 'fadeIn 0.3s ease' }}>
          <Zap size={18} style={{ flexShrink: 0, color: '#0284c7' }} />
          <div>{optimisticNotice}</div>
        </div>
      )}

      {/* Phase 3 Live JWT Inspector & Security Cockpit */}
      <div className="token-inspector-card">
        <div className="inspector-header">
          <div className="inspector-title">
            <Lock size={16} color="#0d9488" />
            <span>Track B Security & Architecture Cockpit: 403 Data Ownership Enforced</span>
          </div>
          {user?.role !== 'PATIENT' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Simulate Auth Interceptions:</span>
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
            <div className="inspector-item-label">Decoded userId (authorId validation)</div>
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
            <div className="inspector-item-label">Monetization Tier</div>
            <div className="inspector-item-val" style={{ color: '#0284c7' }}>
              {user?.plan || 'PRO CLINICAL'}
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

      {/* Protected Pipeline Data: Clinical Tasks (Full REST CRUD) */}
      <div className="tasks-container">
        <div className="tasks-header">
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              Protected Clinical CRUD & Data Ownership (/api/tasks)
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
              All routes (POST, GET, PUT, DELETE) validate that the document's <code>authorId</code> matches the decoded JWT <code>userId</code>. Non-owners receive <strong>403 Forbidden</strong>.
            </p>
          </div>
          <span className="badge badge-teal">
            {tasks.length} {tasks.length === 1 ? 'Task' : 'Tasks'} Owned & Loaded
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
              Create your first clinical task using the protected endpoint to verify your JWT write pipeline and ownership binding.
            </p>
            <button onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm">
              <Plus size={14} /> Add First Task
            </button>
          </div>
        ) : (
          <div className="task-list">
            {tasks.map((task) => (
              <div
                key={task.id || task._id}
                className={`task-card ${task.status === 'COMPLETED' ? 'completed' : ''}`}
              >
                <div className="task-main">
                  <input
                    type="checkbox"
                    className="task-checkbox"
                    checked={task.status === 'COMPLETED'}
                    onChange={() => handleToggleStatus(task)}
                    title="Toggle task completion status"
                  />
                  <div>
                    <div className="task-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{task.title}</span>
                    </div>
                    {task.description && (
                      <div className="task-desc">{task.description}</div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', fontSize: '11px', color: '#64748b', flexWrap: 'wrap' }}>
                      <span>Patient: <strong>{task.patientName || 'General'}</strong></span>
                      <span>•</span>
                      <span>Category: <strong>{task.category}</strong></span>
                      <span>•</span>
                      <span>authorId: <code style={{ fontSize: '10px', background: '#f1f5f9', padding: '1px 4px', borderRadius: '3px' }}>{(task.authorId || task.userId)?.substring(0, 8)}...</code></span>
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

                  {/* REST Action Buttons: View, Edit, Optimistic Delete */}
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => handleInspectTask(task.id || task._id)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '6px 8px', color: '#64748b' }}
                      title="Inspect task (GET /api/tasks/:id)"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(task)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '6px 8px', color: '#64748b' }}
                      title="Edit task (PUT /api/tasks/:id)"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteTaskOptimistic(task.id || task._id)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '6px 8px', color: '#ef4444' }}
                      title="Optimistic Delete (DELETE /api/tasks/:id)"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE TASK MODAL (POST /api/tasks) */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                Add Clinical Task (POST /api/tasks)
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
                  {submittingTask ? 'Creating...' : 'Create Owned Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TASK MODAL (PUT /api/tasks/:id) */}
      {showEditModal && selectedTask && (
        <div className="modal-backdrop" onClick={() => setShowEditModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                Edit Clinical Task (PUT /api/tasks/:id)
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="form-group">
                <label className="form-label">Task Title</label>
                <input
                  type="text"
                  className="form-input"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Patient Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={editFormData.patientName}
                  onChange={(e) => setEditFormData({ ...editFormData, patientName: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-input"
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  >
                    <option value="PENDING">Pending</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select
                    className="form-input"
                    value={editFormData.priority}
                    onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value })}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-input"
                    value={editFormData.category}
                    onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                  >
                    <option value="CLINICAL">Clinical</option>
                    <option value="TRIAGE">Triage</option>
                    <option value="PRESCRIPTION">Prescription</option>
                    <option value="FOLLOW_UP">Follow Up</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingTask}
                >
                  {submittingTask ? 'Saving...' : 'Save Updates (PUT)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW / INSPECT TASK MODAL (GET /api/tasks/:id) */}
      {showViewModal && selectedTask && (
        <div className="modal-backdrop" onClick={() => setShowViewModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} color="#0d9488" />
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Task Inspection (GET /api/tasks/:id)
                </h3>
              </div>
              <button
                onClick={() => setShowViewModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}
              >
                &times;
              </button>
            </div>

            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Task Title</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>{selectedTask.title}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px', marginBottom: '16px' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block' }}>Document authorId:</span>
                <code style={{ fontSize: '11px', color: '#0d9488' }}>{selectedTask.authorId || selectedTask.userId}</code>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block' }}>Decoded JWT userId:</span>
                <code style={{ fontSize: '11px', color: '#0d9488' }}>{decodedToken?.id}</code>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block' }}>Patient:</span>
                <strong>{selectedTask.patientName || 'General'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block' }}>Priority / Status:</span>
                <span>{selectedTask.priority} • {selectedTask.status}</span>
              </div>
            </div>

            {selectedTask.description && (
              <div style={{ marginBottom: '20px' }}>
                <span style={{ color: '#64748b', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Clinical Description:</span>
                <p style={{ fontSize: '13px', color: '#334155', background: '#ffffff', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  {selectedTask.description}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowViewModal(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setShowViewModal(false);
                  handleOpenEdit(selectedTask);
                }}
              >
                Edit Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STRIPE MONETIZATION / UPGRADE MODAL (Phase 3 Requirement) */}
      {showUpgradeModal && (
        <div className="modal-backdrop" onClick={() => setShowUpgradeModal(false)}>
          <div className="modal-dialog" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={20} color="#0284c7" />
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Upgrade Clinical Tier (Stripe Test Mode)
                </h3>
              </div>
              <button
                onClick={() => setShowUpgradeModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}
              >
                &times;
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
              Select a tier below to initialize a Stripe Checkout session. In test mode, this securely executes the payment pipeline and redirects to a verified success route.
            </p>

            {upgradeError && (
              <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
                <AlertTriangle size={16} />
                <div>{upgradeError}</div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              {/* Pro Plan */}
              <div style={{
                border: '2px solid #0d9488',
                borderRadius: '12px',
                padding: '20px',
                background: '#f0fdfa',
                position: 'relative'
              }}>
                <span className="badge badge-teal" style={{ position: 'absolute', top: '12px', right: '12px' }}>
                  Recommended
                </span>
                <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
                  Pro Clinical Tier
                </h4>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#0d9488', marginBottom: '12px' }}>
                  $29 <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748b' }}>/ month</span>
                </div>
                <ul style={{ fontSize: '12px', color: '#475569', paddingLeft: '16px', marginBottom: '20px', lineHeight: '1.6' }}>
                  <li>Unlimited clinical tasks</li>
                  <li>Real-time JWT interceptors</li>
                  <li>Priority triage queue</li>
                  <li>Continuous prescription sync</li>
                </ul>
                <button
                  onClick={() => handleTriggerCheckout('PRO')}
                  disabled={upgradingPlan}
                  className="btn btn-primary btn-block"
                >
                  {upgradingPlan ? 'Connecting...' : 'Upgrade to Pro'}
                </button>
              </div>

              {/* Enterprise Plan */}
              <div style={{
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                padding: '20px',
                background: '#ffffff'
              }}>
                <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
                  Enterprise Plan
                </h4>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#0284c7', marginBottom: '12px' }}>
                  $99 <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748b' }}>/ month</span>
                </div>
                <ul style={{ fontSize: '12px', color: '#475569', paddingLeft: '16px', marginBottom: '20px', lineHeight: '1.6' }}>
                  <li>Everything in Pro Tier</li>
                  <li>Multi-hospital clustering</li>
                  <li>HIPAA audit logs & exports</li>
                  <li>Dedicated 24/7 Clinical SLA</li>
                </ul>
                <button
                  onClick={() => handleTriggerCheckout('ENTERPRISE')}
                  disabled={upgradingPlan}
                  className="btn btn-secondary btn-block"
                  style={{ background: '#0284c7', color: '#ffffff', border: 'none' }}
                >
                  {upgradingPlan ? 'Connecting...' : 'Enterprise Plan'}
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'center', fontSize: '11px', color: '#94a3b8' }}>
              🔒 Powered by Stripe Checkout Pipeline • Test Mode Sandboxed • Zero Live Card Required
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
