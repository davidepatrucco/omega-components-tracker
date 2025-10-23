const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const Component = require('../models/Component');
const { requireAuth } = require('../middleware/auth');

// Utility: build a Mongo query from saved filters (supports filters from Ant Design Table)
function buildQueryFromFilters(filters = {}) {
  const query = { cancellato: { $ne: true } };

  // Ant Design table filters come as: { columnKey: [value1, value2, ...] }
  
  // Filter: commessaCode (array of values)
  if (filters.commessaCode && filters.commessaCode.length > 0) {
    const searchValue = filters.commessaCode[0];
    query.commessaCode = { $regex: searchValue, $options: 'i' };
  }

  // Filter: descrizioneComponente (array of values)
  if (filters.descrizioneComponente && filters.descrizioneComponente.length > 0) {
    const searchValue = filters.descrizioneComponente[0];
    query.descrizioneComponente = { $regex: searchValue, $options: 'i' };
  }

  // Filter: status (array of status codes)
  if (filters.status && filters.status.length > 0) {
    query.status = { $in: filters.status };
  }

  // Filter: type (array of types)
  if (filters.type && filters.type.length > 0) {
    query.type = { $in: filters.type };
  }

  // Filter: trattamenti (array of treatment names)
  if (filters.trattamenti && filters.trattamenti.length > 0) {
    const searchValue = filters.trattamenti[0];
    query.trattamenti = { $regex: searchValue, $options: 'i' };
  }

  // Filter: fornitoreTrattamenti (array of supplier names)
  if (filters.fornitoreTrattamenti && filters.fornitoreTrattamenti.length > 0) {
    const searchValue = filters.fornitoreTrattamenti[0];
    query.fornitoreTrattamenti = { $regex: searchValue, $options: 'i' };
  }

  // Filter: verificato (array of boolean values)
  if (filters.verificato && filters.verificato.length > 0) {
    query.verificato = { $in: filters.verificato };
  }

  return query;
}

// GET /reports - list reports
router.get('/', requireAuth, async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 }).lean();
    res.json(reports);
  } catch (err) {
    console.error('Error fetching reports:', err);
    res.status(500).json({ error: 'Errore nel recupero dei report' });
  }
});

// POST /reports - create new report
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, filters } = req.body;
    
    // Log per debug
    console.log('Creating report:', { name, filters: JSON.stringify(filters) });
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Il nome del report è obbligatorio' });
    }

    const report = new Report({
      name: name.trim(),
      owner: req.user?._id || null,
      createdBy: req.user?.username || '',
      filters: filters || {}
    });

    await report.save();
    console.log('Report saved:', report._id, 'with filters:', JSON.stringify(report.filters));
    res.status(201).json(report);
  } catch (err) {
    console.error('Error creating report:', err);
    res.status(500).json({ error: 'Errore nella creazione del report' });
  }
});

// DELETE /reports/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const r = await Report.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ error: 'Report non trovato' });
    res.json({ message: 'Report eliminato' });
  } catch (err) {
    console.error('Error deleting report:', err);
    res.status(500).json({ error: 'Errore nell\'eliminazione del report' });
  }
});

// GET /reports/:id/results - run the saved filters and return current matching components
router.get('/:id/results', requireAuth, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id).lean();
    if (!report) return res.status(404).json({ error: 'Report non trovato' });

    const query = buildQueryFromFilters(report.filters || {});
    // Allow optional limit/skip via query params
    const limit = parseInt(req.query.limit) || 1000;
    const components = await Component.find(query).lean().limit(limit);
    res.json({ components, count: components.length });
  } catch (err) {
    console.error('Error fetching report results:', err);
    res.status(500).json({ error: 'Errore nel recupero dei risultati del report' });
  }
});

module.exports = router;
