import React from 'react';
import { Layout } from 'antd';
const { Header, Content } = Layout;

export default function App(){
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ color: '#fff' }}>Omega App - PoC</Header>
      <Content style={{ padding: 24 }}>
        <h2>Welcome to Omega - new project skeleton</h2>
        <p>This is a minimal frontend shell. Please implement pages following `instructions.md`.</p>
      </Content>
    </Layout>
  );
}
