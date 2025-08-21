const request = require('supertest');
const express = require('express');
const statsRouter = require('../routes/stats');

// Mock the dependencies
jest.mock('../models/Component');
jest.mock('../models/Commessa');
jest.mock('../middleware/auth');

const Component = require('../models/Component');
const { requireAuth } = require('../middleware/auth');

// Mock auth middleware to pass through
requireAuth.mockImplementation((req, res, next) => next());

describe('Stats API', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/stats', statsRouter);
  });

  test('GET /stats returns correct statistics', async () => {
    // Mock current date
    const mockDate = new Date('2024-01-15T10:00:00Z');
    jest.useFakeTimers().setSystemTime(mockDate);

    // Mock component data
    const mockComponents = [
      {
        _id: '1',
        commessaId: 'comm1',
        status: '1', // in lavorazione
        verificato: false,
        history: []
      },
      {
        _id: '2', 
        commessaId: 'comm1',
        status: '5', // pronto da spedire
        verificato: true,
        history: []
      },
      {
        _id: '3',
        commessaId: 'comm2', 
        status: '6', // spedito
        verificato: true,
        history: [{ to: '6', date: new Date('2024-01-15T09:00:00Z') }] // spedito oggi
      },
      {
        _id: '4',
        commessaId: 'comm2',
        status: '4:nichelatura:IN', // in trattamento
        verificato: false,
        history: []
      },
      {
        _id: '5',
        commessaId: 'comm3',
        status: '6', // spedito
        verificato: true,
        history: [{ to: '6', date: new Date('2024-01-14T09:00:00Z') }] // spedito ieri
      }
    ];

    Component.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockComponents)
    });

    const response = await request(app).get('/stats');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      inLavorazione: 3, // all except those with status '6' (components 1, 2, 4)
      daSpedire: 1, // status '5' (component 2)
      verificato: {
        nonVerificati: 2, // 2 components with verificato: false among non-shipped (components 1, 4)
        total: 3, // total non-shipped components (components 1, 2, 4)
        percentage: 67 // Math.round((2/3) * 100) = 67
      },
      speditOggi: 1, // 1 component shipped today (component 3)
      commesseAperte: 2, // 2 unique commesse with non-shipped components (comm1, comm2)
      inTrattamento: 1 // 1 component with status starting with '4:' (component 4)
    });

    jest.useRealTimers();
  });

  test('GET /stats handles database errors', async () => {
    Component.find.mockReturnValue({
      lean: jest.fn().mockRejectedValue(new Error('Database error'))
    });

    const response = await request(app).get('/stats');

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Error calculating statistics');
  });
});