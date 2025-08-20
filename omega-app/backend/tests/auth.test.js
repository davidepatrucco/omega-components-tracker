const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
let mongod;
let app;
const User = require('../models/User');
const bcrypt = require('bcryptjs');

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  process.env.MONGO_URI = uri;
  // Import server after setting MONGO_URI
  app = require('../server');
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  const hash = await bcrypt.hash('changeme', 10);
  await User.create({ username: 'admin', password: hash, profilo: 'ADMIN' });
});

test('POST /auth/login returns accessToken and sets refresh cookie', async () => {
  const res = await request(app)
    .post('/auth/login')
    .send({ username: 'admin', password: 'changeme' })
    .expect(200);

  expect(res.body).toHaveProperty('accessToken');
  expect(res.body.user.username).toBe('admin');
  // cookie-parser places cookies in headers['set-cookie']
  const cookies = res.headers['set-cookie'];
  expect(cookies).toBeDefined();
  expect(cookies.some(c => c.startsWith('refreshToken='))).toBe(true);
});

test('POST /auth/login with wrong password returns 401', async () => {
  await request(app)
    .post('/auth/login')
    .send({ username: 'admin', password: 'wrong' })
    .expect(401);
});

test('POST /auth/refresh returns new access token when cookie present', async () => {
  const login = await request(app)
    .post('/auth/login')
    .send({ username: 'admin', password: 'changeme' })
    .expect(200);
  const cookies = login.headers['set-cookie'];
  const refreshCookie = cookies.find(c => c.startsWith('refreshToken='));
  const res = await request(app)
    .post('/auth/refresh')
    .set('Cookie', refreshCookie)
    .expect(200);
  expect(res.body).toHaveProperty('accessToken');
});

test('refresh rotates refresh token and invalidates old one', async () => {
  const login = await request(app).post('/auth/login').send({ username: 'admin', password: 'changeme' }).expect(200);
  const cookies = login.headers['set-cookie'];
  const refreshCookie = cookies.find(c => c.startsWith('refreshToken='));

  // first refresh -> should return new cookie
  const r1 = await request(app).post('/auth/refresh').set('Cookie', refreshCookie).expect(200);
  const newCookies = r1.headers['set-cookie'];
  expect(newCookies).toBeDefined();
  const newRefresh = newCookies.find(c => c.startsWith('refreshToken='));
  expect(newRefresh).toBeDefined();

  // using the original cookie again should fail (revoked)
  await request(app).post('/auth/refresh').set('Cookie', refreshCookie).expect(401);
});

test('logout revokes refresh token', async () => {
  const login = await request(app).post('/auth/login').send({ username: 'admin', password: 'changeme' }).expect(200);
  const cookies = login.headers['set-cookie'];
  const refreshCookie = cookies.find(c => c.startsWith('refreshToken='));
  await request(app).post('/auth/logout').set('Cookie', refreshCookie).expect(204);
  // using the same cookie should fail
  await request(app).post('/auth/refresh').set('Cookie', refreshCookie).expect(401);
});
