const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

// GET /notifications - Ottieni notifiche per l'utente corrente
router.get('/', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const username = req.user.username;
    const userProfile = req.user.profilo;
    
    // Costruisci query base per includere:
    // 1. Notifiche specifiche per questo utente (username match)
    // 2. Notifiche generiche per il profilo dell'utente (profileTarget match)
    const query = { 
      $and: [
        // Filtro scadenza sempre applicato
        {
          $or: [
            { expiresAt: { $exists: false } },
            { expiresAt: null },
            { expiresAt: { $gt: new Date() } }
          ]
        },
        // Filtro per utente o profilo
        {
          $or: [
            // Notifiche specifiche per l'utente
            { username },
            // Notifiche generiche per il profilo dell'utente
            { profileTarget: userProfile }
          ]
        }
      ]
    };
    
    // Filtra solo non lette se richiesto
    if (unreadOnly === 'true') {
      query.$and.push({ isRead: false });
    }
    
    // Paginazione
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('relatedEntity.id', 'name code');
    
    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.getUnreadCount(username, userProfile);
    
    res.json({
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Errore nel recupero delle notifiche' });
  }
});

// GET /notifications/unread-count - Conta notifiche non lette
router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const username = req.user.username;
    const userProfile = req.user.profilo;
    const count = await Notification.getUnreadCount(username, userProfile);
    res.json({ count });
  } catch (error) {
    console.error('Error counting unread notifications:', error);
    res.status(500).json({ error: 'Errore nel conteggio notifiche' });
  }
});

// POST /notifications/:id/read - Marca notifica come letta
router.post('/:id/read', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const username = req.user.username;
    
    const notification = await Notification.findOne({ 
      _id: id, 
      username 
    });
    
    if (!notification) {
      return res.status(404).json({ error: 'Notifica non trovata' });
    }
    
    if (!notification.isRead) {
      await notification.markAsRead();
    }
    
    const unreadCount = await Notification.getUnreadCount(username);
    
    res.json({ 
      success: true, 
      notification,
      unreadCount 
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento della notifica' });
  }
});

// POST /notifications/mark-all-read - Marca tutte come lette
router.post('/mark-all-read', requireAuth, async (req, res) => {
  try {
    const username = req.user.username;
    
    await Notification.updateMany(
      { 
        username, 
        isRead: false,
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } }
        ]
      },
      { 
        isRead: true, 
        readAt: new Date() 
      }
    );
    
    res.json({ success: true, unreadCount: 0 });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento delle notifiche' });
  }
});

// POST /notifications - Crea nuova notifica (per admin o sistema)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { 
      targetUsername, 
      targetUserId,
      title, 
      message, 
      type = 'info',
      priority = 'medium',
      relatedEntity,
      actionUrl,
      expiresAt
    } = req.body;
    
    // Verifica che l'utente sia admin o sistema
    if (req.user.profilo !== 'ADMIN') {
      return res.status(403).json({ error: 'Accesso negato' });
    }
    
    let userId = targetUserId;
    let username = targetUsername;
    
    // Se non viene fornito l'ID utente, cercalo tramite username
    if (!userId && username) {
      const user = await User.findOne({ username });
      if (!user) {
        return res.status(404).json({ error: 'Utente non trovato' });
      }
      userId = user._id;
    }
    
    // Se non viene fornito lo username, cercalo tramite ID
    if (!username && userId) {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Utente non trovato' });
      }
      username = user.username;
    }
    
    const notification = await Notification.createNotification({
      userId,
      username,
      title,
      message,
      type,
      priority,
      relatedEntity,
      actionUrl,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined
    });
    
    res.status(201).json(notification);
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Errore nella creazione della notifica' });
  }
});

// DELETE /notifications/:id - Elimina notifica
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const username = req.user.username;
    
    const notification = await Notification.findOneAndDelete({ 
      _id: id, 
      username 
    });
    
    if (!notification) {
      return res.status(404).json({ error: 'Notifica non trovata' });
    }
    
    const unreadCount = await Notification.getUnreadCount(username);
    
    res.json({ 
      success: true,
      unreadCount 
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Errore nell\'eliminazione della notifica' });
  }
});

module.exports = router;
