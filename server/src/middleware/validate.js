const { z } = require('zod');

/**
 * Validation Middleware using Zod (Phase 1: Schema Validation)
 * Validates incoming req.body payloads against strict schemas before interfacing with MongoDB.
 */
function validateBody(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error.name === 'ZodError' || error.issues) {
        const issuesList = error.issues || error.errors || [];
        const issues = issuesList.map(err => ({
          field: err.path ? err.path.join('.') : '',
          message: err.message
        }));

        return res.status(400).json({
          success: false,
          code: 'VALIDATION_ERROR',
          message: `Validation failed: ${issues.map(i => i.message).join(', ')}`,
          errors: issues
        });
      }

      return res.status(400).json({
        success: false,
        code: 'BAD_REQUEST',
        message: error.message || 'Invalid request payload format.'
      });
    }
  };
}

// ==========================================
// Zod Schemas for Authentication
// ==========================================
const registerSchema = z.object({
  name: z.string({ required_error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters long')
    .max(100, 'Name cannot exceed 100 characters'),
  email: z.string({ required_error: 'Email is required' })
    .trim()
    .email('Please provide a valid email address'),
  password: z.string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters long'),
  role: z.enum(['PATIENT', 'DOCTOR', 'STAFF', 'ADMIN'], {
    errorMap: () => ({ message: 'Role must be PATIENT, DOCTOR, STAFF, or ADMIN' })
  }).optional()
});

const loginSchema = z.object({
  email: z.string({ required_error: 'Email is required' })
    .trim()
    .email('Please provide a valid email address'),
  password: z.string({ required_error: 'Password is required' })
    .min(1, 'Password cannot be empty')
});

// ==========================================
// Zod Schemas for Tasks (Clinical CRUD)
// ==========================================
const createTaskSchema = z.object({
  title: z.string({ required_error: 'Task title is required' })
    .trim()
    .min(1, 'Task title cannot be empty')
    .max(200, 'Title cannot exceed 200 characters'),
  description: z.string().trim().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  category: z.enum(['CLINICAL', 'TRIAGE', 'PRESCRIPTION', 'SCHEDULING', 'FOLLOW_UP', 'ADMIN']).optional(),
  patientName: z.string().trim().optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  dueDate: z.string().or(z.date()).optional()
});

const updateTaskSchema = z.object({
  title: z.string().trim().min(1, 'Title cannot be empty').max(200).optional(),
  description: z.string().trim().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  category: z.enum(['CLINICAL', 'TRIAGE', 'PRESCRIPTION', 'SCHEDULING', 'FOLLOW_UP', 'ADMIN']).optional(),
  patientName: z.string().trim().optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  dueDate: z.string().or(z.date()).optional()
});

// ==========================================
// Zod Schema for AI Microservice
// ==========================================
const aiSuggestSchema = z.object({
  prompt: z.string({ required_error: 'Prompt or clinical context is required' })
    .trim()
    .min(3, 'Prompt must be at least 3 characters long')
    .max(2000, 'Prompt cannot exceed 2000 characters'),
  context: z.string().trim().max(1000).optional(),
  category: z.enum(['DIAGNOSIS', 'PRESCRIPTION', 'TRIAGE', 'GENERAL', 'FOLLOW_UP']).optional()
});

module.exports = {
  validateBody,
  registerSchema,
  loginSchema,
  createTaskSchema,
  updateTaskSchema,
  aiSuggestSchema
};
