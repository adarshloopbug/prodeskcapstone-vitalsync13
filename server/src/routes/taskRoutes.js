const express = require('express');
const Task = require('../models/Task');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply verifyToken middleware across ALL task routes:
// Unauthenticated requests or expired tokens are immediately intercepted and rejected with 401.
router.use(verifyToken);

/**
 * @route   GET /api/tasks
 * @desc    Retrieve all clinical tasks belonging to the authenticated user
 * @access  Protected
 */
router.get('/', async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user.id }).sort({ createdAt: -1 });

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
 * @route   POST /api/tasks
 * @desc    Create a new clinical task for the authenticated user
 * @access  Protected
 */
router.post('/', async (req, res) => {
  try {
    const { title, description, priority, category, patientName, dueDate } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Task title is required.'
      });
    }

    const task = new Task({
      title: title.trim(),
      description: description ? description.trim() : '',
      priority: priority || 'MEDIUM',
      category: category || 'CLINICAL',
      patientName: patientName ? patientName.trim() : 'General',
      dueDate: dueDate || undefined,
      userId: req.user.id
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
 * @desc    Update task status or details (owner-restricted)
 * @access  Protected
 */
router.put('/:id', async (req, res) => {
  try {
    const { title, description, status, priority, category } = req.body;

    const task = await Task.findOne({ _id: req.params.id, userId: req.user.id });
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found or access denied.'
      });
    }

    if (title !== undefined) task.title = title.trim();
    if (description !== undefined) task.description = description.trim();
    if (status !== undefined) task.status = status;
    if (priority !== undefined) task.priority = priority;
    if (category !== undefined) task.category = category;

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
      message: 'Failed to update task.'
    });
  }
});

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Delete a task (owner-restricted)
 * @access  Protected
 */
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found or access denied.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Task deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete task.'
    });
  }
});

module.exports = router;
