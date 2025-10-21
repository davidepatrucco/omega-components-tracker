const mongoose = require('mongoose');

const TreatmentSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true
  },
  usageCount: { 
    type: Number, 
    default: 1 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  lastUsedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Indice per ricerca testuale e ordinamento per frequenza
TreatmentSchema.index({ name: 'text' });
TreatmentSchema.index({ usageCount: -1 });
TreatmentSchema.index({ lastUsedAt: -1 });

module.exports = mongoose.model('Treatment', TreatmentSchema);
