import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Typography, Statistic, Spin, message } from 'antd';
import { api } from '../api';

export default function Lavorazioni(){
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    inLavorazione: 0,
    daSpedire: 0,
    verificato: { nonVerificati: 0, total: 0, percentage: 0 },
    speditOggi: 0,
    commesseAperte: 0,
    inTrattamento: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      message.error('Errore nel caricamento delle statistiche');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>Caricamento statistiche...</div>
      </div>
    );
  }

  return (
    <div>
      <Card style={{ marginBottom: 16, borderRadius: 10 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>Dashboard Lavorazioni</Typography.Title>
        <Typography.Text type="secondary">Qui trovi lo stato delle lavorazioni e le notifiche rapide.</Typography.Text>
      </Card>

      <Row gutter={16}>
        <Col span={4}>
          <Card>
            <Statistic title="In lavorazione" value={stats.inLavorazione} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title="Commesse aperte" value={stats.commesseAperte} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic 
              title="Da verificare" 
              value={stats.verificato.nonVerificati}
              suffix={`(${stats.verificato.percentage}%)`}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title="In trattamento" value={stats.inTrattamento} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title="Da spedire" value={stats.daSpedire} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title="Spediti oggi" value={stats.speditOggi} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
