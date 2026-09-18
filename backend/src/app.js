const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config/env');
const { errorHandler, notFound } = require('./middleware/errors');
const healthRoutes = require('./routes/health');
const compilerRoutes = require('./routes/compiler');

function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.clientUrl }));
  app.use(express.json({ limit: '256kb' }));
  app.use(morgan('dev'));

  // Phase 3 adds the compiler router (tokens today; ast/tac/run later).
  app.use('/api', healthRoutes);
  app.use('/api/compiler', compilerRoutes);

  app.use('/api', notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
