const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null, index: true },
    sourceCode: { type: String, default: '' },
    language: { type: String, default: 'cpp' },
    diagnostics: { type: [mongoose.Schema.Types.Mixed], default: [] },
    stats: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

analysisSchema.index({ userId: 1, createdAt: -1 }, { name: 'by_user' });
analysisSchema.index({ projectId: 1 }, { name: 'by_project' });

module.exports = mongoose.model('Analysis', analysisSchema);
