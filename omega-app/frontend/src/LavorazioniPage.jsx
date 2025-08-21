import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Tag, Typography, Space, Spin, Alert } from 'antd';
import { BarcodeOutlined, ToolOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { getComponents } from './api';

const { Title, Text } = Typography;

const statusLabels = {
  '1': 'Nuovo',
  '2': 'Produzione Interna',
  '3': 'Produzione Esterna',
  '5': 'Pronto per consegna',
  '6': 'Spedito'
};

const getStatusColor = (status) => {
  const colors = {
    '1': 'blue',
    '2': 'orange',
    '3': 'cyan',
    '5': 'green',
    '6': 'default'
  };
  return colors[status] || 'default';
};

const ComponentCard = ({ component }) => {
  const { commessaId, commessaName, name, barcode, status, trattamenti = [] } = component;
  
  // Show barcode only if there are treatments
  const showBarcode = trattamenti && trattamenti.length > 0;
  
  // Format status for treatment states
  let displayStatus = statusLabels[status] || status;
  if (status && status.startsWith('4:')) {
    const parts = status.split(':');
    if (parts.length >= 3) {
      const treatment = parts[1];
      const phase = parts[2];
      displayStatus = `${treatment} - ${phase}`;
    }
  }
  
  return (
    <Card
      size="small"
      style={{
        marginBottom: 16,
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}
      bodyStyle={{ padding: 16 }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        {/* Commessa Info */}
        <div style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}>
          <Text strong style={{ fontSize: 16, color: '#1890ff' }}>
            {commessaId}
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: 14 }}>
            {commessaName}
          </Text>
        </div>
        
        {/* Component Info */}
        <div>
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Text strong style={{ fontSize: 15 }}>
              <ToolOutlined style={{ marginRight: 8, color: '#722ed1' }} />
              {name}
            </Text>
            
            {/* Barcode - only if treatments exist */}
            {showBarcode && barcode && (
              <Text code style={{ fontSize: 13 }}>
                <BarcodeOutlined style={{ marginRight: 4 }} />
                {barcode}
              </Text>
            )}
            
            {/* Treatments */}
            {trattamenti.length > 0 && (
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>Trattamenti:</Text>
                <br />
                <Space wrap>
                  {trattamenti.map((treatment, index) => (
                    <Tag key={index} color="processing" size="small">
                      {treatment}
                    </Tag>
                  ))}
                </Space>
              </div>
            )}
            
            {/* Current Status */}
            <div style={{ marginTop: 8 }}>
              <ClockCircleOutlined style={{ marginRight: 4, color: '#52c41a' }} />
              <Tag color={getStatusColor(status)} style={{ marginLeft: 4 }}>
                {displayStatus}
              </Tag>
            </div>
          </Space>
        </div>
      </Space>
    </Card>
  );
};

const LavorazioniPage = () => {
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchComponents = async () => {
      try {
        setLoading(true);
        const response = await getComponents({ pageSize: 100 });
        
        // Filter components that are not shipped (status != '6')
        const inLavorazione = response.data.items.filter(comp => comp.status !== '6');
        setComponents(inLavorazione);
        setError(null);
      } catch (err) {
        console.error('Error fetching components:', err);
        setError('Errore nel caricamento dei componenti');
      } finally {
        setLoading(false);
      }
    };

    fetchComponents();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Errore"
        description={error}
        type="error"
        showIcon
        style={{ margin: 20 }}
      />
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Title level={2} style={{ marginBottom: 24 }}>
        <ToolOutlined style={{ marginRight: 12, color: '#1890ff' }} />
        Lavorazioni in Corso
      </Title>
      
      <Text type="secondary" style={{ fontSize: 16, marginBottom: 24, display: 'block' }}>
        Componenti attualmente in lavorazione (non spediti): {components.length}
      </Text>

      {components.length === 0 ? (
        <Alert
          message="Nessuna lavorazione in corso"
          description="Non ci sono componenti attualmente in lavorazione."
          type="info"
          showIcon
        />
      ) : (
        <Row gutter={[16, 16]}>
          {components.map((component) => (
            <Col 
              key={component._id} 
              xs={24} 
              sm={12} 
              md={8} 
              lg={6}
            >
              <ComponentCard component={component} />
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
};

export default LavorazioniPage;