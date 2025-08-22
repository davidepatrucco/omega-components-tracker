const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  // Destinatario della notifica (può essere null per notifiche generiche basate su profilo)
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: false // Cambiato a false per supportare notifiche generiche
  },
  username: { 
    type: String, 
    required: false // Cambiato a false per supportare notifiche generiche
  },
  
  // Profilo target per notifiche generiche (UFF, TRATT, ADMIN, etc.)
  profileTarget: {
    type: String,
    required: false // Required quando userId è null
  },
  
  // Contenuto della notifica
  title: { 
    type: String, 
    required: true 
  },
  message: { 
    type: String, 
    required: true 
  },
  
  // Tipo di notifica per styling e comportamento
  type: { 
    type: String, 
    enum: ['info', 'success', 'warning', 'error', 'system'],
    default: 'info' 
  },
  
  // Priorità della notifica
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium' 
  },
  
  // Stato di lettura
  isRead: { 
    type: Boolean, 
    default: false 
  },
  readAt: { 
    type: Date 
  },
  
  // Metadati per azioni correlate
  relatedEntity: {
    type: { 
      type: String, 
      enum: ['commessa', 'component', 'user', 'system'] 
    },
    id: { 
      type: mongoose.Schema.Types.ObjectId 
    },
    name: String
  },
  
  // URL per navigazione diretta (opzionale)
  actionUrl: String,
  
  // Scadenza automatica della notifica
  expiresAt: { 
    type: Date 
  }
}, { 
  timestamps: true 
});

// Indici per performance
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ username: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Metodo per marcare come letta
NotificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Metodo statico per creare notifica
NotificationSchema.statics.createNotification = async function(data) {
  const notification = new this(data);
  await notification.save();
  return notification;
};

// Metodo statico per contare non lette per utente
NotificationSchema.statics.getUnreadCount = async function(username, userProfile = null) {
  // Determina quali profili può vedere questo utente
  let allowedProfiles = [];
  if (userProfile === 'ADMIN') {
    allowedProfiles = ['ADMIN', 'UFF', 'TRATT'];
  } else if (userProfile === 'UFF') {
    allowedProfiles = ['UFF', 'TRATT'];
  } else if (userProfile === 'TRATT') {
    allowedProfiles = ['TRATT'];
  }

  const query = {
    isRead: false,
    $and: [
      // Filtro scadenza
      {
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: null },
          { expiresAt: { $gt: new Date() } }
        ]
      },
      // Filtro per utente o profili consentiti
      {
        $or: [
          // Notifiche specifiche per l'utente
          { username },
          // Notifiche per i profili che può vedere
          { profileTarget: { $in: allowedProfiles } }
        ]
      }
    ]
  };

  return await this.countDocuments(query);
};

module.exports = mongoose.model('Notification', NotificationSchema);
