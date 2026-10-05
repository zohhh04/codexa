const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config/env');
const { errorHandler, notFound } = require('./middleware/errors');
const healthRoutes = require('./routes/health');
const compilerRoutes = require('./routes/compiler');
const runRoutes = require('./routes/run');
const aiRoutes = require('./routes/ai');
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const historyRoutes = require('./routes/history');
const practiceRoutes = require('./routes/practice');
const dashboardRoutes = require('./routes/dashboard');
const toolchainRoutes = require('./routes/toolchain');

function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.clientUrl }));
  app.use(express.json({ limit: '256kb' }));
  app.use(morgan('dev'));

  // Phase 1 health check.
  app.use('/api', healthRoutes);
  // Phase 3–5 compiler pipeline.
  app.use('/api/compiler', compilerRoutes);
  // Phase 6 sandboxed compile + run.
  app.use('/api', runRoutes);
  // Phase 7 AI explain/fix/tutor.
  app.use('/api/ai', aiRoutes);
  // Phase 9 auth, projects, history.
  app.use('/api', authRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/history', historyRoutes);
  app.use('/api/practice', practiceRoutes);
  // Dashboard stats, toolchain status.
  app.use('/api', dashboardRoutes);
  app.use('/api', toolchainRoutes);

  app.use('/api', notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
