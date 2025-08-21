import React, { useState, useEffect } from 'react';
import { Layout, Menu } from 'antd';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import HeaderBar from './components/HeaderBar';
import NotificationBadge from './components/NotificationBadge';
import { useAuth } from './AuthContext';
import { AppstoreOutlined, CarryOutOutlined, FileOutlined, PieChartOutlined, UserOutlined, BellOutlined, CloudOutlined } from '@ant-design/icons';

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
      <Header style={{ padding: 0, background: '#fff' }}>
        <HeaderBar collapsed={collapsed} onToggle={() => setCollapsed(s => !s)} />
      </Header>

      <Layout>
        <Sider collapsible collapsed={collapsed} trigger={null} width={220} style={{ background: '#fff', borderRight: '1px solid rgba(15,23,42,0.04)' }}>
          <div style={{ height: 64, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#4f46e5,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, boxShadow: '0 6px 18px rgba(79,70,229,0.12)' }}>Ω</div>
            {!collapsed && <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', letterSpacing: 0.2 }}>Omega</div>}
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
