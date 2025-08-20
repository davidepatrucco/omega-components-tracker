const mongoose = require('mongoose');
const ComponentSchema = new mongoose.Schema({
  commessaId: { type: mongoose.Schema.Types.ObjectId, required: true },
  commessaName: { type: String, required: true },
  name: { type: String },
  barcode: { type: String },
  status: { type: String },
  allowedStatuses: [{ type: String }],
  history: [{ from: String, to: String, date: Date, note: String, user: String, ddt: { number: String, date: Date } }],
  trattamenti: [{ type: String }],
  ddt: [{ number: String, date: Date, files: [{ filename: String, path: String }] }],
  verificato: { type: Boolean, default: false },
  cancellato: { type: Boolean, default: false }
}, { timestamps: true });
module.exports = mongoose.model('Component', ComponentSchema);
