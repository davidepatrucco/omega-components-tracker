const mongoose = require('mongoose');
const WorkStatusSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  label: { type: String, required: true },
  order: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  profili: { type: [String], default: [] },
  note: { type: String, default: '' }
});
module.exports = mongoose.model('WorkStatus', WorkStatusSchema);
