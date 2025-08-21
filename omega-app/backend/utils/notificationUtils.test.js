/**
 * Simple test for notification functionality
 */

const { createStatusChangeNotification } = require('./notificationUtils');

// Mock the shared status config
jest.mock('../../shared/statusConfig.js', () => ({
  BASE_STATUSES: {
    NUOVO: '1',
    PRODUZIONE_INTERNA: '2',
    PRODUZIONE_ESTERNA: '2-ext',
    COSTRUITO: '3',
    IN_TRATTAMENTO: '4',
    PRONTO_CONSEGNA: '5',
    SPEDITO: '6'
  }
}));

// Mock the models
jest.mock('../models/Notification', () => ({
  createNotification: jest.fn().mockResolvedValue({ _id: 'test-notification' })
}));

jest.mock('../models/User', () => ({
  find: jest.fn().mockImplementation(({ profilo }) => {
    const allUsers = [
      { _id: 'user1', username: 'testuser1', profilo: 'UFF' },
      { _id: 'user2', username: 'testuser2', profilo: 'TRATT' }
    ];
    
    if (profilo && profilo.$in) {
      return Promise.resolve(allUsers.filter(user => profilo.$in.includes(user.profilo)));
    }
    return Promise.resolve(allUsers);
  })
}));

describe('Notification Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates notification for status change to PRONTO_CONSEGNA', async () => {
    const component = {
      _id: 'comp123',
      descrizioneComponente: 'Test Component',
      commessaCode: 'COMM001',
      trattamenti: []
    };

    const notifications = await createStatusChangeNotification(
      component, 
      '3', // from COSTRUITO
      '5', // to PRONTO_CONSEGNA
      'testuser'
    );

    expect(notifications).toHaveLength(1);
  });

  test('creates notification for status change to COSTRUITO with treatments', async () => {
    const component = {
      _id: 'comp123',
      descrizioneComponente: 'Test Component',
      commessaCode: 'COMM001',
      trattamenti: ['zinc', 'paint']
    };

    const notifications = await createStatusChangeNotification(
      component, 
      '2', // from PRODUZIONE_INTERNA
      '3', // to COSTRUITO
      'testuser'
    );

    expect(notifications).toHaveLength(2); // UFF + TRATT users
  });

  test('does not create notification for other status changes', async () => {
    const component = {
      _id: 'comp123',
      descrizioneComponente: 'Test Component',
      commessaCode: 'COMM001',
      trattamenti: []
    };

    const notifications = await createStatusChangeNotification(
      component, 
      '1', // from NUOVO
      '2', // to PRODUZIONE_INTERNA
      'testuser'
    );

    expect(notifications).toHaveLength(0);
  });
});