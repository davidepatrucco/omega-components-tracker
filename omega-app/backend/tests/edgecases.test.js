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

test('POST /commesse validation and duplicate code -> 400 then 409', async () => {
  const bcrypt = require('bcryptjs');
  const User = require('../models/User');
  await User.deleteMany({});
  const hash = await bcrypt.hash('changeme', 10);
  await User.create({ username: 'admin', password: hash, profilo: 'ADMIN' });
  const login = await request(app).post('/auth/login').send({ username: 'admin', password: 'changeme' }).expect(200);
  const token = login.body.accessToken;

  // missing fields
  await request(app).post('/api/commesse').set('Authorization', `Bearer ${token}`).send({ name: 'NoCode' }).expect(400);

  // create ok
  await request(app).post('/api/commesse').set('Authorization', `Bearer ${token}`).send({ code: 'DUP1', name: 'Dup Test' }).expect(201);

  // duplicate
  await request(app).post('/api/commesse').set('Authorization', `Bearer ${token}`).send({ code: 'DUP1', name: 'Dup Test 2' }).expect(409);
});

test('GET /commesse/:id with invalid id returns 400', async () => {
  const bcrypt = require('bcryptjs');
  const User = require('../models/User');
  await User.deleteMany({});
  const hash = await bcrypt.hash('changeme', 10);
  await User.create({ username: 'admin', password: hash, profilo: 'ADMIN' });
  const login = await request(app).post('/auth/login').send({ username: 'admin', password: 'changeme' }).expect(200);
  const token = login.body.accessToken;
  await request(app).get('/api/commesse/invalid-id').set('Authorization', `Bearer ${token}`).expect(400);
});

test('components pagination and filtering', async () => {
  const bcrypt = require('bcryptjs');
  const User = require('../models/User');
  await User.deleteMany({});
  const hash = await bcrypt.hash('changeme', 10);
  await User.create({ username: 'admin', password: hash, profilo: 'ADMIN' });
  const login = await request(app).post('/auth/login').send({ username: 'admin', password: 'changeme' }).expect(200);
  const token = login.body.accessToken;

  const c = await request(app).post('/api/commesse').set('Authorization', `Bearer ${token}`).send({ code: 'PAG', name: 'Pag' }).expect(201);
  const commessaId = c.body._id;

  // create 30 components
  const createPromises = [];
  for (let i = 0; i < 30; i++) {
  createPromises.push(request(app).post('/api/components').set('Authorization', `Bearer ${token}`).send({ commessaId, descrizioneComponente: `comp${i}`, barcode: `B${i}`, status: '1' }));
  }
  const results = await Promise.all(createPromises);
  expect(results.every(r => r.status === 201)).toBe(true);

  // default page size 25
  const firstPage = await request(app).get('/api/components').set('Authorization', `Bearer ${token}`).expect(200);
  expect(firstPage.body.total).toBe(30);
  expect(firstPage.body.items.length).toBe(25);

  // page 2
  const secondPage = await request(app).get('/api/components').set('Authorization', `Bearer ${token}`).query({ page: 2 }).expect(200);
  expect(secondPage.body.items.length).toBe(5);

  // filter by q
  const qRes = await request(app).get('/components').set('Authorization', `Bearer ${token}`).query({ q: 'comp1' }).expect(200);
  // should match comp1, comp10..comp19 => at least 2
  expect(qRes.body.total).toBeGreaterThanOrEqual(2);
});

test('POST /components without commessaId returns 400', async () => {
  const bcrypt = require('bcryptjs');
  const User = require('../models/User');
  await User.deleteMany({});
  const hash = await bcrypt.hash('changeme', 10);
  await User.create({ username: 'admin', password: hash, profilo: 'ADMIN' });
  const login = await request(app).post('/auth/login').send({ username: 'admin', password: 'changeme' }).expect(200);
  const token = login.body.accessToken;
  await request(app).post('/api/components').set('Authorization', `Bearer ${token}`).send({ descrizioneComponente: 'NoComm' }).expect(400);
});

test('PUT /components/:id with invalid id returns 400', async () => {
  const bcrypt = require('bcryptjs');
  const User = require('../models/User');
  await User.deleteMany({});
  const hash = await bcrypt.hash('changeme', 10);
  await User.create({ username: 'admin', password: hash, profilo: 'ADMIN' });
  const login = await request(app).post('/auth/login').send({ username: 'admin', password: 'changeme' }).expect(200);
  const token = login.body.accessToken;
  await request(app).put('/api/components/invalid-id').set('Authorization', `Bearer ${token}`).send({ descrizioneComponente: 'x' }).expect(400);
});

test('changestatus validation and non-existent component', async () => {
  const bcrypt = require('bcryptjs');
  const User = require('../models/User');
  await User.deleteMany({});
  const hash = await bcrypt.hash('changeme', 10);
  await User.create({ username: 'admin', password: hash, profilo: 'ADMIN' });
  const login = await request(app).post('/auth/login').send({ username: 'admin', password: 'changeme' }).expect(200);
  const token = login.body.accessToken;
  // missing fields
  await request(app).post('/api/changestatus').set('Authorization', `Bearer ${token}`).send({}).expect(400);
  // non-existent component
  const fakeId = new mongoose.Types.ObjectId();
  await request(app).post('/api/changestatus').set('Authorization', `Bearer ${token}`).send({ componentId: fakeId.toString(), to: '2' }).expect(404);
});
