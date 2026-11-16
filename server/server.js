/**
 * VitalSync Cloud Boot Entrypoint (Render / Railway / Fly.io)
 * Fulfills Phase 1 (P0): "Ensure your package.json contains a valid 'start': 'node server.js' script"
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = require('./src/app');
const { connectDB } = require('./src/config/db');

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  try {
    await connectDB();
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
