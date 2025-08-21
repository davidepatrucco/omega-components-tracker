// load env: prefer project-level omega.env (repo root) then backend/.env
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const repoRootEnv = path.resolve(__dirname, '..', '..', '.env');
if (fs.existsSync(repoRootEnv)) {
  dotenv.config({ path: repoRootEnv });
  console.log('Loaded env from repo root .env:', repoRootEnv);
} else {
  // fallback to default .env in backend folder
  dotenv.config();
  console.log('Loaded env from backend .env (if present)');
}
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
app.use(cookieParser());

// Auth routes (will use real DB when connected)
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

// Mount resource routers (use Mongoose-backed implementations)
const componentsRouter = require('./routes/components');
const commesseRouter = require('./routes/commesse');
const changeStatusRouter = require('./routes/changestatus');
const utentiRouter = require('./routes/utenti');
const notificationsRouter = require('./routes/notifications');


app.use('/components', componentsRouter);
app.use('/commesse', commesseRouter);
app.use('/changestatus', changeStatusRouter);
app.use('/utenti', utentiRouter);
app.use('/notifications', notificationsRouter);


// Health endpoint (reports basic health)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
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
