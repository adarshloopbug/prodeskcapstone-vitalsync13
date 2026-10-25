const express = require('express');
const mongoose = require('mongoose');
const Task = require('../models/Task');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply verifyToken middleware across ALL task routes:
// Unauthenticated requests or expired tokens are immediately intercepted and rejected with 401.
router.use(verifyToken);

/**
 * Helper to validate MongoDB ObjectId format
 */
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * Helper to extract authorId string from task document
 */
function getDocumentAuthorId(task) {
  if (task.authorId) return task.authorId.toString();
  if (task.userId) return task.userId.toString();
  return null;
}

/**
 * @route   GET /api/tasks
 * @desc    Retrieve all clinical tasks owned by the authenticated user
 * @access  Protected (Requires Bearer JWT)
 */
router.get('/', async (req, res) => {
  try {
    const currentUserId = req.user.id.toString();
    const tasks = await Task.find({
      $or: [{ authorId: currentUserId }, { userId: currentUserId }]
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: tasks.length,
      tasks
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve tasks.'
    });
  }
});

/**
 * @route   GET /api/tasks/:id
 * @desc    Retrieve a single task by ID with strict ownership validation (P0)
 * @access  Protected (Requires Bearer JWT)
 */
router.get('/:id', async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID format.'
      });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.'
      });
    }

    // Critical Ownership Validation (P0):
    // Compare the document's authorId against the decoded userId extracted from the JWT token.
    // Reject unauthorized attempts with a 403 Forbidden status.
    const authorId = getDocumentAuthorId(task);
    const currentUserId = req.user.id.toString();

    if (authorId !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not own this resource. Access denied.'
      });
    }

    return res.status(200).json({
      success: true,
      task
    });
  } catch (error) {
    console.error('Error retrieving task:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve task.'
    });
  }
});

/**
 * @route   POST /api/tasks
 * @desc    Create a new clinical task owned by the authenticated user
 * @access  Protected (Requires Bearer JWT)
 */
router.post('/', async (req, res) => {
  try {
    const { title, description, priority, category, patientName, dueDate, status } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Task title is required.'
      });
    }

    const currentUserId = req.user.id;

    const task = new Task({
      title: title.trim(),
      description: description ? description.trim() : '',
      priority: priority || 'MEDIUM',
      category: category || 'CLINICAL',
      status: status || 'PENDING',
      patientName: patientName ? patientName.trim() : 'General',
      dueDate: dueDate || undefined,
      authorId: currentUserId,
      userId: currentUserId
    });

    await task.save();

    return res.status(201).json({
      success: true,
      message: 'Clinical task created successfully.',
      task
    });
  } catch (error) {
    console.error('Error creating task:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create task.'
    });
  }
});

/**
 * @route   PUT /api/tasks/:id
 * @desc    Update task details (Owner-restricted with 403 Forbidden enforcement)
 * @access  Protected (Requires Bearer JWT)
 */
router.put('/:id', async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID format.'
      });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.'
      });
    }

    // Critical Ownership Validation (P0):
    // Compare the document's authorId against the decoded userId extracted from the JWT token.
    // Reject unauthorized attempts with a 403 Forbidden status.
    const authorId = getDocumentAuthorId(task);
    const currentUserId = req.user.id.toString();

    if (authorId !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not own this resource. Update denied.'
      });
    }

    const { title, description, status, priority, category, patientName, dueDate } = req.body;

    if (title !== undefined) task.title = title.trim();
    if (description !== undefined) task.description = description.trim();
    if (status !== undefined) task.status = status;
    if (priority !== undefined) task.priority = priority;
    if (category !== undefined) task.category = category;
    if (patientName !== undefined) task.patientName = patientName.trim();
    if (dueDate !== undefined) task.dueDate = dueDate;

    await task.save();

    return res.status(200).json({
      success: true,
      message: 'Task updated successfully.',
      task
    });
  } catch (error) {
    console.error('Error updating task:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update task.'
    });
  }
});

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Delete a task (Owner-restricted with 403 Forbidden enforcement)
 * @access  Protected (Requires Bearer JWT)
 */
router.delete('/:id', async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID format.'
      });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.'
      });
    }

    // Critical Ownership Validation (P0):
    // Compare the document's authorId against the decoded userId extracted from the JWT token.
    // Reject unauthorized attempts with a 403 Forbidden status.
    const authorId = getDocumentAuthorId(task);
    const currentUserId = req.user.id.toString();

    if (authorId !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not own this resource. Deletion denied.'
      });
    }

    await task.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Task deleted successfully.',
      id: req.params.id
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete task.'
    });
  }
});

module.exports = router;
