import React, { useState, useEffect } from 'react';
import { Badge } from 'antd';
import { api } from '../api';

const NotificationBadge = ({ style = {} }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/api/notifications/unread-count');
      const count = response.data.count;
      setUnreadCount(count);
      
      // Salva nel localStorage per mantenere stato
      localStorage.setItem('unreadNotificationsCount', count.toString());
    } catch (error) {
      console.error('Error fetching unread count:', error);
      // In caso di errore, prova a leggere dal localStorage
      const storedCount = localStorage.getItem('unreadNotificationsCount');
      if (storedCount) {
        setUnreadCount(parseInt(storedCount) || 0);
      }
    }
  };

  useEffect(() => {
    // Carica il conteggio iniziale
    fetchUnreadCount();
    
    // Carica da localStorage se disponibile
    const storedCount = localStorage.getItem('unreadNotificationsCount');
    if (storedCount) {
      setUnreadCount(parseInt(storedCount) || 0);
    }
    
    // Listener per aggiornamenti dal componente Notifiche
    const handleUnreadChange = (event) => {
      setUnreadCount(event.detail);
    };
    
    window.addEventListener('unreadNotificationsChanged', handleUnreadChange);
    
    // Polling ogni 30 secondi per aggiornamenti real-time
    const interval = setInterval(fetchUnreadCount, 30000);
    
    return () => {
      window.removeEventListener('unreadNotificationsChanged', handleUnreadChange);
      clearInterval(interval);
    };
  }, []);

  // Restituisce solo il badge se ci sono notifiche non lette
  if (unreadCount === 0) {
    return null;
  }

  return (
    <Badge 
      count={unreadCount} 
      size="small"
      style={{
        backgroundColor: '#ff4d4f',
        fontSize: '10px',
        minWidth: '16px',
        height: '16px',
        lineHeight: '16px',
        borderRadius: '8px',
        ...style
      }}
    />
  );
};

export default NotificationBadge;
