import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { tasksAPI, paymentAPI, aiAPI, parseJwt } from '../services/api';
import {
  Shield,
  Plus,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Lock,
  Layers,
  CreditCard,
  Sparkles,
  Edit3,
  Eye,
  CheckCircle2,
  Zap,
  Bot,
  Send,
  Stethoscope,
  ClipboardList,
  CheckCircle,
  HelpCircle,
  ArrowRight
} from 'lucide-react';

export default function DashboardPage() {
  const { user, token, logout } = useAuth();
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

  // New task form state (Clean - zero preseeded defaults)
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('CLINICAL');
  const [newTaskPriority, setNewTaskPriority] = useState('MEDIUM');
  const [newTaskPatient, setNewTaskPatient] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [submittingTask, setSubmittingTask] = useState(false);

  // AI Microservice State (Phase 2)
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiCategory, setAiCategory] = useState('DIAGNOSIS');
  const [aiContext, setAiContext] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  // Payment / Upgrade state
  const [upgradingPlan, setUpgradingPlan] = useState(false);
  const [upgradeError, setUpgradeError] = useState('');

  // Decoded JWT inspection
  const decodedToken = parseJwt(token);

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

  // Handle task creation (POST /api/tasks with Zod schema validation)
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      setSubmittingTask(true);
      await tasksAPI.create({
        title: newTaskTitle.trim(),
        category: newTaskCategory,
        priority: newTaskPriority,
        patientName: newTaskPatient.trim() || 'General',
        description: newTaskDescription.trim()
      });

      // Reset form & reload
      setNewTaskTitle('');
      setNewTaskPatient('');
      setNewTaskDescription('');
      setShowAddModal(false);
      await loadTasks();
    } catch (err) {
      setTaskError(err.message || 'Error creating task');
    } finally {
      setSubmittingTask(false);
    }
  };

  // Inspect Task Details (GET /api/tasks/:id) - Ownership Verified
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

  // Save Task Update (PUT /api/tasks/:id)
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;

    try {
      setSubmittingTask(true);
      const res = await tasksAPI.update(selectedTask.id || selectedTask._id, editFormData);
      
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
      setTasks(prev => prev.map(t => (t.id === taskId || t._id === taskId) ? { ...t, status: nextStatus } : t));
      await tasksAPI.update(taskId, { status: nextStatus });
    } catch (err) {
      await loadTasks();
    }
  };

  // Optimistic UI Deletion (Phase 2 Requirement)
  const handleDeleteTaskOptimistic = (id) => {
    const previousTasks = [...tasks];

    // Instantly filter object out of DOM array using state setter (Zero Delay)
    setTasks(prev => prev.filter(t => (t.id || t._id) !== id));
    
    setOptimisticNotice(`⚡ Optimistic UI: Task filtered from DOM instantly. Resolving DELETE /api/tasks/${id} asynchronously in background...`);
    setTimeout(() => setOptimisticNotice(''), 4500);

    // Asynchronous API call resolves in the background without blocking the UI
    tasksAPI.delete(id).catch(err => {
      setTasks(previousTasks); // Rollback on error
      setTaskError(`Delete failed: ${err.message}. Optimistic state reverted.`);
    });
  };

  // Phase 2: Execute Server-Side AI Microservice
  const handleExecuteAI = async (e) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    try {
      setAiLoading(true);
      setAiError('');
      setAiResult(null);

      const response = await aiAPI.suggest({
        prompt: aiPrompt.trim(),
        context: aiContext.trim() || undefined,
        category: aiCategory
      });

      if (response.success && response.data) {
        setAiResult(response.data);
      } else {
        throw new Error(response.message || 'No AI suggestion returned');
      }
    } catch (err) {
      setAiError(err.message || 'AI microservice request failed. Please check rate limit or input format.');
    } finally {
      setAiLoading(false);
    }
  };

  // Convert AI Recommendation into a Clinical Task with one click
  const handleCreateTaskFromAI = () => {
    if (!aiResult) return;
    setNewTaskTitle(`Clinical Follow-up: ${aiResult.category}`);
    setNewTaskDescription(`${aiResult.suggestion}\n\nKey Actions:\n${(aiResult.recommendations || []).map(r => `• ${r}`).join('\n')}`);
    setNewTaskCategory('CLINICAL');
    setNewTaskPriority('HIGH');
    setShowAddModal(true);
  };

  // Monetization Checkout Trigger
  const handleTriggerCheckout = async (planId) => {
    try {
      setUpgradingPlan(true);
      setUpgradeError('');
      
      const res = await paymentAPI.createCheckoutSession(planId);
      if (res.url) {
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

  return (
    <div className="dashboard-viewport">
      {/* Clean Modern Header Banner */}
      <div className="dashboard-hero">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'rgba(13, 148, 136, 0.2)', color: '#5eead4', borderRadius: '9999px', fontSize: '11px', fontWeight: 700 }}>
                <Shield size={12} />
                <span>JWT OWNERSHIP ENFORCED</span>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'rgba(56, 189, 248, 0.2)', color: '#bae6fd', borderRadius: '9999px', fontSize: '11px', fontWeight: 700 }}>
                <Bot size={12} />
                <span>SERVER-SIDE AI ACTIVE</span>
              </div>
            </div>

            <h1 className="dashboard-hero-title">
              {user?.name || 'Healthcare Practitioner Workspace'}
            </h1>
            <p className="dashboard-hero-sub">
              Role: <strong style={{ color: '#fff' }}>{user?.role || 'DOCTOR'}</strong> • Email: <strong style={{ color: '#fff' }}>{user?.email}</strong> • User ID: <code style={{ color: '#5eead4', fontSize: '11px' }}>{decodedToken?.id}</code>
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={() => setShowUpgradeModal(true)} className="btn btn-secondary btn-sm" style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: '#fff', border: 'none' }}>
              <CreditCard size={14} /> Upgrade Plan (Stripe)
            </button>
            <button onClick={loadTasks} className="btn btn-secondary btn-sm" title="Refresh tasks">
              <RefreshCw size={14} /> Refresh
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

      {/* Phase 2: Dedicated Server-Side AI Clinical Microservice Panel */}
      <div className="tasks-container" style={{ marginBottom: '24px', borderLeft: '4px solid #0d9488' }}>
        <div className="tasks-header" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(13, 148, 136, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0d9488' }}>
              <Bot size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Server-Side AI Clinical Decision Support
              </h2>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>
                Secure server-side LLM execution utilizing <code>POST /api/ai/suggest</code>. Protected against DDoS with rate limits & zero client key exposure.
              </p>
            </div>
          </div>
          <span className="badge badge-teal" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={11} /> Google Gemini AI
          </span>
        </div>

        {aiError && (
          <div className="alert alert-danger" style={{ marginBottom: '14px' }}>
            <AlertTriangle size={16} />
            <div>{aiError}</div>
          </div>
        )}

        <form onSubmit={handleExecuteAI}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label className="form-label">Clinical Scenario / Symptoms / Case Notes</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 58yo patient with acute ST-segment elevation on V2-V4 telemetry..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="form-label">Clinical Category</label>
              <select
                className="form-input"
                value={aiCategory}
                onChange={(e) => setAiCategory(e.target.value)}
              >
                <option value="DIAGNOSIS">Diagnosis & ECG</option>
                <option value="PRESCRIPTION">Prescription & Interaction</option>
                <option value="TRIAGE">Triage & Vitals</option>
                <option value="FOLLOW_UP">Follow-up Protocol</option>
                <option value="GENERAL">General Clinical Support</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={aiLoading || !aiPrompt.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {aiLoading ? (
                <>Processing Server-Side LLM...</>
              ) : (
                <>
                  <Send size={13} />
                  <span>Analyze with Gemini AI</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* AI Output Card */}
        {aiResult && (
          <div style={{ marginTop: '16px', background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={16} color="#059669" />
                <strong style={{ fontSize: '13px', color: '#0f172a' }}>
                  Clinical Decision Recommendation ({aiResult.category})
                </strong>
              </div>
              <button
                type="button"
                onClick={handleCreateTaskFromAI}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '11px', padding: '4px 8px' }}
              >
                + Add as Clinical Task
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#334155', lineHeight: '1.6', marginBottom: '12px', background: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              {aiResult.suggestion}
            </p>

            {aiResult.recommendations && aiResult.recommendations.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '6px' }}>
                  Recommended Action Protocol:
                </span>
                <ul style={{ fontSize: '12px', color: '#475569', paddingLeft: '18px', margin: 0, lineHeight: '1.6' }}>
                  {aiResult.recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic', borderTop: '1px solid #e2e8f0', paddingTop: '8px', marginTop: '8px' }}>
              ⚠️ {aiResult.disclaimer} • Generated via {aiResult.model || 'Gemini'} at {new Date(aiResult.timestamp).toLocaleTimeString()}
            </div>
          </div>
        )}
      </div>

      {/* Primary Clinical Tasks Table (Full REST CRUD + 403 Data Ownership) */}
      <div className="tasks-container">
        <div className="tasks-header">
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              Clinical Follow-ups & Tasks (/api/tasks)
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
              Protected with Zod schema validation (Phase 1) and 403 Forbidden ownership boundaries.
            </p>
          </div>
          <span className="badge badge-teal">
            {tasks.length} {tasks.length === 1 ? 'Task' : 'Tasks'} Owned
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
            <p style={{ fontSize: '13px' }}>Loading protected tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#64748b', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
            <ClipboardList size={36} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#334155' }}>No Tasks Recorded</h3>
            <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '400px', margin: '4px auto 16px' }}>
              Create your first clinical task or generate one using the AI Clinical Decision Support panel above.
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

                  {/* REST Actions: View, Edit, Optimistic Delete */}
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

      {/* CREATE TASK MODAL */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                Add Clinical Task (Zod Validated)
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
                  placeholder="e.g. Verify Metformin dosage with pharmacy"
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
                  placeholder="e.g. John Doe"
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
                  placeholder="Additional context or notes..."
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
                  {submittingTask ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TASK MODAL */}
      {showEditModal && selectedTask && (
        <div className="modal-backdrop" onClick={() => setShowEditModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                Edit Clinical Task
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
                  {submittingTask ? 'Saving...' : 'Save Updates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW / INSPECT TASK MODAL */}
      {showViewModal && selectedTask && (
        <div className="modal-backdrop" onClick={() => setShowViewModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Task Details (Ownership Verified)
              </h3>
              <button
                onClick={() => setShowViewModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}
              >
                &times;
              </button>
            </div>

            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Title</div>
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
                <span style={{ color: '#64748b', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Clinical Notes:</span>
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
            </div>
          </div>
        </div>
      )}

      {/* STRIPE UPGRADE MODAL */}
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
                  <li>Gemini AI decision support</li>
                  <li>Real-time JWT interceptors</li>
                  <li>Automated rate throttling</li>
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
                  <li>Multi-facility clustering</li>
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
          </div>
        </div>
      )}
    </div>
  );
}
