const { Router } = require('express');
const { ok, fail } = require('../utils/response');
const { getToolchainStatus } = require('../services/compiler/toolchain');

const router = Router();

// GET /api/toolchain/status — which languages can execute on this machine.
router.get('/toolchain/status', async (req, res) => {
  try {
    const status = await getToolchainStatus();
    return ok(res, status);
  } catch (err) {
    return fail(res, `Toolchain check failed: ${err.message}`, 500);
  }
});

module.exports = router;
