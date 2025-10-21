const express = require('express');
const router = express.Router();
const Component = require('../models/Component');
const Commessa = require('../models/Commessa');
const Treatment = require('../models/Treatment');
const { requireAuth } = require('../middleware/auth');
const { buildAllowedStatuses, populateAllowedStatuses, processStatusChange } = require('../utils/statusUtils');

// Helper function per registrare i trattamenti nell'anagrafica
async function registerTreatments(treatments) {
  if (!Array.isArray(treatments) || treatments.length === 0) return;
  
  const normalizedTreatments = treatments
    .map(t => typeof t === 'string' ? t.trim() : '')
    .filter(t => t.length > 0);
  
  if (normalizedTreatments.length === 0) return;
  
  try {
    await Promise.all(
      normalizedTreatments.map(async (treatmentName) => {
        await Treatment.findOneAndUpdate(
          { name: treatmentName },
          { 
            $inc: { usageCount: 1 },
            $set: { lastUsedAt: new Date() }
          },
          { 
            upsert: true,
            new: true,
            setDefaultsOnInsert: true
          }
        );
      })
    );
  } catch (err) {
    console.error('Error registering treatments:', err);
    // Non blocchiamo il salvataggio del componente se fallisce la registrazione
  }
}

// GET /components - list with pagination and optional q, commessaId, barcode
router.get('/', requireAuth, async (req, res) => {
  const page = parseInt(req.query.page || '1', 10);
  const pageSize = parseInt(req.query.pageSize || '25', 10);
  const q = req.query.q;
  const commessaId = req.query.commessaId;
  const barcode = req.query.barcode;
  
  const filter = { cancellato: { $ne: true } };
  if (commessaId) filter.commessaId = commessaId;
  if (q) filter.name = { $regex: q, $options: 'i' };
  if (barcode) filter.barcode = barcode;
  if (q) filter.descrizioneComponente = { $regex: q, $options: 'i' };
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
    const { commessaId } = req.body;
    if (!commessaId) {
      return res.status(400).json({ error: 'commessaId required' });
    }
    
    // Validate commessa exists
    const comm = await Commessa.findById(commessaId);
    if (!comm) return res.status(400).json({ error: 'commessa not found' });
    
    const componentData = { 
      ...req.body,
      commessaName: comm.name,
      commessaCode: comm.code
    };
    
    // Usa la configurazione centralizzata per calcolare allowedStatuses
    const component = new Component(componentData);
    populateAllowedStatuses(component);
    
    await component.save();
    
    // Registra i trattamenti nell'anagrafica (async, non blocca la risposta)
    if (component.trattamenti && component.trattamenti.length > 0) {
      registerTreatments(component.trattamenti).catch(err => 
        console.error('Error registering treatments:', err)
      );
    }
    
    res.status(201).json(component);
  } catch (err) {
    res.status(500).json({ error: 'Error creating component', details: err.message });
  }
});

// PUT /components/:id - update component
router.put('/:id', requireAuth, async (req, res) => {
  try {
    console.log(`[PUT /components/${req.params.id}] Request body:`, JSON.stringify(req.body, null, 2));
    console.log(`[PUT /components/${req.params.id}] User:`, req.user?.username);
    
    // Validate ObjectId format
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid component ID format' });
    }
    
    const component = await Component.findById(req.params.id);
    if (!component) {
      console.log(`[PUT /components/${req.params.id}] Component not found`);
      return res.status(404).json({ error: 'Component not found' });
    }
    
    console.log(`[PUT /components/${req.params.id}] Current component version:`, component.__v);
    console.log(`[PUT /components/${req.params.id}] Current status:`, component.status);
    
    const updateData = { ...req.body };
    
    // Se viene cambiato lo stato, usa la logica centralizzata
    if (updateData.status && updateData.status !== component.status) {
      console.log(`[PUT /components/${req.params.id}] Status change: ${component.status} -> ${updateData.status}`);
      
      const ddtInfo = (updateData.ddtNumber || updateData.ddtDate) ? 
        { number: updateData.ddtNumber, date: updateData.ddtDate } : null;
      
      console.log(`[PUT /components/${req.params.id}] DDT info:`, ddtInfo);
      
      // Non salviamo qui, solo processiamo il cambio di stato
      await processStatusChange(
        component,
        updateData.status,
        req.user?.username || '',
        updateData.statusChangeNote || '',
        ddtInfo,
        null // Non passare saveCallback, gestiamo il save dopo
      );
      
      // Rimuovi i campi di stato dall'updateData per evitare doppie modifiche
      delete updateData.status;
      delete updateData.statusChangeNote;
      delete updateData.ddtNumber;
      delete updateData.ddtDate;
    }
    
    console.log(`[PUT /components/${req.params.id}] Update data after status change:`, updateData);
    
    // Aggiorna altri campi
    Object.assign(component, updateData);
    
    // Ricalcola allowedStatuses se trattamenti sono cambiati
    if (updateData.trattamenti) {
      console.log(`[PUT /components/${req.params.id}] Recalculating allowed statuses for treatments:`, updateData.trattamenti);
      populateAllowedStatuses(component);
    }
    
    // Gestione versioning ottimistico con retry
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        console.log(`[PUT /components/${req.params.id}] Saving attempt ${retryCount + 1}, version:`, component.__v);
        await component.save();
        console.log(`[PUT /components/${req.params.id}] Save successful, new version:`, component.__v);
        
        // Registra i trattamenti nell'anagrafica (async, non blocca la risposta)
        if (component.trattamenti && component.trattamenti.length > 0) {
          registerTreatments(component.trattamenti).catch(err => 
            console.error('Error registering treatments:', err)
          );
        }
        
        break;
      } catch (err) {
        console.log(`[PUT /components/${req.params.id}] Save error:`, err.name, err.message);
        if (err.name === 'VersionError' && retryCount < maxRetries - 1) {
          retryCount++;
          console.log(`[PUT /components/${req.params.id}] Retrying save attempt ${retryCount}...`);
          // Ricarica il documento con la versione aggiornata
          const freshComponent = await Component.findById(component._id);
          if (!freshComponent) {
            console.log(`[PUT /components/${req.params.id}] Component not found on retry`);
            return res.status(404).json({ error: 'Component not found' });
          }
          console.log(`[PUT /components/${req.params.id}] Reloaded component version:`, freshComponent.__v);
          // Riapplica le modifiche al documento fresco
          Object.assign(freshComponent, updateData);
          if (updateData.trattamenti) {
            populateAllowedStatuses(freshComponent);
          }
          component = freshComponent;
        } else {
          throw err;
        }
      }
    }
    
    console.log(`[PUT /components/${req.params.id}] Sending response`);
    res.json(component);
  } catch (err) {
    console.error(`[PUT /components/${req.params.id}] Error updating component:`, err);
    res.status(500).json({ error: err.message || 'Error updating component' });
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
