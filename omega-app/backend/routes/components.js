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

// GET /components/commessa/:commessaId - get all components for a commessa
router.get('/commessa/:commessaId', requireAuth, async (req, res) => {
  try {
    const components = await Component.find({ 
      commessaId: req.params.commessaId,
      cancellato: false 
    }).sort({ createdAt: 1 });
    res.json(components);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching components' });
  }
});

// GET /components/:id - get single component
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const component = await Component.findById(req.params.id);
    if (!component) return res.status(404).json({ error: 'Component not found' });
    res.json(component);
  } catch (err) {
    res.status(400).json({ error: 'Invalid component ID' });
  }
});

// POST /components - create new component
router.post('/', requireAuth, async (req, res) => {
  try {
    const { commessaId, name } = req.body;
    if (!commessaId || !name) {
      return res.status(400).json({ error: 'commessaId and name required' });
    }
    
    // Validate commessa exists
    const comm = await Commessa.findById(commessaId);
    if (!comm) return res.status(400).json({ error: 'commessa not found' });
    
    const componentData = { 
      ...req.body,
      commessaName: comm.name
    };
    
    // Calcola gli stati consentiti se trattamenti sono presenti
    if (componentData.trattamenti && Array.isArray(componentData.trattamenti)) {
      const globals = ['1','2','3','5','6'];
      const treatmentStates = componentData.trattamenti.flatMap(t =>
        [`4:${t}:PREP`, `4:${t}:IN`, `4:${t}:ARR`]
      );
      componentData.allowedStatuses = Array.from(new Set([...globals, ...treatmentStates]));
    } else {
      componentData.allowedStatuses = ['1','2','3','5','6'];
    }
    
    const component = await Component.create(componentData);
    res.status(201).json(component);
  } catch (err) {
    res.status(500).json({ error: 'Error creating component', details: err.message });
  }
});

// PUT /components/:id - update component
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const component = await Component.findById(req.params.id);
    if (!component) return res.status(404).json({ error: 'Component not found' });
    
    const updateData = { ...req.body };
    
    // Se viene cambiato lo stato, aggiungi alla history
    if (updateData.status && updateData.status !== component.status) {
      component.history = component.history || [];
      component.history.push({
        from: component.status,
        to: updateData.status,
        date: new Date(),
        note: updateData.statusChangeNote || '',
        user: req.user?.username || ''
      });
    }
    
    // Aggiorna i campi
    Object.assign(component, updateData);
    
    // Ricalcola gli stati consentiti se i trattamenti sono cambiati
    if (updateData.trattamenti) {
      component.allowedStatuses = component.buildAllowedStatuses();
    }
    
    // Controlla auto-transizione a "Pronto"
    component.maybeAutoTransitionToReady();
    
    await component.save();
    res.json(component);
  } catch (err) {
    res.status(500).json({ error: 'Error updating component', details: err.message });
  }
});

// DELETE /components/:id - delete component (logical)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const component = await Component.findByIdAndUpdate(
      req.params.id, 
      { cancellato: true },
      { new: true }
    );
    if (!component) return res.status(404).json({ error: 'Component not found' });
    res.json({ message: 'Component deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting component' });
  }
});

// POST /components/:id/change-status - change component status
router.post('/:id/change-status', requireAuth, async (req, res) => {
  try {
    const { newStatus, note } = req.body;
    if (!newStatus) {
      return res.status(400).json({ error: 'newStatus is required' });
    }
    
    const component = await Component.findById(req.params.id);
    if (!component) return res.status(404).json({ error: 'Component not found' });
    
    // Verifica che lo stato sia consentito
    if (!component.allowedStatuses.includes(newStatus)) {
      return res.status(400).json({ 
        error: 'Status transition not allowed',
        currentStatus: component.status,
        allowedStatuses: component.allowedStatuses
      });
    }
    
    // Aggiungi alla history
    component.history = component.history || [];
    component.history.push({
      from: component.status,
      to: newStatus,
      date: new Date(),
      note: note || '',
      user: req.user?.username || ''
    });
    
    component.status = newStatus;
    
    // Controlla auto-transizione a "Pronto"
    component.maybeAutoTransitionToReady();
    
    await component.save();
    res.json(component);
  } catch (err) {
    res.status(500).json({ error: 'Error changing status', details: err.message });
  }
});

module.exports = router;
