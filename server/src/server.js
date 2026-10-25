const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = require('./app');
const { connectDB } = require('./config/db');
const User = require('./models/User');

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  try {
    // 1. Establish database connection (with resilient in-memory fallback)
    await connectDB();

    // 2. Pre-seed default demo accounts if database is empty
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('[Seed] Seeding initial demonstration clinical accounts...');
      await User.create([
        {
          name: 'Rajesh Patel',
          email: 'rajesh.patel@example.com',
          password: 'Password123!',
          role: 'PATIENT'
        },
        {
          name: 'Dr. Priya Sharma',
          email: 'dr.priya.sharma@vitalsync.health',
          password: 'Password123!',
          role: 'DOCTOR'
        },
        {
          name: 'Ananya Sen (RN)',
          email: 'ananya.sen@vitalsync.health',
          password: 'Password123!',
          role: 'STAFF'
        },
        {
          name: 'Victoria Sterling',
          email: 'admin@vitalsync.health',
          password: 'Password123!',
          role: 'ADMIN'
        }
      ]);
      console.log('[Seed] Initial clinical accounts seeded successfully.');
    }

    // 3. Start listening
    const server = app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`VitalSync Secure Auth Backend operational on port ${PORT}`);
      console.log(`Base URL: http://localhost:${PORT}/api`);
      console.log(`Health Check: http://localhost:${PORT}/api/health`);
      console.log(`Auth Endpoints: /api/auth/register, /api/auth/login, /api/auth/me`);
      console.log(`Protected Tasks: /api/tasks (requires Bearer JWT)`);
      console.log(`====================================================`);
    });

    return server;
  } catch (error) {
    console.error('Failed to bootstrap server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  bootstrap();
}

module.exports = { bootstrap };
