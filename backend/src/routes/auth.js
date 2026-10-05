const bcrypt = require('bcrypt');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { z } = require('zod');
const config = require('../config/env');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { normalizeEmail } = require('../utils/normalizeEmail');

const router = express.Router();

// In-memory fallback so login/register work without MongoDB running.
// Used only when mongoose is disconnected or the DB operation fails.
const memoryUsers = new Map(); // email -> { id, name, email, passwordHash, createdAt }
function dbReady() {
  try {
    return mongoose.connection && mongoose.connection.readyState === 1;
  } catch {
    return false;
  }
}

const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.preprocess((value) => normalizeEmail(value), z.string().email()),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.preprocess((value) => normalizeEmail(value), z.string().email()),
  password: z.string().min(1),
});

function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email, name: user.name },
    config.jwtSecret,
    { expiresIn: '7d' },
  );
}

router.post('/auth/register', async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.issues },
      });
    }

    const { name, email, password } = parsed.data;
    const normalizedEmail = normalizeEmail(email);

    // Try MongoDB first; fall back to memory store when DB is down.
    if (dbReady()) {
      try {
        const existing = await User.findOne({ email: normalizedEmail });
        if (existing) {
          return res.status(409).json({
            success: false,
            error: { code: 'EMAIL_TAKEN', message: 'An account with this email already exists' },
          });
        }
        const passwordHash = await User.hashPassword(password);
        const user = await User.create({ name, email: normalizedEmail, passwordHash });
        const token = signToken(user);
        return res.status(201).json({
          success: true,
          data: { token, user: { id: user._id, name: user.name, email: user.email } },
        });
      } catch (err) {
        if (memoryUsers.has(normalizedEmail)) {
          return res.status(409).json({
            success: false,
            error: { code: 'EMAIL_TAKEN', message: 'An account with this email already exists' },
          });
        }
        // fall through to memory store
      }
    }

    if (memoryUsers.has(normalizedEmail)) {
      return res.status(409).json({
        success: false,
        error: { code: 'EMAIL_TAKEN', message: 'An account with this email already exists' },
      });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const mem = {
      id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      email: normalizedEmail,
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    memoryUsers.set(normalizedEmail, mem);
    const token = jwt.sign(
      { sub: mem.id, email: mem.email, name: mem.name },
      config.jwtSecret,
      { expiresIn: '7d' },
    );
    return res.status(201).json({
      success: true,
      data: { token, user: { id: mem.id, name: mem.name, email: mem.email }, storage: 'memory' },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/auth/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.issues },
      });
    }

    const { email, password } = parsed.data;
    const normalizedEmail = normalizeEmail(email);

    if (dbReady()) {
      try {
        const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
        if (user && (await user.comparePassword(password))) {
          const token = signToken(user);
          return res.json({
            success: true,
            data: { token, user: { id: user._id, name: user.name, email: user.email } },
          });
        }
        // If DB is up but user not found, still check memory store before 401.
        if (!user) {
          const mem = memoryUsers.get(normalizedEmail);
          if (mem && (await bcrypt.compare(password, mem.passwordHash))) {
            const token = jwt.sign(
              { sub: mem.id, email: mem.email, name: mem.name },
              config.jwtSecret,
              { expiresIn: '7d' },
            );
            return res.json({
              success: true,
              data: { token, user: { id: mem.id, name: mem.name, email: mem.email }, storage: 'memory' },
            });
          }
          return res.status(401).json({
            success: false,
            error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
          });
        }
        return res.status(401).json({
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
        });
      } catch {
        // fall through to memory store
      }
    }

    const mem = memoryUsers.get(normalizedEmail);
    if (!mem || !(await bcrypt.compare(password, mem.passwordHash))) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
    }
    const token = jwt.sign(
      { sub: mem.id, email: mem.email, name: mem.name },
      config.jwtSecret,
      { expiresIn: '7d' },
    );
    res.json({
      success: true,
      data: { token, user: { id: mem.id, name: mem.name, email: mem.email }, storage: 'memory' },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/auth/me', authenticate, async (req, res, next) => {
  try {
    if (!dbReady()) {
      const mem = [...memoryUsers.values()].find((u) => u.id === req.user.id);
      if (!mem) {
        // Token is valid JWT but no store — still return its payload so
        // sessions survive restarts in memory mode.
        return res.json({
          success: true,
          data: { id: req.user.id, name: req.user.name, email: req.user.email },
        });
      }
      return res.json({
        success: true,
        data: { id: mem.id, name: mem.name, email: mem.email, createdAt: mem.createdAt },
      });
    }
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }
    res.json({
      success: true,
      data: { id: user._id, name: user.name, email: user.email, createdAt: user.createdAt },
    });
  } catch (err) {
    next(err);
  }
});

const profileSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

router.patch('/auth/profile', authenticate, async (req, res, next) => {
  try {
    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.issues },
      });
    }
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { name: parsed.data.name } },
      { new: true, runValidators: true },
    );
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }
    res.json({
      success: true,
      data: { id: user._id, name: user.name, email: user.email, createdAt: user.createdAt },
    });
  } catch (err) {
    next(err);
  }
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

router.put('/auth/password', authenticate, async (req, res, next) => {
  try {
    const parsed = passwordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.issues },
      });
    }
    const user = await User.findById(req.user.id).select('+passwordHash');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }
    const okPassword = await user.comparePassword(parsed.data.currentPassword);
    if (!okPassword) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Current password is incorrect' },
      });
    }
    user.passwordHash = await User.hashPassword(parsed.data.newPassword);
    await user.save();
    res.json({ success: true, data: { changed: true } });
  } catch (err) {
    next(err);
  }
});

router.delete('/auth/account', authenticate, async (req, res, next) => {
  try {
    const Project = require('../models/Project');
    const Analysis = require('../models/Analysis');
    const PracticeAttempt = require('../models/PracticeAttempt');
    await Promise.all([
      Project.deleteMany({ userId: req.user.id }),
      Analysis.deleteMany({ userId: req.user.id }).catch(() => null),
      PracticeAttempt.deleteMany({ userId: req.user.id }).catch(() => null),
      User.findByIdAndDelete(req.user.id),
    ]);
    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
