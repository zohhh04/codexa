/**
 * Personal dashboard stats — solved problems, languages, success rate,
 * coding streak, difficulty progress, recent submissions.
 */
const express = require('express');
const { authenticate } = require('../middleware/auth');
const Submission = require('../models/Submission');
const PracticeAttempt = require('../models/PracticeAttempt');
const Project = require('../models/Project');
const Analysis = require('../models/Analysis');

const router = express.Router();

function streakDays(dates) {
  const days = new Set(dates.map((d) => new Date(d).toDateString()));
  let streak = 0;
  const cur = new Date();
  if (!days.has(cur.toDateString())) cur.setDate(cur.getDate() - 1);
  while (days.has(cur.toDateString())) {
    streak += 1;
    cur.setDate(cur.getDate() - 1);
  }
  return streak;
}

router.get('/dashboard/stats', authenticate, async (req, res, next) => {
  try {
    const [subs, attempts, projects, analyses] = await Promise.all([
      Submission.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(200)
        .select('problemId language verdict passed total timeMs createdAt'),
      PracticeAttempt.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(50)
        .select('concept difficulty result createdAt'),
      Project.find({ userId: req.user.id }).sort({ updatedAt: -1 }).limit(5)
        .select('title language updatedAt'),
      Analysis.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(50)
        .select('language diagnostics createdAt'),
    ]);

    const acceptedSubs = subs.filter((s) => s.verdict === 'Accepted');
    const solvedProblems = new Set(acceptedSubs.map((s) => s.problemId)).size;

    const langCounts = {};
    for (const s of subs) langCounts[s.language] = (langCounts[s.language] || 0) + 1;

    const successRate = subs.length ? Math.round((acceptedSubs.length / subs.length) * 100) : 0;
    const streak = streakDays(subs.map((s) => s.createdAt));

    const { PROBLEMS } = require('../services/practice/dsaBank');
    const solvedIds = new Set(acceptedSubs.map((s) => s.problemId));
    const diffProgress = { easy: { solved: 0, total: 0 }, medium: { solved: 0, total: 0 }, hard: { solved: 0, total: 0 } };
    for (const p of PROBLEMS) {
      if (diffProgress[p.difficulty]) {
        diffProgress[p.difficulty].total += 1;
        if (solvedIds.has(p.id)) diffProgress[p.difficulty].solved += 1;
      }
    }

    res.json({
      success: true,
      data: {
        solvedProblems,
        totalSubmissions: subs.length,
        acceptedSubmissions: acceptedSubs.length,
        successRate,
        streakDays: streak,
        languagesUsed: langCounts,
        difficultyProgress: diffProgress,
        recentSubmissions: subs.slice(0, 8),
        practiceAttempts: attempts.slice(0, 5),
        recentProjects: projects,
        recentHistory: analyses.slice(0, 8).map((a) => ({
          _id: a._id,
          language: a.language,
          kind: a.stats?.kind ?? 'analyze',
          errors: a.diagnostics?.filter((d) => d.severity === 'error').length ?? 0,
          warnings: a.diagnostics?.filter((d) => d.severity === 'warning').length ?? 0,
          createdAt: a.createdAt,
        })),
        totalAnalyses: analyses.length,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
