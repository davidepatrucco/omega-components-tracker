const express = require('express');
const router = express.Router();
const Component = require('../models/Component');
const { requireAuth } = require('../middleware/auth');

// POST /changestatus
router.post('/', requireAuth, async (req, res) => {
  const { componentId, to, note, ddtNumber, ddtDate } = req.body;
  if (!componentId || !to) return res.status(400).json({ error: 'componentId and to required' });
  const comp = await Component.findById(componentId);
  if (!comp) return res.status(404).json({ error: 'component not found' });
  comp.history = comp.history || [];
  comp.history.push({ from: comp.status, to, date: new Date(), note, user: 'system' });
  comp.status = to;
  if (ddtNumber || ddtDate) {
    comp.ddt = comp.ddt || [];
    comp.ddt.push({ number: ddtNumber, date: ddtDate });
  }
  await comp.save();
  res.json(comp);
});

module.exports = router;
