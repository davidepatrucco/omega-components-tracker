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

module.exports = router;
