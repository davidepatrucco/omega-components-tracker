const express = require('express');
const router = express.Router();
const Component = require('../models/Component');
const { requireAuth } = require('../middleware/auth');
const { processStatusChange } = require('../utils/statusUtils');

// POST /changestatus
router.post('/', requireAuth, async (req, res) => {
  try {
    const { componentId, to, note, ddtNumber, ddtDate } = req.body;
    
    if (!componentId || !to) {
      return res.status(400).json({ error: 'componentId and to required' });
    }
    
    const component = await Component.findById(componentId);
    if (!component) {
      return res.status(404).json({ error: 'component not found' });
    }
    
    // Usa la logica centralizzata per il cambio di stato
    const ddtInfo = (ddtNumber || ddtDate) ? { number: ddtNumber, date: ddtDate } : null;
    
    const result = await processStatusChange(
      component,
      to,
      req.user?.username || 'system',
      note || '',
      ddtInfo,
      async (comp) => await comp.save()
    );
    
    res.json({
      success: result.success,
      component,
      oldStatus: result.oldStatus,
      newStatus: result.newStatus,
      autoTransitioned: result.autoTransitioned
    });
    
  } catch (error) {
    console.error('Error changing status:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
