const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
let mongod;
let app;
const Commessa = require('../models/Commessa');
const Component = require('../models/Component');

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  process.env.MONGO_URI = uri;
  app = require('../server');
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

beforeEach(async () => {
  await Commessa.deleteMany({});
  await Component.deleteMany({});
});
async function loginAsAdmin() {
  // ensure admin exists
  const bcrypt = require('bcryptjs');
  const User = require('../models/User');
  await User.deleteMany({});
  const hash = await bcrypt.hash('changeme', 10);
  await User.create({ username: 'admin', password: hash, profilo: 'ADMIN' });
  const res = await request(app).post('/auth/login').send({ username: 'admin', password: 'changeme' }).expect(200);
  return res.body.accessToken;
}

test('create commessa, create component, list components, update component, change status', async () => {
  // create commessa
  const token = await loginAsAdmin();
  const cRes = await request(app).post('/api/commesse').set('Authorization', `Bearer ${token}`).send({ code: 'C-100', name: 'Test Commessa' }).expect(201);
  const commessa = cRes.body;

  // create component
  const compRes = await request(app).post('/api/components').set('Authorization', `Bearer ${token}`).send({ commessaId: commessa._id, descrizioneComponente: 'CompA', barcode: 'B001', status: '1' });
  console.log('Component creation response:', compRes.status, compRes.body);
  expect(compRes.status).toBe(201);
  const comp = compRes.body;
  expect(comp.descrizioneComponente).toBe('CompA');

  // list components
  const list = await request(app).get('/api/components').set('Authorization', `Bearer ${token}`).expect(200);
  expect(list.body.total).toBe(1);

  // update component
  const upd = await request(app).put(`/api/components/${comp._id}`).set('Authorization', `Bearer ${token}`).send({ descrizioneComponente: 'CompA-upd' }).expect(200);
  expect(upd.body.descrizioneComponente).toBe('CompA-upd');

  // change status
  const ch = await request(app).post('/api/changestatus').set('Authorization', `Bearer ${token}`).send({ componentId: comp._id, to: '2', note: 'ok' }).expect(200);
  expect(ch.body.status).toBe('2');
  expect(Array.isArray(ch.body.history)).toBe(true);
});
