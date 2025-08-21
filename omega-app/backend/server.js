require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const upload = multer({ dest: './upload' });

const app = express();
const PORT = process.env.PORT || 4000;

const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_ORIGIN_STAGE,
  process.env.FRONTEND_ORIGIN_PROD
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('CORS origin not allowed'), false);
    }
    return callback(null, true);
  },
  credentials: true,
  exposedHeaders: ['Content-Disposition']
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// In-memory store (PoC)
let components = [
  {
    _id: 'cmp_1',
    commessaId: 'c1',
    commessaName: 'Commessa PoC',
    name: 'Componente 1',
    barcode: 'BC001',
    status: '1',
    verificato: true,
    cancellato: false,
    history: [{ from: '', to: '1', date: new Date('2024-01-10'), note: 'Creato', user: 'admin' }]
  },
  {
    _id: 'cmp_2',
    commessaId: 'c1',
    commessaName: 'Commessa PoC',
    name: 'Componente 2',
    barcode: 'BC002',
    status: '5',
    verificato: false,
    cancellato: false,
    history: [{ from: '', to: '1', date: new Date('2024-01-10'), note: 'Creato', user: 'admin' }]
  },
  {
    _id: 'cmp_3',
    commessaId: 'c2',
    commessaName: 'Commessa Test',
    name: 'Componente 3',
    barcode: 'BC003',
    status: '6',
    verificato: true,
    cancellato: false,
    history: [
      { from: '', to: '1', date: new Date('2024-01-10'), note: 'Creato', user: 'admin' },
      { from: '1', to: '6', date: new Date(), note: 'Spedito oggi', user: 'admin' }
    ]
  },
  {
    _id: 'cmp_4',
    commessaId: 'c1',
    commessaName: 'Commessa PoC',
    name: 'Componente 4',
    barcode: 'BC004',
    status: '4:ZINCATURA:IN',
    verificato: false,
    cancellato: false,
    trattamenti: ['ZINCATURA'],
    history: [{ from: '', to: '1', date: new Date('2024-01-10'), note: 'Creato', user: 'admin' }]
  },
  {
    _id: 'cmp_5',
    commessaId: 'c2',
    commessaName: 'Commessa Test',
    name: 'Componente 5',
    barcode: 'BC005',
    status: '6',
    verificato: true,
    cancellato: false,
    history: [
      { from: '', to: '1', date: new Date('2024-01-09'), note: 'Creato', user: 'admin' },
      { from: '1', to: '6', date: new Date('2024-01-09'), note: 'Spedito ieri', user: 'admin' }
    ]
  }
];
let commesse = [
  { _id: 'c1', code: 'COM-001', name: 'Commessa PoC', notes: 'Esempio' },
  { _id: 'c2', code: 'COM-002', name: 'Commessa Test', notes: 'Test data' }
];

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', db: 'mock' });
});

// List components
app.get('/components', (req, res) => {
  const { page = 1, pageSize = 25, commessaId, q } = req.query;
  let items = components.slice();
  if (commessaId) items = items.filter(c => c.commessaId === commessaId);
  if (q) items = items.filter(c => (c.name || '').toLowerCase().includes(q.toLowerCase()));
  const total = items.length;
  const start = (page - 1) * pageSize;
  const paged = items.slice(start, start + Number(pageSize));
  res.json({ items: paged, total });
});

// Create component (multipart)
app.post('/components', upload.array('files'), (req, res) => {
  const { commessaId, commessaName, name, barcode, status } = req.body;
  const comp = {
    _id: `cmp_${Date.now()}`,
    commessaId: commessaId || 'c1',
    commessaName: commessaName || 'Commessa PoC',
    name: name || 'nuovo componente',
    barcode: barcode || '',
    status: status || '1',
    allowedStatuses: ['1','2','3','5','6']
  };
  components.push(comp);
  res.status(201).json(comp);
});

// Update component (support ddt upload)
app.put('/components/:id', upload.array('ddtFile'), (req, res) => {
  const id = req.params.id;
  const comp = components.find(c => c._id === id);
  if (!comp) return res.status(404).json({ error: 'not found' });
  Object.assign(comp, req.body);
  res.json(comp);
});

// Change status
app.post('/changestatus', (req, res) => {
  const { componentId, to, note, ddtNumber, ddtDate } = req.body;
  const comp = components.find(c => c._id === componentId);
  if (!comp) return res.status(404).json({ error: 'component not found' });
  comp.history = comp.history || [];
  comp.history.push({ from: comp.status, to, date: new Date(), note, user: 'poc' });
  comp.status = to;
  // PoC auto-transition: if all trattamenti ARR => status 5 (not implemented here)
  res.json(comp);
});

// Get commessa
app.get('/commesse/:id', (req, res) => {
  const c = commesse.find(x => x._id === req.params.id);
  if (!c) return res.status(404).json({ error: 'commessa not found' });
  res.json(c);
});

// Get Stats API - calculates dashboard indicators
app.get('/getStats', (req, res) => {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Filter out deleted components
    const activeComponents = components.filter(c => !c.cancellato);
    
    // Handle edge case: no components
    if (activeComponents.length === 0) {
      return res.json({
        inLavorazione: { count: 0, label: "In lavorazione" },
        daSpedire: { count: 0, label: "Da spedire" },
        verificato: { count: 0, percentage: 0, total: 0, label: "Non verificati" },
        speditiOggi: { count: 0, label: "Spediti oggi" },
        commesseAperte: { count: 0, label: "Commesse aperte" },
        inTrattamento: { count: 0, label: "In trattamento" },
        meta: {
          totalComponents: 0,
          timestamp: new Date().toISOString(),
          calculatedAt: today.toLocaleDateString()
        }
      });
    }
    
    // 1. In lavorazione: components where status != '6' (not shipped)
    const inLavorazione = activeComponents.filter(c => c.status !== '6').length;
    
    // 2. Da spedire: components with status '5' (ready for delivery)
    const daSpedire = activeComponents.filter(c => c.status === '5').length;
    
    // 3. Verificato: non-shipped components where verificato=false, with percentage
    const nonSpediti = activeComponents.filter(c => c.status !== '6');
    const nonVerificati = nonSpediti.filter(c => !c.verificato).length;
    const verificatoPercentage = nonSpediti.length > 0 ? Math.round((nonVerificati / nonSpediti.length) * 100) : 0;
    
    // 4. Spediti oggi: components with status '6' and today's date
    const speditiOggi = activeComponents.filter(c => {
      if (c.status !== '6') return false;
      
      // Check if any history entry shows transition to '6' today
      const speditoToday = c.history?.some(h => {
        if (h.to !== '6') return false;
        const historyDate = new Date(h.date);
        const historyDateStr = historyDate.toISOString().split('T')[0];
        return historyDateStr === todayStr;
      });
      
      return speditoToday;
    }).length;
    
    // 5. Commesse aperte: commesse that have at least one non-shipped component
    const commesseConComponentiNonSpediti = new Set();
    activeComponents.forEach(c => {
      if (c.status !== '6') {
        commesseConComponentiNonSpediti.add(c.commessaId);
      }
    });
    const commesseAperte = commesseConComponentiNonSpediti.size;
    
    // 6. In trattamento: components in treatment states (status starting with '4:')
    const inTrattamento = activeComponents.filter(c => c.status && c.status.startsWith('4:')).length;
    
    const stats = {
      inLavorazione: {
        count: inLavorazione,
        label: "In lavorazione"
      },
      daSpedire: {
        count: daSpedire,
        label: "Da spedire"
      },
      verificato: {
        count: nonVerificati,
        percentage: verificatoPercentage,
        total: nonSpediti.length,
        label: "Non verificati"
      },
      speditiOggi: {
        count: speditiOggi,
        label: "Spediti oggi"
      },
      commesseAperte: {
        count: commesseAperte,
        label: "Commesse aperte"
      },
      inTrattamento: {
        count: inTrattamento,
        label: "In trattamento"
      },
      // Meta information
      meta: {
        totalComponents: activeComponents.length,
        timestamp: new Date().toISOString(),
        calculatedAt: today.toLocaleDateString()
      }
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error calculating stats:', error);
    res.status(500).json({ error: 'Internal server error calculating stats' });
  }
});

app.listen(PORT, () => console.log(`PoC backend listening on ${PORT}`));
