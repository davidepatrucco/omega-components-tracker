import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Typography, Space, Divider, Tag } from 'antd';
import { UserOutlined, LockOutlined, CloudServerOutlined, DatabaseOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

export default function LoginPage(){
  const [loading, setLoading] = useState(false);
  const [systemInfo, setSystemInfo] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Fetch system info on component mount
  useEffect(() => {
    const fetchSystemInfo = async () => {
      try {
        const response = await api.get('/api/system-info');
        setSystemInfo(response.data);
      } catch (error) {
        console.error('Failed to fetch system info:', error);
        // Don't show error to user, just log it
      }
    };
    
    fetchSystemInfo();
  }, []);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', values);
      
      // Passa sia accessToken che refreshToken (se presente) al context
      login(
        res.data.accessToken, 
        res.data.user, 
        res.data.refreshToken // Questo potrebbe essere undefined, va bene
      );
      
      message.success('Accesso effettuato - sessione valida per 60 giorni');
      // redirect to main page
      navigate('/');
    } catch (err) {
      message.error(err?.response?.data?.error || 'Credenziali errate');
    } finally { 
      setLoading(false); 
    }
  };

  const getEnvironmentColor = (env) => {
    switch (env) {
      case 'PRODUCTION': return 'red';
      case 'STAGING': return 'orange';
      case 'DEVELOPMENT': return 'green';
      default: return 'default';
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#f6f8fb' }}>
      <Card style={{ width: 420, borderRadius: 12, boxShadow: '0 6px 18px rgba(23,43,77,0.08)' }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#4f46e5,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 18, boxShadow: '0 8px 24px rgba(79,70,229,0.12)' }}>Ω</div>
            </div>
            <Title level={3} style={{ margin: 0 }}>Benvenuto</Title>
            <Text type="secondary">Accedi all'applicazione!</Text>
          </div>

          <Form name="login" onFinish={onFinish} layout="vertical">
            <Form.Item name="username" label="Username" rules={[{ required: true, message: 'Inserisci username' }]}>
              <Input prefix={<UserOutlined />} placeholder="d" />
            </Form.Item>

            <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Inserisci password' }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="d" />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block style={{ borderRadius: 6 }}>
                Accedi
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">Inserisci user e password o contatta l'amministratore se non le possiedi</Text>
          </div>

          {systemInfo && (
            <>
              <Divider style={{ margin: '16px 0' }} />
              <div style={{ background: '#fafafa', padding: '12px', borderRadius: '6px', border: '1px solid #f0f0f0' }}>
                <Typography.Title level={5} style={{ margin: '0 0 8px 0', color: '#666' }}>
                  <CloudServerOutlined style={{ marginRight: 6 }} />
                  Parametri Sistema
                </Typography.Title>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      <EnvironmentOutlined style={{ marginRight: 4 }} />
                      Ambiente:
                    </Text>
                    <Tag color={getEnvironmentColor(systemInfo.environment)} style={{ fontSize: '11px', margin: 0 }}>
                      {systemInfo.environment}
                    </Tag>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      <CloudServerOutlined style={{ marginRight: 4 }} />
                      Server IP:
                    </Text>
                    <Text style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                      {systemInfo.serverIP}
                    </Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      <DatabaseOutlined style={{ marginRight: 4 }} />
                      MongoDB:
                    </Text>
                    <Text style={{ fontSize: '11px', fontFamily: 'monospace', maxWidth: '200px', wordBreak: 'break-all' }}>
                      {systemInfo.mongoUri}
                    </Text>
                  </div>
                </Space>
              </div>
            </>
          )}
        </Space>
      </Card>
    </div>
  );
}
