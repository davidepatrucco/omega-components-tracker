import React from 'react';
import { Layout, Menu } from 'antd';
import { Outlet, Link } from 'react-router-dom';
const { Header, Sider, Content } = Layout;

export default function MainLayout(){
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={220} style={{ background: '#fff' }}>
        <div style={{padding:16, fontWeight:700}}>Omega</div>
        <Menu mode="inline" defaultSelectedKeys={["lavorazioni"]}>
          <Menu.Item key="lavorazioni"><Link to="/">Lavorazioni</Link></Menu.Item>
          <Menu.Item key="commesse"><Link to="/commesse">Commesse</Link></Menu.Item>
          <Menu.Item key="report"><Link to="/report">Reporting</Link></Menu.Item>
        </Menu>
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', paddingLeft: 16 }}>Omega - header</Header>
        <Content style={{ margin: 16 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
