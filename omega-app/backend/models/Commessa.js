const mongoose = require('mongoose');
const CommessaSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  notes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

// Indici per performance
CommessaSchema.index({ createdAt: -1 });
CommessaSchema.index({ name: "text" }); // per ricerca testuale

module.exports = mongoose.model('Commessa', CommessaSchema);
