import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button } from 'antd';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import HeaderBar from './components/HeaderBar';
import NotificationBadge from './components/NotificationBadge';
import { useAuth } from './AuthContext';
import { AppstoreOutlined, CarryOutOutlined, FileOutlined, PieChartOutlined, UserOutlined, BellOutlined, CloudOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';

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
    { key: 'report', icon: <PieChartOutlined />, label: <Link to="/report">Reporting</Link> },
    { key: 'files', icon: <CloudOutlined />, label: <Link to="/files">Vedi Files</Link> }
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
            zIndex: 999
          }}
        >
          <div style={{ padding: '16px', borderBottom: '1px solid rgba(15,23,42,0.04)' }}>
            <Button 
              type="text" 
              onClick={() => setCollapsed(s => !s)} 
              aria-label="Toggle menu" 
              style={{ width: '100%', textAlign: 'left' }} 
              icon={collapsed ? <MenuUnfoldOutlined style={{ fontSize: 18 }} /> : <MenuFoldOutlined style={{ fontSize: 18 }} />}
            >
              {!collapsed && <span style={{ marginLeft: 8 }}>Menu</span>}
            </Button>
          </div>
          <Menu mode="inline" defaultSelectedKeys={["lavorazioni"]} items={menuItems} style={{ border: 'none' }} />
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
