const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    language: { type: String, default: 'cpp' },
    sourceCode: { type: String, default: '', maxlength: 500000 },
  },
  { timestamps: true },
);

projectSchema.index({ userId: 1, updatedAt: -1 }, { name: 'by_user' });

module.exports = mongoose.model('Project', projectSchema);
