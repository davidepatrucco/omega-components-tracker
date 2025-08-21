import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Typography, Statistic, Spin, Tag, Modal } from 'antd';
import BarcodeWithText from '../BarcodeWithText';
import { api } from '../api';
import { getStatusLabel, getStatusColor, formatStatusDisplay } from '../utils/statusUtils';

const { Title, Text } = Typography;

export default function Lavorazioni(){
  const [components, setComponents] = useState([]);
  const [commesse, setCommesse] = useState([]);
  const [loading, setLoading] = useState(true);
  const [barcodeModal, setBarcodeModal] = useState({ open: false, value: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch components and commesse in parallel
      const [componentsRes, commisseRes] = await Promise.all([
        api.get('/components?pageSize=1000'), // Get a large number of components
        api.get('/commesse')
      ]);
      
      setComponents(componentsRes.data.items || []);
      setCommesse(commisseRes.data.items || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter work-in-progress components (not shipped)
  const workInProgressComponents = components.filter(comp => 
    comp.status !== '5' && comp.status !== '6' && !comp.cancellato
  );

  const handleStatusColor = (status) => {
    // Usa la configurazione centralizzata per i colori di Ant Design
    const statusDisplay = formatStatusDisplay(status);
    
    // Mappa i colori hex ai nomi di colori Ant Design
    const colorMap = {
      '#d9d9d9': 'default',
      '#1890ff': 'blue', 
      '#722ed1': 'purple',
      '#52c41a': 'green',
      '#faad14': 'gold',
      '#ff4d4f': 'red'
    };
    
    return colorMap[statusDisplay.color] || 'default';
  };

  const parseTreatments = (treatmentsString) => {
    if (!treatmentsString) return [];
    return treatmentsString.split('+').map(t => t.trim()).filter(Boolean);
  };

  return (
    <div>
      <Card style={{ marginBottom: 16, borderRadius: 10 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>Dashboard</Typography.Title>
        <Typography.Text type="secondary">Qui trovi lo stato delle lavorazioni e le notifiche rapide.</Typography.Text>
      </Card>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={4}>
          <Card>
            <Statistic title="Lavorazioni in corso" value={workInProgressComponents.length} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title="Commesse aperte" value={commesse.length} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title="Da verificare" value={workInProgressComponents.filter(c => !c.verificato).length} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title="In trattamento" value={workInProgressComponents.filter(c => c.status && c.status.startsWith('4:')).length} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title="Da spedire" value={components.filter(c => c.status === '5').length} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title="Completate oggi" value={components.filter(c => c.status === '6' && new Date(c.updatedAt).toDateString() === new Date().toDateString()).length} />
          </Card>
        </Col>
      </Row>

      {/* Work in Progress Components Section */}
      <Card style={{ borderRadius: 10 }}>
        <Title level={4} style={{ marginBottom: 16 }}>Lavorazioni in Corso</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 20 }}>
          Componenti che sono ancora in stato non spedito
        </Text>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <Spin size="large" />
          </div>
        ) : workInProgressComponents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 0', color: '#999' }}>
            <Text type="secondary">Nessuna lavorazione in corso</Text>
          </div>
        ) : (
          <Row gutter={[16, 16]}>
            {workInProgressComponents.map((comp) => (
              <Col key={comp._id} xs={24} sm={12} md={8} lg={6}>
                <Card 
                  size="small" 
                  style={{ 
                    height: '100%',
                    borderRadius: 8,
                    border: '1px solid #f0f0f0',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                  bodyStyle={{ padding: 16 }}
                >
                  {/* Commessa Info */}
                  <div style={{ marginBottom: 12 }}>
                    <Text strong style={{ color: '#1677ff', fontSize: 14 }}>
                      {comp.commessaCode}
                    </Text>
                    <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                      {comp.commessaName}
                    </div>
                  </div>

                  {/* Component Code */}
                  <div style={{ marginBottom: 12 }}>
                    <Text style={{ fontWeight: 500, fontSize: 13 }}>
                      {comp.descrizioneComponente || 'N/A'}
                    </Text>
                  </div>

                  {/* Barcode - shown only when there are treatments */}
                  {comp.barcode && comp.trattamenti && comp.trattamenti.length > 0 && (
                    <div style={{ 
                      marginBottom: 12, 
                      textAlign: 'center',
                      padding: '8px 0',
                      backgroundColor: '#fafafa',
                      borderRadius: 4,
                      cursor: 'pointer'
                    }}
                    onClick={() => setBarcodeModal({ open: true, value: comp.barcode })}
                    >
                      <BarcodeWithText 
                        value={comp.barcode} 
                        width={1.2} 
                        height={25} 
                        fontSize={8} 
                      />
                    </div>
                  )}

                  {/* Treatments */}
                  {comp.trattamenti && comp.trattamenti.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <Text style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 4 }}>
                        Trattamenti:
                      </Text>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {comp.trattamenti.map((treatment, index) => (
                          <Tag key={index} size="small" color="blue" style={{ fontSize: 10, margin: 0 }}>
                            {treatment}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Status */}
                  <div>
                    <Tag color={handleStatusColor(comp.status)} style={{ fontSize: 11, fontWeight: 'bold' }}>
                      {getStatusLabel(comp.status)}
                    </Tag>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Card>

      {/* Barcode Modal */}
      <Modal
        title="Codice a Barre"
        open={barcodeModal.open}
        onCancel={() => setBarcodeModal({ open: false, value: '' })}
        footer={null}
        centered
        styles={{
          body: {
            textAlign: 'center', 
            padding: '20px 10px',
            overflowX: 'auto',
            maxWidth: '100%'
          }
        }}
        style={{ borderRadius: 16, overflow: 'hidden' }}
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Typography.Title level={4} style={{ marginBottom: 20 }}>Barcode</Typography.Title>
          <div style={{ 
            width: '100%', 
            display: 'flex', 
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 100,
            padding: '10px 0'
          }}>
            <BarcodeWithText 
              value={barcodeModal.value} 
              width={2.5} 
              height={80} 
              fontSize={16} 
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
