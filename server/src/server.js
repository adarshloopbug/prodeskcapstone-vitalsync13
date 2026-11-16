const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = require('./app');
const { connectDB } = require('./config/db');

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  try {
    // 1. Establish database connection
    await connectDB();

    // 2. Start server without logging leaks in production
    const server = app.listen(PORT);
    return server;
  } catch (error) {
    process.exit(1);
  }
}

if (require.main === module) {
  bootstrap();
}

module.exports = app;
module.exports.bootstrap = bootstrap;
