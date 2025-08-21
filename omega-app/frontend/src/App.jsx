import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import { ToolOutlined, HomeOutlined } from '@ant-design/icons';
import LavorazioniPage from './LavorazioniPage';

const { Header, Content } = Layout;

const HomePage = () => (
  <div style={{ padding: 24 }}>
    <h2>Welcome to Omega - Component Tracker</h2>
    <p>Navigate to <Link to="/lavorazioni">Lavorazioni</Link> to view components in processing.</p>
  </div>
);

export default function App(){
  return (
    <Router>
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginRight: 24 }}>
            Omega App - PoC
          </div>
          <Menu
            theme="dark"
            mode="horizontal"
            style={{ flex: 1, minWidth: 0 }}
            items={[
              {
                key: 'home',
                icon: <HomeOutlined />,
                label: <Link to="/">Home</Link>
              },
              {
                key: 'lavorazioni',
                icon: <ToolOutlined />,
                label: <Link to="/lavorazioni">Lavorazioni</Link>
              }
            ]}
          />
        </Header>
        <Content>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/lavorazioni" element={<LavorazioniPage />} />
          </Routes>
        </Content>
      </Layout>
    </Router>
  );
}
