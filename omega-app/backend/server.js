// load env from backend/.env
const dotenv = require('dotenv');
dotenv.config();
console.log('Loaded env from backend .env');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const upload = multer({ dest: './upload' });
const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 4000;

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174', // Aggiungi anche porta 5174 per il dev
  process.env.FRONTEND_ORIGIN
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
app.use(cookieParser());

// Auth routes (will use real DB when connected)
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

// Mount resource routers (use Mongoose-backed implementations)
const componentsRouter = require('./routes/components');
const commesseRouter = require('./routes/commesse');
const changeStatusRouter = require('./routes/changestatus');
const statsRouter = require('./routes/stats');
const utentiRouter = require('./routes/utenti');
const notificationsRouter = require('./routes/notifications');
const filesRouter = require('./routes/files');
const treatmentsRouter = require('./routes/treatments');
const reportsRouter = require('./routes/reports');

app.use('/api/components', componentsRouter);
app.use('/api/commesse', commesseRouter);
app.use('/api/changestatus', changeStatusRouter);
app.use('/api/stats', statsRouter);
app.use('/api/utenti', utentiRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/files', filesRouter);
app.use('/api/treatments', treatmentsRouter);
app.use('/api/reports', reportsRouter);

// Health endpoint (reports basic health)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// System info endpoint (shows environment and configuration details)
app.get('/api/system-info', (req, res) => {
  // Determine environment based on NODE_ENV or MONGO_URI
  let environment = 'DEVELOPMENT';
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/omega';
  
  if (mongoUri.includes('omega-staging')) {
    environment = 'STAGING';
  } else if (mongoUri.includes('omega-prod') || mongoUri.includes('production')) {
    environment = 'PRODUCTION';
  } else if (mongoUri.includes('localhost')) {
    environment = 'DEVELOPMENT';
  }
  
  // Clean MONGO_URI (remove credentials)
  let cleanMongoUri = mongoUri;
  if (mongoUri.includes('://')) {
    const parts = mongoUri.split('://');
    const protocol = parts[0];
    const rest = parts[1];
    
    if (rest.includes('@')) {
      const afterCredentials = rest.split('@')[1];
      cleanMongoUri = `${protocol}://${afterCredentials}`;
    }
  }
  
  res.json({
    environment,
    serverIP: req.hostname || req.ip || 'unknown',
    mongoUri: cleanMongoUri,
    port: PORT,
    nodeEnv: process.env.NODE_ENV || 'not set'
  });
});

const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/omega';

async function start() {
  // connect to MongoDB
  try {
    await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB:', MONGO);
  } catch (err) {
    console.error('Mongo connection error', err);
    throw err;
  }

  // ensure default dummy user exists (username: d / password: d)
  try {
    const existing = await User.findOne({ username: 'd' });
    if (!existing) {
      const hash = await bcrypt.hash('d', 10);
      await User.create({ username: 'd', password: hash, profilo: 'ADMIN' });
      console.log('Created default user: d');
    } else {
      console.log('Default user exists');
    }
  } catch (err) {
    console.error('Error ensuring default user', err);
    throw err;
  }

  app.listen(PORT, () => console.log(`backend listening on ${PORT}`));
}

if (require.main === module) {
  start().catch(err => { console.error(err); process.exit(1); });
} else {
  module.exports = app;
}
