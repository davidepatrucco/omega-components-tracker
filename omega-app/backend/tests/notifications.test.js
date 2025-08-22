/**
 * Test per verificare la creazione automatica di notifiche durante i cambi di stato
 */

const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const User = require('../models/User');
const Component = require('../models/Component');
const Commessa = require('../models/Commessa');
const Notification = require('../models/Notification');

let mongoServer;
let token;
let adminUser;
let uffUser;
let trattUser;
let testCommessa;

describe('Notifications on Status Changes', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Pulisci il database
    await User.deleteMany({});
    await Component.deleteMany({});
    await Commessa.deleteMany({});
    await Notification.deleteMany({});

    // Crea utenti con profili diversi
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    adminUser = await User.create({
      username: 'admin',
      email: 'admin@test.com',
      password: hashedPassword,
      profilo: 'ADMIN'
    });

    uffUser = await User.create({
      username: 'ufficio',
      email: 'uff@test.com', 
      password: hashedPassword,
      profilo: 'UFF'
    });

    trattUser = await User.create({
      username: 'trattamenti',
      email: 'tratt@test.com',
      password: hashedPassword,
      profilo: 'TRATT'
    });

    // Login come admin per i test
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({ username: 'admin', password: 'password123' })
      .expect(200);
    
    token = loginResponse.body.accessToken;

    // Crea una commessa di test
    testCommessa = await Commessa.create({
      code: 'COMM-TEST',
      name: 'Test Commessa',
      notes: '',
      createdAt: new Date()
    });
  });

  describe('Status change to PRONTO_CONSEGNA (5)', () => {
    test('should create notification for UFF profile when component becomes ready for shipping', async () => {
      // Crea componente
      const component = await Component.create({
        commessaId: testCommessa._id,
        commessaCode: testCommessa.code,
        commessaName: testCommessa.name,
        commessaNotes: '',
        commessaCreatedAt: testCommessa.createdAt,
        descrizioneComponente: 'Test Component Ready',
        barcode: 'BC001',
        status: '3', // Costruito
        trattamenti: [],
        allowedStatuses: ['1', '2', '2-ext', '3', '5', '6'],
        verificato: false,
        cancellato: false,
        history: []
      });

      // Cambia stato a "Pronto per consegna"
      const response = await request(app)
        .post('/api/changestatus')
        .set('Authorization', `Bearer ${token}`)
        .send({
          componentId: component._id,
          to: '5', // PRONTO_CONSEGNA
          note: 'Ready for shipping'
        })
        .expect(200);

      // Verifica che la notifica sia stata creata
      const notifications = await Notification.find({});
      expect(notifications).toHaveLength(1);

      const notification = notifications[0];
      expect(notification.userId).toEqual(uffUser._id);
      expect(notification.username).toBe('ufficio');
      expect(notification.title).toBe('Componente pronto per spedizione');
      expect(notification.message).toContain('Test Component Ready');
      expect(notification.message).toContain('COMM-TEST');
      expect(notification.message).toContain('pronto per la spedizione');
      expect(notification.priority).toBe('high');
      expect(notification.type).toBe('info');
      expect(notification.isRead).toBe(false);
      expect(notification.relatedEntity.type).toBe('component');
      expect(notification.relatedEntity.id).toEqual(component._id);
      expect(notification.actionUrl).toBe(`/lavorazioni?componentId=${component._id}`);
    });
  });

  describe('Status change to COSTRUITO (3) with treatments', () => {
    test('should create notifications for UFF and TRATT profiles when component is built with treatments', async () => {
      // Crea componente con trattamenti
      const component = await Component.create({
        commessaId: testCommessa._id,
        commessaCode: testCommessa.code,
        commessaName: testCommessa.name,
        commessaNotes: '',
        commessaCreatedAt: testCommessa.createdAt,
        descrizioneComponente: 'Test Component With Treatments',
        barcode: 'BC002',
        status: '2', // Produzione Interna
        trattamenti: ['zinc', 'paint'],
        allowedStatuses: ['1', '2', '2-ext', '3', '4:zinc:PREP', '4:zinc:IN', '4:zinc:ARR', '4:paint:PREP', '4:paint:IN', '4:paint:ARR', '5', '6'],
        verificato: false,
        cancellato: false,
        history: []
      });

      // Cambia stato a "Costruito"
      const response = await request(app)
        .post('/api/changestatus')
        .set('Authorization', `Bearer ${token}`)
        .send({
          componentId: component._id,
          to: '3', // COSTRUITO
          note: 'Built and ready for treatments'
        })
        .expect(200);

      // Verifica che siano state create 2 notifiche (UFF + TRATT)
      const notifications = await Notification.find({}).sort({ username: 1 });
      expect(notifications).toHaveLength(2);

      // Verifica notifica per TRATT
      const trattNotification = notifications.find(n => n.username === 'trattamenti');
      expect(trattNotification).toBeDefined();
      expect(trattNotification.userId).toEqual(trattUser._id);
      expect(trattNotification.title).toBe('Componente costruito con trattamenti');
      expect(trattNotification.message).toContain('Test Component With Treatments');
      expect(trattNotification.message).toContain('COMM-TEST');
      expect(trattNotification.message).toContain('zinc, paint');
      expect(trattNotification.priority).toBe('high');

      // Verifica notifica per UFF
      const uffNotification = notifications.find(n => n.username === 'ufficio');
      expect(uffNotification).toBeDefined();
      expect(uffNotification.userId).toEqual(uffUser._id);
      expect(uffNotification.title).toBe('Componente costruito con trattamenti');
      expect(uffNotification.message).toContain('Test Component With Treatments');
      expect(uffNotification.message).toContain('COMM-TEST');
      expect(uffNotification.message).toContain('zinc, paint');
      expect(uffNotification.priority).toBe('high');
    });

    test('should NOT create notifications when component is built WITHOUT treatments', async () => {
      // Crea componente senza trattamenti
      const component = await Component.create({
        commessaId: testCommessa._id,
        commessaCode: testCommessa.code,
        commessaName: testCommessa.name,
        commessaNotes: '',
        commessaCreatedAt: testCommessa.createdAt,
        descrizioneComponente: 'Test Component No Treatments',
        barcode: 'BC003',
        status: '2', // Produzione Interna
        trattamenti: [], // Nessun trattamento
        allowedStatuses: ['1', '2', '2-ext', '3', '5', '6'],
        verificato: false,
        cancellato: false,
        history: []
      });

      // Cambia stato a "Costruito"
      const response = await request(app)
        .post('/api/changestatus')
        .set('Authorization', `Bearer ${token}`)
        .send({
          componentId: component._id,
          to: '3', // COSTRUITO
          note: 'Built without treatments'
        })
        .expect(200);

      // Verifica che NON siano state create notifiche
      const notifications = await Notification.find({});
      expect(notifications).toHaveLength(0);
    });
  });

  describe('Other status changes should NOT create notifications', () => {
    test('should NOT create notifications for NUOVO -> PRODUZIONE_INTERNA', async () => {
      const component = await Component.create({
        commessaId: testCommessa._id,
        commessaCode: testCommessa.code,
        commessaName: testCommessa.name,
        commessaNotes: '',
        commessaCreatedAt: testCommessa.createdAt,
        descrizioneComponente: 'Test Component Normal',
        barcode: 'BC004',
        status: '1', // Nuovo
        trattamenti: [],
        allowedStatuses: ['1', '2', '2-ext', '3', '5', '6'],
        verificato: false,
        cancellato: false,
        history: []
      });

      // Cambia stato a "Produzione Interna"
      await request(app)
        .post('/api/changestatus')
        .set('Authorization', `Bearer ${token}`)
        .send({
          componentId: component._id,
          to: '2', // PRODUZIONE_INTERNA
          note: 'Starting production'
        })
        .expect(200);

      // Verifica che NON siano state create notifiche
      const notifications = await Notification.find({});
      expect(notifications).toHaveLength(0);
    });

    test('should NOT create notifications for PRODUZIONE_INTERNA -> PRODUZIONE_ESTERNA', async () => {
      const component = await Component.create({
        commessaId: testCommessa._id,
        commessaCode: testCommessa.code,
        commessaName: testCommessa.name,
        commessaNotes: '',
        commessaCreatedAt: testCommessa.createdAt,
        descrizioneComponente: 'Test Component External',
        barcode: 'BC005',
        status: '2', // Produzione Interna
        trattamenti: [],
        allowedStatuses: ['1', '2', '2-ext', '3', '5', '6'],
        verificato: false,
        cancellato: false,
        history: []
      });

      // Cambia stato a "Produzione Esterna"
      await request(app)
        .post('/api/changestatus')
        .set('Authorization', `Bearer ${token}`)
        .send({
          componentId: component._id,
          to: '2-ext', // PRODUZIONE_ESTERNA
          note: 'Moving to external production'
        })
        .expect(200);

      // Verifica che NON siano state create notifiche
      const notifications = await Notification.find({});
      expect(notifications).toHaveLength(0);
    });
  });

  describe('Notification API integration', () => {
    test('should allow users to fetch their notifications', async () => {
      // Crea una notifica per l'utente UFF
      await Notification.createNotification({
        userId: uffUser._id,
        username: uffUser.username,
        title: 'Test Notification',
        message: 'This is a test notification',
        type: 'info',
        priority: 'medium'
      });

      // Login come utente UFF
      const uffLoginResponse = await request(app)
        .post('/auth/login')
        .send({ username: 'ufficio', password: 'password123' })
        .expect(200);
      
      const uffToken = uffLoginResponse.body.accessToken;

      // Recupera le notifiche
      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${uffToken}`)
        .expect(200);

      expect(response.body.notifications).toHaveLength(1);
      expect(response.body.notifications[0].title).toBe('Test Notification');
      expect(response.body.unreadCount).toBe(1);
    });

    test('should allow users to mark notifications as read', async () => {
      // Crea una notifica per l'utente UFF
      const notification = await Notification.createNotification({
        userId: uffUser._id,
        username: uffUser.username,
        title: 'Test Notification',
        message: 'This is a test notification',
        type: 'info',
        priority: 'medium'
      });

      // Login come utente UFF
      const uffLoginResponse = await request(app)
        .post('/auth/login')
        .send({ username: 'ufficio', password: 'password123' })
        .expect(200);
      
      const uffToken = uffLoginResponse.body.accessToken;

      // Marca come letta
      const response = await request(app)
        .post(`/api/notifications/${notification._id}/read`)
        .set('Authorization', `Bearer ${uffToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.unreadCount).toBe(0);

      // Verifica che sia stata marcata come letta nel database
      const updatedNotification = await Notification.findById(notification._id);
      expect(updatedNotification.isRead).toBe(true);
      expect(updatedNotification.readAt).toBeDefined();
    });
  });

  describe('Error handling in notifications', () => {
    test('should continue status change even if notification creation fails', async () => {
      // Mock temporaneo per far fallire la creazione delle notifiche
      const originalCreateStatusChangeNotification = require('../utils/notificationUtils').createStatusChangeNotification;
      const notificationUtils = require('../utils/notificationUtils');
      
      // Sostituisci temporaneamente la funzione per farla fallire
      notificationUtils.createStatusChangeNotification = jest.fn().mockRejectedValue(new Error('Notification error'));

      const component = await Component.create({
        commessaId: testCommessa._id,
        commessaCode: testCommessa.code,
        commessaName: testCommessa.name,
        commessaNotes: '',
        commessaCreatedAt: testCommessa.createdAt,
        descrizioneComponente: 'Test Component Error',
        barcode: 'BC006',
        status: '3', // Costruito
        trattamenti: [],
        allowedStatuses: ['1', '2', '2-ext', '3', '5', '6'],
        verificato: false,
        cancellato: false,
        history: []
      });

      // Il cambio di stato dovrebbe comunque funzionare
      const response = await request(app)
        .post('/api/changestatus')
        .set('Authorization', `Bearer ${token}`)
        .send({
          componentId: component._id,
          to: '5', // PRONTO_CONSEGNA
          note: 'Should work despite notification error'
        })
        .expect(200);

      // Verifica che il componente sia stato aggiornato
      const updatedComponent = await Component.findById(component._id);
      expect(updatedComponent.status).toBe('5');
      expect(updatedComponent.history).toHaveLength(1);

      // Ripristina la funzione originale
      notificationUtils.createStatusChangeNotification = originalCreateStatusChangeNotification;
    });
  });
});
