const express = require('express');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const config = require('../config/env');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { normalizeEmail } = require('../utils/normalizeEmail');

const router = express.Router();

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

    res.status(201).json({
      success: true,
      data: { token, user: { id: user._id, name: user.name, email: user.email } },
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

    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
    }

    const token = signToken(user);
    res.json({
      success: true,
      data: { token, user: { id: user._id, name: user.name, email: user.email } },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/auth/me', authenticate, async (req, res, next) => {
  try {
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
    const Submission = require('../models/Submission');
    await Promise.all([
      Project.deleteMany({ userId: req.user.id }),
      Analysis.deleteMany({ userId: req.user.id }).catch(() => null),
      PracticeAttempt.deleteMany({ userId: req.user.id }).catch(() => null),
      Submission.deleteMany({ userId: req.user.id }).catch(() => null),
      User.findByIdAndDelete(req.user.id),
    ]);
    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
