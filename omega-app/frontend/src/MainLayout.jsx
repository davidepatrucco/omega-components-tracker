import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button } from 'antd';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import HeaderBar from './components/HeaderBar';
import NotificationBadge from './components/NotificationBadge';
import { useAuth } from './AuthContext';
import { AppstoreOutlined, CarryOutOutlined, FileOutlined, PieChartOutlined, UserOutlined, BellOutlined, CloudOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';

const { Header, Sider, Content } = Layout;

export default function MainLayout(){
  const [collapsed, setCollapsed] = useState(false);
  const { token, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate('/login');
    }
  }, [token, navigate]);

  if (!token) {
    return null; // Don't render anything while redirecting
  }

const menuItems = [
    { key: 'lavorazioni', icon: <AppstoreOutlined />, label: <Link to="/">Lavorazioni</Link> },
    { key: 'commesse', icon: <FileOutlined />, label: <Link to="/commesse">Commesse</Link> },
    { 
        key: 'notifiche', 
        icon: <div style={{ position: 'relative', display: 'inline-block' }}>
            <BellOutlined />
            <NotificationBadge style={{ position: 'absolute', top: -8, right: -8 }} />
        </div>,     
        label: <Link to="/notifiche">Notifiche</Link> 
    },
    { key: 'files', icon: <CloudOutlined />, label: <Link to="/files">Vedi Files</Link> },
        { 
            key: 'report', 
            icon: <PieChartOutlined style={{ color: '#b0b0b0' }} />, 
            label: <span style={{ color: '#b0b0b0', pointerEvents: 'none', cursor: 'not-allowed' }}>Reporting</span> 
        },
];

  // Add user management menu item only for admin users
  if (user && user.profilo === 'ADMIN') {
    menuItems.push({
      key: 'utenti',
      icon: <UserOutlined />,
      label: <Link to="/utenti">Gestione Utenze</Link>
    });
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ padding: 0, background: '#fff', position: 'sticky', top: 0, zIndex: 1000 }}>
        <HeaderBar collapsed={collapsed} onToggle={() => setCollapsed(s => !s)} />
      </Header>

      <Layout>
        <Sider 
          collapsible 
          collapsed={collapsed} 
          trigger={null} 
          width={220} 
          style={{ 
            background: '#fff', 
            borderRight: '1px solid rgba(15,23,42,0.04)',
            position: 'sticky',
            top: 64,
            height: 'calc(100vh - 64px)',
            overflow: 'auto',
            zIndex: 999,
            display: 'flex',
            flexDirection: 'column' 
          }}
        >
          <div style={{ flex: 1 }}>
            <Menu mode="inline" defaultSelectedKeys={["lavorazioni"]} items={menuItems} style={{ border: 'none' }} />
          </div>
          
          {/* Chevron toggle button at bottom */}
          <div style={{ 
            padding: '16px', 
            borderTop: '1px solid rgba(15,23,42,0.04)',
            display: 'flex',
            justifyContent: 'center'
          }}>
            <Button 
              type="text" 
              onClick={() => setCollapsed(s => !s)} 
              aria-label="Toggle menu" 
              style={{ 
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                transition: 'all 0.3s ease'
              }} 
              icon={collapsed ? <RightOutlined style={{ fontSize: 16, color: '#666' }} /> : <LeftOutlined style={{ fontSize: 16, color: '#666' }} />}
            />
          </div>
        </Sider>

        <Layout>
          <Content style={{ margin: 16 }}>
            <Outlet />
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
}
