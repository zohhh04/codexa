/**
 * Codexa learning dashboard — spec #14 + #17.
 * Total Analyses, Successful, Errors Found, Projects, Practice Questions,
 * error categories, errors over time, most frequent mistakes, success vs failed.
 */
const express = require('express');
const { authenticate } = require('../middleware/auth');
const PracticeAttempt = require('../models/PracticeAttempt');
const Project = require('../models/Project');
const Analysis = require('../models/Analysis');

const router = express.Router();

router.get('/dashboard/stats', authenticate, async (req, res, next) => {
  try {
    const [attempts, projects, analyses] = await Promise.all([
      PracticeAttempt.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(50)
        .select('concept difficulty result createdAt'),
      Project.find({ userId: req.user.id }).sort({ updatedAt: -1 }).limit(20)
        .select('title language updatedAt'),
      Analysis.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(200)
        .select('language diagnostics stats createdAt'),
    ]);

    let errorsFound = 0;
    let successful = 0;
    const byCategory = {};
    const byDay = {};
    for (const a of analyses) {
      const diags = a.diagnostics ?? [];
      const errs = diags.filter((d) => d.severity === 'error').length;
      errorsFound += errs;
      if (errs === 0) successful += 1;
      for (const d of diags) {
        const key = d.code || d.phase || 'unknown';
        byCategory[key] = (byCategory[key] || 0) + 1;
      }
      const day = new Date(a.createdAt).toISOString().slice(0, 10);
      if (!byDay[day]) byDay[day] = { analyses: 0, errors: 0 };
      byDay[day].analyses += 1;
      byDay[day].errors += errs;
    }

    const frequentMistakes = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([code, count]) => ({ code, count }));

    const errorsOverTime = Object.entries(byDay)
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .slice(-14)
      .map(([day, v]) => ({ day, ...v }));

    res.json({
      success: true,
      data: {
        totalAnalyses: analyses.length,
        successful,
        failed: analyses.length - successful,
        errorsFound,
        totalProjects: projects.length,
        practiceQuestions: attempts.length,
        successRate: analyses.length ? Math.round((successful / analyses.length) * 100) : 0,
        errorCategories: byCategory,
        frequentMistakes,
        errorsOverTime,
        practiceAttempts: attempts.slice(0, 5),
        recentProjects: projects.slice(0, 5),
        recentHistory: analyses.slice(0, 8).map((a) => ({
          _id: a._id,
          language: a.language,
          kind: a.stats?.kind ?? 'analyze',
          errors: a.diagnostics?.filter((d) => d.severity === 'error').length ?? 0,
          warnings: a.diagnostics?.filter((d) => d.severity === 'warning').length ?? 0,
          createdAt: a.createdAt,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
