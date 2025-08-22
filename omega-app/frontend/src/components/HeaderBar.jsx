import React from 'react';
import { Layout, Dropdown, Badge, Button, Typography } from 'antd';
import { BellOutlined, LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { useAuth } from '../AuthContext';
import NotificationBadge from './NotificationBadge';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const { Header } = Layout;

export default function HeaderBar({ collapsed, onToggle }){
  const { logout, user } = useAuth();
  const navigate = useNavigate();

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
