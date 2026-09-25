const { createApp } = require('./app');
const config = require('./config/env');
const { connectDB } = require('./config/db');

async function main() {
  await connectDB(config.mongodbUri);

  const app = createApp();
  app.listen(config.port, () => {
    console.log(`[codexa] server listening on http://localhost:${config.port} (${config.nodeEnv})`);
  });
}

main().catch((err) => {
  console.error('[codexa] server failed to start:', err.message);
  process.exit(1);
});
