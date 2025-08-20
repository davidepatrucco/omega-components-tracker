require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
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
app.use(cookieParser());

// Auth routes (will use real DB when connected)
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

// Mount resource routers (use Mongoose-backed implementations)
const componentsRouter = require('./routes/components');
const commesseRouter = require('./routes/commesse');
const changeStatusRouter = require('./routes/changestatus');

app.use('/components', componentsRouter);
app.use('/commesse', commesseRouter);
app.use('/changestatus', changeStatusRouter);

// Health endpoint (reports basic health)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`PoC backend listening on ${PORT}`));
} else {
  module.exports = app;
}
