const mongoose = require('mongoose');
const { buildAllowedStatuses } = require('../utils/statusUtils');

const ComponentSchema = new mongoose.Schema({
commessaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Commessa', required: true },
  commessaCode: { type: String, required: true }, // same as Commessa.js
  commessaName: { type: String, required: true },  // same as Commessa.js
  commessaNotes: { type: String, default: '' },  // same as Commessa.js
  commessaCreatedAt: { type: Date, default: Date.now },  // same as Commessa.js "createdAt"
  componentNotes: { type: String },
  level: { type: String },
  crit: { type: String },
  bom_text: { type: String },
  oda_text: { type: String },
  qty_u: { type: Number },
  uta_u: { type: String },
  qty_t: { type: Number },
  uta_t: { type: String },
  trattamenti: [{ type: String }],
  descrizioneComponente: { type: String }, // Nome/descrizione del componente dall'Excel
  barcode: { type: String },
  status: { type: String, required: true },
  allowedStatuses: [{ type: String }],
  history: [
    {
      from: String,
      to: String,
      date: { type: Date, default: Date.now },
      note: { type: String, default: '' },
      user: { type: String, default: '' },
      // opzionale: DDT associato alla singola transizione (es. ARR o SPEDITO)
      ddt: {
        number: { type: String },
        date: { type: Date },
      }
    }
  ],
  // DDT associati al componente (opzionali). Ogni oggetto può contenere metadati e files.
  ddt: [
    {
      number: { type: String },
      date: { type: Date },
      files: [
        {
          filename: String,
          path: String,
          mimetype: String,
          size: Number,
          uploadedBy: String,
          uploadedAt: { type: Date, default: Date.now }
        }
      ],
      note: { type: String, default: '' },
      createdBy: { type: String, default: '' },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  verificato: { type: Boolean, default: false },
  cancellato: { type: Boolean, default: false }
}, { timestamps: true });

// Pre-save hook per popolare automaticamente allowedStatuses
ComponentSchema.pre('save', function(next) {
  if (this.isModified('trattamenti') || this.isNew) {
    this.allowedStatuses = buildAllowedStatuses(this);
  }
  next();
});

// Funzione per calcolare gli stati consentiti (manteniamo per compatibilità)
ComponentSchema.methods.buildAllowedStatuses = function() {
  return buildAllowedStatuses(this);
};

module.exports = mongoose.model('Component', ComponentSchema);
