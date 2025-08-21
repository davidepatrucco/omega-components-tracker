const express = require('express');
const router = express.Router();
const Component = require('../models/Component');
const Commessa = require('../models/Commessa');
const { requireAuth } = require('../middleware/auth');

// GET /stats - get processing statistics
router.get('/', requireAuth, async (req, res) => {
  try {
    // Get all non-deleted components
    const allComponents = await Component.find({ cancellato: { $ne: true } }).lean();
    
    // Current date for today's shipments
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    // 1. In lavorazione: components whose status is not shipped ('6')
    const inLavorazione = allComponents.filter(c => c.status !== '6').length;

    // 2. Da spedire: components in "ready for delivery" status ('5')
    const daSpedire = allComponents.filter(c => c.status === '5').length;

    // 3. Verificato: non-shipped components where verificato is false
    const nonShippedComponents = allComponents.filter(c => c.status !== '6');
    const nonVerificati = nonShippedComponents.filter(c => !c.verificato).length;
    const nonShippedTotal = nonShippedComponents.length;
    const verificatoPercentage = nonShippedTotal > 0 ? 
      Math.round((nonVerificati / nonShippedTotal) * 100) : 0;

    // 4. Spediti oggi: components shipped today
    const speditOggi = allComponents.filter(c => {
      if (c.status !== '6') return false;
      
      // Find the last transition to status '6' in history
      const shippedTransition = c.history?.slice().reverse().find(h => h.to === '6');
      if (!shippedTransition) return false;
      
      const shippedDate = new Date(shippedTransition.date);
      return shippedDate >= todayStart && shippedDate < todayEnd;
    }).length;

    // 5. Commesse aperte: commesse with at least one non-shipped component
    const commesseWithNonShipped = new Set();
    allComponents.forEach(c => {
      if (c.status !== '6') {
        commesseWithNonShipped.add(c.commessaId.toString());
      }
    });
    const commesseAperte = commesseWithNonShipped.size;

    // 6. In trattamento: components in treatment states (status starting with '4:')
    const inTrattamento = allComponents.filter(c => 
      c.status && c.status.startsWith('4:')
    ).length;

    const stats = {
      inLavorazione,
      daSpedire,
      verificato: {
        nonVerificati,
        total: nonShippedTotal,
        percentage: verificatoPercentage
      },
      speditOggi,
      commesseAperte,
      inTrattamento
    };

    res.json(stats);
  } catch (err) {
    console.error('Error calculating stats:', err);
    res.status(500).json({ error: 'Error calculating statistics', details: err.message });
  }
});

module.exports = router;