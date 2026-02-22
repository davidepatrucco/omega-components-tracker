/**
 * Integration Tests - Omega Components Tracker Backend
 * Uses in-memory MongoDB for isolated testing
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Import models early - they'll be required after DB connection
let User, Component, Commessa;

let mongoServer;
let app;
let authToken;
let userId;

// Setup: Start in-memory MongoDB
beforeAll(async () => {
  try {
    // Download and start MongoDB memory server
    console.log('🚀 Starting MongoDB Memory Server...');
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Set environment to test database - MUST use correct JWT secret var
    process.env.MONGO_URI = mongoUri;
    process.env.JWT_ACCESS_SECRET = 'test-access-secret-key';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key';
    process.env.NODE_ENV = 'test';
    
    console.log('✅ MongoDB Memory Server started');
    
    // Clear any existing mongoose connections
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    
    // Connect to in-memory database
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected to MongoDB Memory Server');
    
    // Import/require app after setting env vars and connecting
    if (app) {
      // App already loaded, just clear models
      const models = mongoose.modelNames();
      for (const model of models) {
        await mongoose.model(model).deleteMany({});
      }
    } else {
      app = require('../server');
    }
    
    // Now require models after app has initialized them
    User = require('../models/User');
    Component = require('../models/Component');
    Commessa = require('../models/Commessa');
  } catch (err) {
    console.error('❌ Failed to start test environment:', err.message);
    throw err;
  }
});

// Cleanup: Stop in-memory MongoDB
afterAll(async () => {
  try {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
    console.log('✅ Test environment cleaned up');
  } catch (err) {
    console.error('❌ Error cleaning up:', err);
  }
});

// Clear collections before each test
beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Component.deleteMany({}),
    Commessa.deleteMany({})
  ]);
});

describe('Authentication', () => {
  test('POST /auth/login with valid credentials should return accessToken', async () => {
    // Setup: Create user
    const hash = await bcrypt.hash('password123', 10);
    const user = await User.create({
      username: 'testuser',
      password: hash,
      profilo: 'USER'
    });
    userId = user._id;

    // Test
    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'testuser', password: 'password123' })
      .expect(200);

    expect(res.body).toHaveProperty('accessToken');
    expect(res.body.user.username).toBe('testuser');
    authToken = res.body.accessToken;
  });

  test('POST /auth/login with invalid password should return 401', async () => {
    const hash = await bcrypt.hash('password123', 10);
    await User.create({
      username: 'testuser',
      password: hash,
      profilo: 'USER'
    });

    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'testuser', password: 'wrongpass' })
      .expect(401);

    expect(res.body.error).toBeDefined();
  });

  test('POST /auth/login with missing credentials should return 400', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'testuser' })
      .expect(400);

    expect(res.body.error).toBeDefined();
  });
});

describe('Components API', () => {
  beforeEach(async () => {
    // Setup: Create test user and get auth token
    const hash = await bcrypt.hash('password123', 10);
    const user = await User.create({
      username: 'testuser',
      password: hash,
      profilo: 'USER'
    });
    userId = user._id;

    // Generate correct JWT token with 'sub' claim and correct secret
    authToken = jwt.sign(
      { sub: userId.toString() },
      process.env.JWT_ACCESS_SECRET || 'test-access-secret-key',
      { expiresIn: '15m' }
    );
  });

  test('GET /api/components should return empty array initially', async () => {
    const res = await request(app)
      .get('/api/components')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('items');
    expect(res.body).toHaveProperty('total');
    expect(res.body.items.length).toBe(0);
    expect(res.body.total).toBe(0);
  });

  test('POST /api/components should create a new component with valid commessaId', async () => {
    // First create a Commessa
    const commessa = await Commessa.create({
      code: 'COM001',
      name: 'Test Order',
      customer: 'Test Customer',
      notes: 'Test notes'
    });

    const componentData = {
      commessaId: commessa._id.toString(),
      type: 'INT',
      status: '1',
      descrizioneComponente: 'Test Component'
    };

    const res = await request(app)
      .post('/api/components')
      .set('Authorization', `Bearer ${authToken}`)
      .send(componentData)
      .expect(201);

    expect(res.body).toHaveProperty('_id');
    expect(res.body.descrizioneComponente).toBe('Test Component');
    expect(res.body.status).toBe('1');
    expect(res.body.commessaName).toBe('Test Order');
    expect(res.body.commessaCode).toBe('COM001');
  });

  test('GET /api/components should return created components', async () => {
    // Create test commessa
    const commessa = await Commessa.create({
      code: 'COM001',
      name: 'Test Order',
      customer: 'Test Customer'
    });

    // Create test component
    await Component.create({
      commessaId: commessa._id,
      commessaCode: commessa.code,
      commessaName: commessa.name,
      descrizioneComponente: 'Test Component',
      type: 'INT',
      status: '1'
    });

    const res = await request(app)
      .get('/api/components')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.items.length).toBe(1);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].descrizioneComponente).toBe('Test Component');
  });

  test('POST /api/components/:id/change-status should update component status', async () => {
    // Create test commessa and component
    const commessa = await Commessa.create({
      code: 'COM001',
      name: 'Test Order',
      customer: 'Test Customer'
    });

    const component = await Component.create({
      commessaId: commessa._id,
      commessaCode: commessa.code,
      commessaName: commessa.name,
      descrizioneComponente: 'Test Component',
      type: 'INT',
      status: '1'
    });

    const res = await request(app)
      .post(`/api/components/${component._id}/change-status`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ newStatus: '2', note: 'Changed status' })
      .expect(200);

    expect(res.body.status).toBe('2');
    expect(res.body.history.length).toBeGreaterThan(0);
    expect(res.body.history[res.body.history.length - 1].to).toBe('2');
  });
});

describe('Status Validation', () => {
  test('should validate status transitions', async () => {
    const statusConfig = require('../../shared/statusConfig');
    
    expect(statusConfig.BASE_STATUSES.NUOVO).toBe('1');
    expect(statusConfig.BASE_STATUSES.SPEDITO).toBe('6');
    expect(statusConfig.TREATMENT_PHASES.PREP).toBe('PREP');
  });

  test('should parse treatment status correctly', async () => {
    const statusConfig = require('../../shared/statusConfig');
    
    const status = statusConfig.createTreatmentStatus('Anodize', 'IN');
    expect(status).toBe('4:Anodize:IN');
    
    const parsed = statusConfig.parseTreatmentStatus(status);
    expect(parsed.treatmentName).toBe('Anodize');
    expect(parsed.phase).toBe('IN');
  });
});

describe('Error Handling', () => {
  test('GET /api/invalid should return 404', async () => {
    await request(app)
      .get('/api/invalid-endpoint')
      .expect(404);
  });

  test('POST /api/components without auth should return 401', async () => {
    const res = await request(app)
      .post('/api/components')
      .send({ commessaId: '123' })
      .expect(401);

    expect(res.body.error).toBeDefined();
  });
});
