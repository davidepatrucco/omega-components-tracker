// Simple seed script for omega-app backend
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const WorkStatus = require('../models/WorkStatus');
const User = require('../models/User');
const Commessa = require('../models/Commessa');

const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/omega';

async function seed() {
  await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to', MONGO);

  // default work statuses (example minimal set)
  const defaults = [
    { code: '1', label: 'Nuovo', order: 1 },
    { code: '2', label: 'Produzione Interna', order: 2 },
    { code: '3', label: 'Costruito', order: 3 },
    { code: '5', label: 'Pronto per consegna', order: 5 },
    { code: '6', label: 'Spedito', order: 6 }
  ];

  for (const s of defaults) {
    await WorkStatus.findOneAndUpdate({ code: s.code }, s, { upsert: true });
    console.log('seeded status', s.code);
  }

  // admin user
  const adminUser = await User.findOne({ username: 'admin' });
  if (!adminUser) {
    const hash = await bcrypt.hash('changeme', 10);
    await User.create({ username: 'admin', password: hash, email: 'admin@example.com', profilo: 'ADMIN' });
    console.log('created admin user (username: admin, password: changeme)');
  } else {
    console.log('admin user exists');
  }

  // sample commessa
  const comm = await Commessa.findOne({ code: 'C-001' });
  if (!comm) {
    await Commessa.create({ code: 'C-001', name: 'Commessa di esempio' });
    console.log('created sample commessa C-001');
  } else {
    console.log('sample commessa exists');
  }

  await mongoose.disconnect();
  console.log('Seed complete');
}

seed().catch(err => { console.error(err); process.exit(1); });
