import React from 'react';
import { Card } from 'antd';

export default function MetricsCard({ title, value }) {
  return (
    <Card size="small">
      <div style={{ fontSize: 12, color: '#666' }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 600 }}>{value}</div>
    </Card>
  );
}
