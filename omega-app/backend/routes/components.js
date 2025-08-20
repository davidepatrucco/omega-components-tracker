const express = require('express');
const router = express.Router();
const Component = require('../models/Component');
const Commessa = require('../models/Commessa');
const { requireAuth } = require('../middleware/auth');

// GET /components - list with pagination and optional q, commessaId
router.get('/', requireAuth, async (req, res) => {
  const page = parseInt(req.query.page || '1', 10);
  const pageSize = parseInt(req.query.pageSize || '25', 10);
  const q = req.query.q;
  const commessaId = req.query.commessaId;
  const filter = { cancellato: { $ne: true } };
  if (commessaId) filter.commessaId = commessaId;
  if (q) filter.name = { $regex: q, $options: 'i' };
  const total = await Component.countDocuments(filter);
  const items = await Component.find(filter).skip((page-1)*pageSize).limit(pageSize).lean();
  res.json({ items, total });
});

// POST /components - create
router.post('/', requireAuth, async (req, res) => {
  const { commessaId, commessaName, name, barcode, status } = req.body;
  if (!commessaId) return res.status(400).json({ error: 'commessaId required' });
  // validate commessa exists
  const comm = await Commessa.findById(commessaId);
  if (!comm) return res.status(400).json({ error: 'commessa not found' });
  const comp = await Component.create({ commessaId, commessaName: comm.name, name, barcode, status, allowedStatuses: ['1','2','3','5','6'] });
  res.status(201).json(comp);
});

// PUT /components/:id - update
router.put('/:id', requireAuth, async (req, res) => {
  const updates = req.body;
  try {
    const comp = await Component.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!comp) return res.status(404).json({ error: 'not found' });
    res.json(comp);
  } catch (err) {
    res.status(400).json({ error: 'invalid id' });
  }
});

module.exports = router;
