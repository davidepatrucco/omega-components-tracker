const express = require('express');
const router = express.Router();
const Commessa = require('../models/Commessa');
const { requireAuth } = require('../middleware/auth');

// GET /commesse/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const c = await Commessa.findById(req.params.id);
    if (!c) return res.status(404).json({ error: 'commessa not found' });
    res.json(c);
  } catch (err) {
    return res.status(400).json({ error: 'invalid id' });
  }
});

// POST /commesse - create
router.post('/', requireAuth, async (req, res) => {
  const { code, name, notes } = req.body;
  if (!code || !name) return res.status(400).json({ error: 'code and name required' });
  try {
    const c = await Commessa.create({ code, name, notes });
    res.status(201).json(c);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'code exists' });
    res.status(500).json({ error: 'error creating' });
  }
});

module.exports = router;
