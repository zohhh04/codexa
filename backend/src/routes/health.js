const { Router } = require('express');
const { ok } = require('../utils/response');

const router = Router();

// GET /api/health — liveness probe used by the frontend + tests.
router.get('/health', (req, res) =>
  ok(res, {
    status: 'up',
    service: 'codexa-backend',
    version: '0.1.0',
    phase: 1,
    time: new Date().toISOString(),
  }),
);

module.exports = router;
