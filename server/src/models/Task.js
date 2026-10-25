const mongoose = require('mongoose');

/**
 * Task Schema Definition
 * Represents clinical tasks / follow-ups protected by JWT authentication middleware.
 */
const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM'
    },
    status: {
      type: String,
      enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
      default: 'PENDING'
    },
    category: {
      type: String,
      enum: ['CLINICAL', 'TRIAGE', 'PRESCRIPTION', 'SCHEDULING', 'FOLLOW_UP', 'ADMIN'],
      default: 'CLINICAL'
    },
    patientName: {
      type: String,
      trim: true,
      default: 'General'
    },
    dueDate: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // Default 24h from now
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Task must belong to an authenticated user']
    }
  },
  {
    timestamps: true
  }
);

taskSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
