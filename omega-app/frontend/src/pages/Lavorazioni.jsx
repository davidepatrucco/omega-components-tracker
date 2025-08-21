import React from 'react';
import { Row, Col, Card, Typography, Statistic } from 'antd';

export default function Lavorazioni(){
  return (
    <div>
      <Card style={{ marginBottom: 16, borderRadius: 10 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>Dashboard</Typography.Title>
        <Typography.Text type="secondary">Qui trovi lo stato delle lavorazioni e le notifiche rapide.</Typography.Text>
      </Card>

      <Row gutter={16}>
        <Col span={4}>
          <Card>
            <Statistic title="Lavorazioni in corso" value={24} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title="Commesse aperte" value={12} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title="Da verificare" value={8} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title="In trattamento" value={15} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title="Da spedire" value={5} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title="Completate oggi" value={7} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
