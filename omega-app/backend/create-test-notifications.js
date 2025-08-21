// Script per creare notifiche di test
const mongoose = require('mongoose');
const User = require('./models/User');
const Notification = require('./models/Notification');

// Connetti a MongoDB usando le stesse variabili d'ambiente del progetto
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load env: preferisci il file .env nella root del progetto
const repoRootEnv = path.resolve(__dirname, '..', '..', '.env');
if (fs.existsSync(repoRootEnv)) {
  dotenv.config({ path: repoRootEnv });
  console.log('Loaded env from repo root .env:', repoRootEnv);
} else {
  // fallback to default .env in backend folder
  dotenv.config();
  console.log('Loaded env from backend .env (if present)');
}

const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/omega';

async function createTestNotifications() {
  try {
    await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    // Trova l'utente di default 'd'
    const user = await User.findOne({ username: 'd' });
    if (!user) {
      console.log('User "d" not found');
      return;
    }

    console.log('Found user:', user.username);

    // Crea notifiche di test
    const testNotifications = [
      {
        userId: user._id,
        username: user.username,
        title: 'Benvenuto nel sistema Omega',
        message: 'Il tuo account è stato configurato con successo. Ora puoi gestire commesse e componenti.',
        type: 'success',
        priority: 'medium'
      },
      {
        userId: user._id,
        username: user.username,
        title: 'Nuova commessa creata',
        message: 'È stata creata una nuova commessa "COMM-2024-001" che richiede la tua attenzione.',
        type: 'info',
        priority: 'medium',
        relatedEntity: {
          type: 'commessa',
          name: 'COMM-2024-001'
        },
        actionUrl: '/commesse'
      },
      {
        userId: user._id,
        username: user.username,
        title: 'Componente in ritardo',
        message: 'Il componente "COMP-001" della commessa "TEST-001" è in ritardo sulla tabella di marcia.',
        type: 'warning',
        priority: 'high',
        relatedEntity: {
          type: 'component',
          name: 'COMP-001'
        }
      },
      {
        userId: user._id,
        username: user.username,
        title: 'Aggiornamento sistema',
        message: 'Il sistema sarà aggiornato questa notte alle 02:00. Potrebbero verificarsi brevi interruzioni.',
        type: 'system',
        priority: 'low',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Scade tra 7 giorni
      },
      {
        userId: user._id,
        username: user.username,
        title: 'Errore nel caricamento',
        message: 'Si è verificato un errore durante il caricamento del file Excel. Controlla il formato.',
        type: 'error',
        priority: 'high'
      },
      {
        userId: user._id,
        username: user.username,
        title: 'Trattamento completato',
        message: 'Il trattamento "nichelatura" per il componente "COMP-002" è stato completato con successo.',
        type: 'success',
        priority: 'medium',
        relatedEntity: {
          type: 'component',
          name: 'COMP-002'
        }
      }
    ];

    // Elimina notifiche esistenti per l'utente (per test puliti)
    await Notification.deleteMany({ username: user.username });
    console.log('Deleted existing notifications');

    // Crea le nuove notifiche
    for (const notificationData of testNotifications) {
      const notification = await Notification.createNotification(notificationData);
      console.log(`Created notification: ${notification.title}`);
    }

    console.log(`Created ${testNotifications.length} test notifications`);
    
    // Conta notifiche non lette
    const unreadCount = await Notification.getUnreadCount(user.username);
    console.log(`Unread notifications: ${unreadCount}`);

  } catch (error) {
    console.error('Error creating test notifications:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Esegui lo script
if (require.main === module) {
  createTestNotifications();
}

module.exports = { createTestNotifications };
