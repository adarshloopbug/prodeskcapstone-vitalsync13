const express = require('express');
const mongoose = require('mongoose');
const Task = require('../models/Task');
const { verifyToken } = require('../middleware/authMiddleware');
const { validateBody, createTaskSchema, updateTaskSchema } = require('../middleware/validate');

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
router.get('/', async (req, res, next) => {
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
    return res.status(500).json({
      success: false,
      code: 'TASK_FETCH_ERROR',
      message: 'Failed to retrieve tasks.'
    });
  }
});

/**
 * @route   GET /api/tasks/:id
 * @desc    Retrieve a single task by ID with strict ownership validation (P0)
 * @access  Protected (Requires Bearer JWT)
 */
router.get('/:id', async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_ID_FORMAT',
        message: 'Invalid task ID format.'
      });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        code: 'NOT_FOUND',
        message: 'Task not found.'
      });
    }

    // Critical Ownership Validation:
    // Compare document authorId against decoded userId extracted from JWT token.
    // Reject unauthorized attempts with 403 Forbidden.
    const authorId = getDocumentAuthorId(task);
    const currentUserId = req.user.id.toString();

    if (authorId !== currentUserId) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Forbidden: You do not own this resource. Access denied.'
      });
    }

    return res.status(200).json({
      success: true,
      task
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      code: 'TASK_RETRIEVAL_ERROR',
      message: 'Failed to retrieve task.'
    });
  }
});

/**
 * @route   POST /api/tasks
 * @desc    Create a new clinical task with Zod schema validation (Phase 1)
 * @access  Protected (Requires Bearer JWT)
 */
router.post('/', validateBody(createTaskSchema), async (req, res, next) => {
  try {
    const { title, description, priority, category, patientName, dueDate, status } = req.body;
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
    return res.status(500).json({
      success: false,
      code: 'TASK_CREATION_FAILED',
      message: error.message || 'Failed to create task.'
    });
  }
});

/**
 * @route   PUT /api/tasks/:id
 * @desc    Update task details with Zod schema validation and ownership check (Phase 1)
 * @access  Protected (Requires Bearer JWT)
 */
router.put('/:id', validateBody(updateTaskSchema), async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_ID_FORMAT',
        message: 'Invalid task ID format.'
      });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        code: 'NOT_FOUND',
        message: 'Task not found.'
      });
    }

    // Critical Ownership Validation:
    const authorId = getDocumentAuthorId(task);
    const currentUserId = req.user.id.toString();

    if (authorId !== currentUserId) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
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
    return res.status(500).json({
      success: false,
      code: 'TASK_UPDATE_FAILED',
      message: error.message || 'Failed to update task.'
    });
  }
});

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Delete a task with ownership enforcement (Phase 1)
 * @access  Protected (Requires Bearer JWT)
 */
router.delete('/:id', async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_ID_FORMAT',
        message: 'Invalid task ID format.'
      });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        code: 'NOT_FOUND',
        message: 'Task not found.'
      });
    }

    // Critical Ownership Validation:
    const authorId = getDocumentAuthorId(task);
    const currentUserId = req.user.id.toString();

    if (authorId !== currentUserId) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
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
    return res.status(500).json({
      success: false,
      code: 'TASK_DELETION_FAILED',
      message: error.message || 'Failed to delete task.'
    });
  }
});

module.exports = router;
