const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  name: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  filters: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdBy: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

ReportSchema.index({ name: 1 });
ReportSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Report', ReportSchema);
