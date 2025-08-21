import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Button, Select, Input, Spin } from 'antd';
import { DashboardOutlined, PlusOutlined, SearchOutlined, BarcodeOutlined } from '@ant-design/icons';
import MetricsCard from '../components/MetricsCard';
import ComponentsTable from '../components/ComponentsTable';
import api from '../api';

export default function Lavorazioni() {
  const [loading, setLoading] = useState(false);
  const [components, setComponents] = useState([]);
  const [filters, setFilters] = useState({});

  useEffect(() => {
    fetchComponents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchComponents = async (qs = {}) => {
    setLoading(true);
    try {
      const res = await api.get('/components', { params: { pageSize: 25, ...qs } });
      setComponents(res?.data || []);
    } catch (err) {
      console.error('fetchComponents', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
        <Col>
          <h2><DashboardOutlined style={{ marginRight: 8 }} />Lavorazioni</h2>
        </Col>
        <Col>
          <Input.Search
            placeholder="Cerca componente o commessa"
            onSearch={(v) => fetchComponents({ q: v })}
            style={{ width: 320, marginRight: 8 }}
          />
          <Button type="primary" icon={<PlusOutlined />} style={{ marginRight: 8 }}>Nuovo componente</Button>
          <Button icon={<BarcodeOutlined />}>Scanner</Button>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} lg={18}>
          <Card size="small" title="Componenti in lavorazione">
            {loading ? <Spin /> : <ComponentsTable data={components} onRefresh={() => fetchComponents(filters)} />}
          </Card>
        </Col>
        <Col xs={24} lg={6}>
          <Row gutter={[0, 12]}>
            <Col span={24}><MetricsCard title="Totale" value={components.length} /></Col>
            <Col span={24}><MetricsCard title="In lavorazione" value={Math.max(0, components.filter(c => c.status && c.status !== '5' && c.status !== '6').length)} /></Col>
            <Col span={24}><Card size="small">Attività recenti (feed placeholder)</Card></Col>
          </Row>
        </Col>
      </Row>
    </div>
  );
}
