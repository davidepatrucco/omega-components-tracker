const express = require('express');
const router = express.Router();
const Treatment = require('../models/Treatment');
const { requireAuth } = require('../middleware/auth');

// GET /treatments - Ottieni tutti i trattamenti ordinati per frequenza d'uso
router.get('/', requireAuth, async (req, res) => {
  try {
    const treatments = await Treatment.find()
      .sort({ usageCount: -1, name: 1 }) // Ordina per frequenza, poi alfabeticamente
      .limit(100) // Limita a 100 trattamenti più usati
      .lean();
    
    res.json(treatments);
  } catch (err) {
    res.status(500).json({ error: 'Errore nel recupero dei trattamenti' });
  }
});

// POST /treatments/batch - Registra o aggiorna trattamenti (chiamato quando si salvano componenti)
router.post('/batch', requireAuth, async (req, res) => {
  try {
    const { treatments } = req.body; // Array di stringhe
    
    if (!Array.isArray(treatments) || treatments.length === 0) {
      return res.json({ message: 'Nessun trattamento da processare' });
    }
    
    // Normalizza i nomi (trim, lowercase per confronto)
    const normalizedTreatments = treatments
      .map(t => t.trim())
      .filter(t => t.length > 0);
    
    // Aggiorna o crea ogni trattamento
    const results = await Promise.all(
      normalizedTreatments.map(async (treatmentName) => {
        return await Treatment.findOneAndUpdate(
          { name: treatmentName },
          { 
            $inc: { usageCount: 1 }, // Incrementa contatore
            $set: { lastUsedAt: new Date() } // Aggiorna ultimo utilizzo
          },
          { 
            upsert: true, // Crea se non esiste
            new: true,
            setDefaultsOnInsert: true
          }
        );
      })
    );
    
    res.json({ 
      message: 'Trattamenti registrati con successo',
      count: results.length 
    });
  } catch (err) {
    console.error('Errore batch treatments:', err);
    res.status(500).json({ error: 'Errore nella registrazione dei trattamenti' });
  }
});

// DELETE /treatments/:id - Elimina un trattamento (admin only)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const treatment = await Treatment.findByIdAndDelete(req.params.id);
    
    if (!treatment) {
      return res.status(404).json({ error: 'Trattamento non trovato' });
    }
    
    res.json({ message: 'Trattamento eliminato con successo' });
  } catch (err) {
    res.status(500).json({ error: 'Errore nell\'eliminazione del trattamento' });
  }
});

// POST /treatments - Crea un nuovo trattamento manualmente
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Il nome del trattamento è obbligatorio' });
    }
    
    const normalizedName = name.trim();
    
    // Verifica se esiste già
    const existing = await Treatment.findOne({ name: normalizedName });
    if (existing) {
      return res.status(400).json({ error: 'Trattamento già esistente' });
    }
    
    const treatment = new Treatment({
      name: normalizedName,
      usageCount: 0
    });
    
    await treatment.save();
    res.status(201).json(treatment);
  } catch (err) {
    console.error('Errore creazione treatment:', err);
    res.status(500).json({ error: 'Errore nella creazione del trattamento' });
  }
});

// PUT /treatments/:id - Modifica un trattamento
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Il nome del trattamento è obbligatorio' });
    }
    
    const normalizedName = name.trim();
    
    // Verifica se esiste già un altro trattamento con lo stesso nome
    const existing = await Treatment.findOne({ 
      name: normalizedName,
      _id: { $ne: req.params.id }
    });
    
    if (existing) {
      return res.status(400).json({ error: 'Esiste già un trattamento con questo nome' });
    }
    
    const treatment = await Treatment.findByIdAndUpdate(
      req.params.id,
      { name: normalizedName },
      { new: true }
    );
    
    if (!treatment) {
      return res.status(404).json({ error: 'Trattamento non trovato' });
    }
    
    res.json(treatment);
  } catch (err) {
    console.error('Errore modifica treatment:', err);
    res.status(500).json({ error: 'Errore nella modifica del trattamento' });
  }
});

module.exports = router;
