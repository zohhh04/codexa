const express = require('express');
const { z } = require('zod');
const PracticeAttempt = require('../models/PracticeAttempt');
const { authenticate } = require('../middleware/auth');
const { generatePracticeQuestion, gradePracticeAnswer, listConcepts } = require('../services/practice/questionBank');

const router = express.Router();
router.use(authenticate);

const generateSchema = z.object({
  concept: z.string().trim().max(100).optional(),
});

const submitSchema = z.object({
  questionId: z.string().min(1).max(200),
  submittedAnswer: z.string().min(1).max(5000),
  question: z.object({
    id: z.string().min(1),
    concept: z.string().min(1),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    prompt: z.string().min(1),
    answerKeywords: z.array(z.string()).min(1),
  }),
});

router.get('/', async (req, res, next) => {
  try {
    const attempts = await PracticeAttempt.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('questionId concept difficulty questionPrompt submittedAnswer result createdAt');

    res.json({ success: true, data: attempts });
  } catch (err) {
    next(err);
  }
});

router.get('/concepts', async (req, res) => {
  res.json({ success: true, data: listConcepts() });
});

router.post('/generate', async (req, res, next) => {  try {
    const parsed = generateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.issues },
      });
    }

    const question = generatePracticeQuestion(parsed.data.concept);
    res.status(201).json({ success: true, data: question });
  } catch (err) {
    next(err);
  }
});

router.post('/submit', async (req, res, next) => {
  try {
    const parsed = submitSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.issues },
      });
    }

    const { question, submittedAnswer } = parsed.data;
    const result = gradePracticeAnswer(question, submittedAnswer);

    const attempt = await PracticeAttempt.create({
      userId: req.user.id,
      questionId: question.id,
      concept: question.concept,
      difficulty: question.difficulty,
      questionPrompt: question.prompt,
      submittedAnswer,
      result: {
        correct: result.correct,
        score: result.score,
        feedback: result.feedback,
        coverage: result.coverage ?? 0,
        matches: result.matches ?? [],
      },
    });

    res.status(201).json({ success: true, data: { attempt, result } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
