const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Schema Definition
 * Fulfills Phase 1 Data Modeling and Security Standards.
 * Includes email, password, and name, plus role support aligned with VitalSync EHR specifications.
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address'
      ]
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false // Avoid accidental exposure in standard query results
    },
    role: {
      type: String,
      enum: {
        values: ['PATIENT', 'DOCTOR', 'STAFF', 'ADMIN'],
        message: '{VALUE} is not a valid role'
      },
      default: 'PATIENT'
    }
  },
  {
    timestamps: true
  }
);

/**
 * Mongoose Pre-Save Hook for Cryptographic Security:
 * Hashes and salts the plain-text password using bcryptjs before persisting to MongoDB.
 * Ensures plain-text passwords NEVER reach the database.
 */
userSchema.pre('save', async function (next) {
  // Only salt and hash if the password field has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Instance method to compare candidate password against hashed password in database
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) {
    throw new Error('Password hash not loaded in user document for comparison');
  }
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Clean JSON output: strips password and internal versioning
 */
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.password;
    delete ret.__v;
    return ret;
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
