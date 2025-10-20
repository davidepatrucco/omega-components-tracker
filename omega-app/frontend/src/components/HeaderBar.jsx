import React, { useState, useEffect } from 'react';
import { Layout, Dropdown, Badge, Button, Typography, Tooltip } from 'antd';
import { BellOutlined, LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../AuthContext';
import NotificationBadge from './NotificationBadge';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const { Header } = Layout;

export default function HeaderBar({ collapsed, onToggle }){
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [sessionInfo, setSessionInfo] = useState('');

  // Calcola info sessione
  useEffect(() => {
    const updateSessionInfo = () => {
      try {
        const sessionExpiry = localStorage.getItem('auth_session_expiry');
        const refreshToken = localStorage.getItem('auth_refresh_token');
        
        if (sessionExpiry) {
          const expiry = parseInt(sessionExpiry);
          const now = Date.now();
          const daysLeft = Math.ceil((expiry - now) / (24 * 60 * 60 * 1000));
          
          if (daysLeft > 0) {
            setSessionInfo(`Sessione attiva per ${daysLeft} giorni`);
          } else {
            setSessionInfo('Sessione scaduta');
          }
        } else {
          // Fallback: se non abbiamo sessionExpiry, controlla se abbiamo un token
          const token = localStorage.getItem('auth_token');
          if (token) {
            setSessionInfo('Sessione attiva per 180 giorni');
          } else {
            setSessionInfo('Sessione temporanea');
          }
        }
      } catch (e) {
        setSessionInfo('');
      }
    };

    updateSessionInfo();
    const interval = setInterval(updateSessionInfo, 60000); // Aggiorna ogni minuto
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try { await axios.post('/auth/logout', {}, { withCredentials: true }); } catch (e) { /* ignore */ }
    logout();
    navigate('/login');
  };

  const menuItems = [
    { key: 'logout', label: 'Logout', icon: <LogoutOutlined />, onClick: handleLogout }
  ];

  return (
    <Header style={{ 
      background: '#ffffff', 
      padding: '8px 16px', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      borderBottom: '1px solid rgba(15,23,42,0.04)',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      width: '100%'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#4f46e5,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, boxShadow: '0 6px 18px rgba(79,70,229,0.12)' }}>Ω</div>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', letterSpacing: 0.2 }}>Omega Components Tracker</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Indicatore Sessione */}
        {sessionInfo && (
          <Tooltip title="Refresh automatico dei token attivo">
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6, 
              padding: '4px 8px', 
              background: '#f0f9ff', 
              borderRadius: 6,
              border: '1px solid #0ea5e9'
            }}>
              <CheckCircleOutlined style={{ color: '#0ea5e9', fontSize: 12 }} />
              <Typography.Text style={{ fontSize: 11, color: '#0369a1' }}>
                {sessionInfo}
              </Typography.Text>
            </div>
          </Tooltip>
        )}

        <NotificationBadge>
          <Button 
            type="text" 
            aria-label="Notifiche" 
            style={{ padding: 6 }} 
            icon={<BellOutlined style={{ fontSize: 16, color: '#374151' }} />}
            onClick={() => navigate('/notifiche')}
          />
        </NotificationBadge>

        <Dropdown menu={{ items: menuItems }} placement="bottomRight">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 8, cursor: 'pointer' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#4f46e5,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 12, boxShadow: '0 6px 18px rgba(79,70,229,0.12)' }}>
              {user?.username?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <Typography.Text strong style={{ fontSize: 13, lineHeight: '16px' }}>{user?.username || 'Utente'}</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 11 }}>{user?.profilo || ''}</Typography.Text>
            </div>
          </div>
        </Dropdown>
      </div>
    </Header>
  );
}
