const mongoose = require('mongoose');

const practiceAttemptSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    questionId: { type: String, required: true },
    concept: { type: String, required: true },
    difficulty: { type: String, required: true, enum: ['easy', 'medium', 'hard'] },
    questionPrompt: { type: String, required: true },
    submittedAnswer: { type: String, required: true, maxlength: 5000 },
    result: {
      correct: { type: Boolean, required: true },
      score: { type: Number, required: true },
      feedback: { type: String, default: '' },
      coverage: { type: Number, default: 0 },
      matches: { type: [String], default: [] },
    },
  },
  { timestamps: true },
);

practiceAttemptSchema.index({ userId: 1, createdAt: -1 }, { name: 'by_user' });

module.exports = mongoose.model('PracticeAttempt', practiceAttemptSchema);
