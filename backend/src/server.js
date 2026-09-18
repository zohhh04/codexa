const { createApp } = require('./app');
const config = require('./config/env');

const app = createApp();

app.listen(config.port, () => {
  console.log(`[codexa] server listening on http://localhost:${config.port} (${config.nodeEnv})`);
});
