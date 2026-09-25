const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    problemId: { type: String, required: true, index: true },
    language: { type: String, default: 'cpp' },
    sourceCode: { type: String, default: '' },
    verdict: { type: String, default: 'Pending' },
    passed: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    timeMs: { type: Number, default: 0 },
  },
  { timestamps: true },
);

submissionSchema.index({ userId: 1, createdAt: -1 }, { name: 'by_user' });
submissionSchema.index({ userId: 1, problemId: 1 }, { name: 'by_user_problem' });

module.exports = mongoose.model('Submission', submissionSchema);
