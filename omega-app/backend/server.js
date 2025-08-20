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
let components = [];
let commesse = [{ _id: 'c1', code: 'COM-001', name: 'Commessa PoC', notes: 'Esempio' }];

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

app.listen(PORT, () => console.log(`PoC backend listening on ${PORT}`));
