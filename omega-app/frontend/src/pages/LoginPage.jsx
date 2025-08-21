import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Typography, Space } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

export default function LoginPage(){
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', values);
      login(res.data.accessToken, res.data.user);
      message.success('Accesso effettuato');
      // redirect to main page
      navigate('/');
    } catch (err) {
      message.error(err?.response?.data?.error || 'Credenziali errate');
    } finally { setLoading(false); }
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
            <Text type="secondary">Accedi al pannello di controllo</Text>
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
            <Text type="secondary">Credenziali demo — user: d  password: d</Text>
          </div>
        </Space>
      </Card>
    </div>
  );
}
