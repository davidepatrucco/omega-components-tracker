const mongoose = require('mongoose');

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

// Funzione per calcolare gli stati consentiti basata sulla logica delle istruzioni
ComponentSchema.methods.buildAllowedStatuses = function() {
  const globals = ['1','2','3','5','6'];
  const treatmentStates = (this.trattamenti || []).flatMap(t =>
    [`4:${t}:PREP`, `4:${t}:IN`, `4:${t}:ARR`]
  );
  return Array.from(new Set([...globals, ...treatmentStates]));
};

// Funzione per auto-transizione a "Pronto" quando tutti i trattamenti sono ARR
ComponentSchema.methods.maybeAutoTransitionToReady = function(saveFn) {
  const tratt = this.trattamenti || [];
  if (tratt.length === 0) return false;
  
  const allArr = tratt.every(t => {
    // verifica se history contiene un evento che porta il trattamento a ARR
    return this.history?.some(h => h.to === `4:${t}:ARR`);
  });
  
  if (allArr && this.status !== '5') {
    this.history = this.history || [];
    this.history.push({ 
      from: this.status, 
      to: '5', 
      date: new Date(), 
      note: 'auto: all treatments ARR' 
    });
    this.status = '5';
    if (typeof saveFn === 'function') saveFn(this);
    return true;
  }
  return false;
};

module.exports = mongoose.model('Component', ComponentSchema);
