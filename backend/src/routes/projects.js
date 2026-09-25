const express = require('express');
const { z } = require('zod');
const Project = require('../models/Project');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

const projectSchema = z.object({
  title: z.string().min(1).max(200),
  language: z.enum(['cpp', 'c', 'java', 'python', 'javascript', 'js']).default('cpp'),
  sourceCode: z.string().max(500000).default(''),
});

router.get('/', async (req, res, next) => {
  try {
    const projects = await Project.find({ userId: req.user.id })
      .sort({ updatedAt: -1 })
      .select('title language createdAt updatedAt');
    res.json({ success: true, data: projects });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const parsed = projectSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.issues },
      });
    }
    const project = await Project.create({ userId: req.user.id, ...parsed.data });
    res.status(201).json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, userId: req.user.id });
    if (!project) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
    }
    res.json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const parsed = projectSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.issues },
      });
    }
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: parsed.data },
      { new: true, runValidators: true },
    );
    if (!project) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
    }
    res.json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const project = await Project.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!project) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
    }
    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
