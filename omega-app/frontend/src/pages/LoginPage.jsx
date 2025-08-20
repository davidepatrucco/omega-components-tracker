import React, { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import axios from 'axios';
import { useAuth } from '../AuthContext';

export default function LoginPage(){
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const res = await axios.post('/auth/login', values, { withCredentials: true });
      login(res.data.accessToken);
      message.success('Login effettuato');
    } catch (err) {
      message.error(err?.response?.data?.error || 'Errore login');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <Card style={{ width: 360 }} title="Login">
        <Form name="login" onFinish={onFinish}>
          <Form.Item name="username" rules={[{ required: true }]}>
            <Input placeholder="username" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true }]}>
            <Input.Password placeholder="password" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>Accedi</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
