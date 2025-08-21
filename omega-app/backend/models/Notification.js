const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  // Destinatario della notifica
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  username: { 
    type: String, 
    required: true 
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
NotificationSchema.statics.getUnreadCount = async function(username) {
  return await this.countDocuments({ 
    username, 
    isRead: false,
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]
  });
};

module.exports = mongoose.model('Notification', NotificationSchema);
