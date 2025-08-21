import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../api';
import { Row, Col, Card, Typography, Statistic, Spin, Tag, Modal, Button, Form, Input, message, Space, Tooltip, Select, Switch, DatePicker, Divider } from 'antd';
import { InfoCircleOutlined, PlusOutlined, CheckCircleOutlined, CloseCircleOutlined, SearchOutlined, FilterOutlined, SortAscendingOutlined, DownOutlined } from '@ant-design/icons';
import BarcodeWithText from '../BarcodeWithText';
import { getStatusLabel, getStatusColor, formatStatusDisplay, buildAllowedStatuses } from '../utils/statusUtils';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

// Funzione per determinare se lo stato richiede DDT
const requiresDDT = (status) => {
  return status === '6'; // Spedito
};

export default function Lavorazioni(){
  const navigate = useNavigate();
  const [components, setComponents] = useState([]);
  const [commesse, setCommesse] = useState([]);
  const [stats, setStats] = useState({
    inLavorazione: 0,
    commesseAperte: 0,
    verificato: { nonVerificati: 0, percentage: 0 },
    inTrattamento: 0,
    daSpedire: 0,
    speditOggi: 0
  });
  const [loading, setLoading] = useState(true);
  const [barcodeModal, setBarcodeModal] = useState({ open: false, value: '' });
  const [statusChangeModal, setStatusChangeModal] = useState({ 
    open: false, 
    component: null, 
    currentStatus: '', 
    newStatus: '' 
  });
  const [componentInfoModal, setComponentInfoModal] = useState({ 
    open: false, 
    component: null 
  });
  const [shippingInfoModal, setShippingInfoModal] = useState({ 
    open: false, 
    component: null 
  });
  const [statusChangeForm] = Form.useForm();
  
  // Filtri e ordinamento
  const [filters, setFilters] = useState({
    search: '',
    verificato: 'all', // 'all', 'true', 'false'
    includeShipped: true,
    status: 'all'
  });
  const [sortBy, setSortBy] = useState('createdAt'); // 'createdAt', 'commessaCode', 'status', 'descrizione'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc', 'desc'
  
  // Paginazione lazy
  const [visibleCount, setVisibleCount] = useState(8);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch components, commesse and stats in parallel
      const [componentsRes, commisseRes, statsRes] = await Promise.all([
        api.get('/api/components?pageSize=1000'), // Get a large number of components
        api.get('/api/commesse'),
        api.get('/api/stats')
      ]);
      
      setComponents(componentsRes.data.items || []);
      setCommesse(commisseRes.data || []);
      setStats(statsRes.data || {
        inLavorazione: 0,
        commesseAperte: 0,
        verificato: { nonVerificati: 0, percentage: 0 },
        inTrattamento: 0,
        daSpedire: 0,
        speditOggi: 0
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      // Set fallback values in case of error
      setStats({
        inLavorazione: 0,
        commesseAperte: 0,
        verificato: { nonVerificati: 0, percentage: 0 },
        inTrattamento: 0,
        daSpedire: 0,
        speditOggi: 0
      });
    } finally {
      setLoading(false);
    }
  };

  // Non più necessario, usiamo filteredAndSortedComponents

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

  const handleStatusChange = async (values) => {
    try {
      const { component } = statusChangeModal;
      const newStatus = values.newStatus;
      
      const updateData = { 
        status: newStatus,
        note: values.note || undefined
      };

      // Se lo stato è "Spedito" (6), aggiungi i dati DDT
      if (requiresDDT(newStatus)) {
        if (!values.numeroDDT || !values.dataDDT) {
          message.error('Numero DDT e Data DDT sono obbligatori per la spedizione');
          return;
        }
        
        updateData.ddt = {
          numero: values.numeroDDT,
          date: values.dataDDT.toISOString(),
          corriere: values.corriere || '',
          tracking: values.tracking || ''
        };
      }

      await api.put(`/api/components/${component._id}`, updateData);
      message.success('Stato aggiornato con successo');
      setStatusChangeModal({ open: false, component: null, currentStatus: '', newStatus: '' });
      statusChangeForm.resetFields();
      fetchData(); // Refresh data
    } catch (err) {
      message.error(err.userMessage || 'Errore durante il cambio stato');
    }
  };

  const handleVerificatoChange = async (component) => {
    try {
      const newVerificato = !component.verificato;
      await api.put(`/api/components/${component._id}`, { verificato: newVerificato });
      message.success(`Componente ${newVerificato ? 'verificato' : 'non verificato'}`);
      fetchData(); // Refresh data
    } catch (err) {
      message.error(err.userMessage || 'Errore durante il cambio stato verificato');
    }
  };

  // Funzione per aprire la modal di cambio stato con select libero
  const openStatusChangeModal = (component) => {
    setStatusChangeModal({
      open: true,
      component,
      currentStatus: component.status,
      newStatus: '' // Inizialmente vuoto per selezione libera
    });
    statusChangeForm.setFieldsValue({
      newStatus: undefined,
      note: ''
    });
  };

  const handleCancelStatusChange = () => {
    setStatusChangeModal({ open: false, component: null, currentStatus: '', newStatus: '' });
    statusChangeForm.resetFields();
  };

  // Funzioni per filtri e ordinamento
  const filteredAndSortedComponents = useMemo(() => {
    let filtered = components.filter(comp => {
      // Filtro base: non cancellati
      if (comp.cancellato) return false;
      
      // Filtro stati spediti
      if (!filters.includeShipped && comp.status === '6') return false;
      
      // Filtro testo ricerca
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          (comp.commessaCode && comp.commessaCode.toLowerCase().includes(searchLower)) ||
          (comp.commessaName && comp.commessaName.toLowerCase().includes(searchLower)) ||
          (comp.descrizioneComponente && comp.descrizioneComponente.toLowerCase().includes(searchLower)) ||
          (comp.barcode && comp.barcode.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }
      
      // Filtro verificato
      if (filters.verificato !== 'all') {
        const isVerificato = filters.verificato === 'true';
        if (comp.verificato !== isVerificato) return false;
      }
      
      // Filtro stato
      if (filters.status !== 'all' && comp.status !== filters.status) {
        return false;
      }
      
      return true;
    });

    // Ordinamento
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'commessaCode':
          aVal = a.commessaCode || '';
          bVal = b.commessaCode || '';
          break;
        case 'status':
          aVal = parseInt(a.status) || 0;
          bVal = parseInt(b.status) || 0;
          break;
        case 'descrizione':
          aVal = a.descrizioneComponente || '';
          bVal = b.descrizioneComponente || '';
          break;
        case 'createdAt':
        default:
          aVal = new Date(a.createdAt || 0);
          bVal = new Date(b.createdAt || 0);
          break;
      }
      
      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    return filtered;
  }, [components, filters, sortBy, sortOrder]);

  const visibleComponents = useMemo(() => {
    return filteredAndSortedComponents.slice(0, visibleCount);
  }, [filteredAndSortedComponents, visibleCount]);

  const hasMoreComponents = filteredAndSortedComponents.length > visibleCount;

  const handleLoadMore = useCallback(() => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount(prev => prev + 8);
      setIsLoadingMore(false);
    }, 300);
  }, []);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setVisibleCount(8); // Reset pagination
  };

  // Rendering condizionale per loading DOPO tutti gli hook
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

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={4}>
          <Card>
            <Statistic title="In lavorazione" value={stats?.inLavorazione || 0} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title="Commesse aperte" value={stats?.commesseAperte || 0} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic 
              title="Da verificare" 
              value={stats?.verificato?.nonVerificati || 0}
              suffix={`(${stats?.verificato?.percentage || 0}%)`}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title="In trattamento" value={stats?.inTrattamento || 0} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title="Da spedire" value={stats?.daSpedire || 0} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title="Spediti oggi" value={stats?.speditOggi || 0} />
          </Card>
        </Col>
      </Row>

      {/* Work in Progress Components Section */}
      <Card style={{ borderRadius: 10 }}>
        <Title level={4} style={{ marginBottom: 16 }}>Lavorazioni in Corso</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 20 }}>
          Componenti che sono ancora in stato non spedito
        </Text>
        
        {/* Filtri e Ordinamento */}
        <Card 
          size="small" 
          style={{ 
            marginBottom: 20, 
            backgroundColor: '#fafafa',
            border: '1px solid #e8e8e8'
          }}
        >
          <Row gutter={[16, 16]} align="middle">
            {/* Prima riga - Ricerca */}
            <Col xs={24} sm={12} md={8}>
              <Input
                placeholder="Cerca componente, commessa, descrizione..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                style={{ borderRadius: 8, marginTop:20}}
                allowClear
              />
            </Col>
            
            {/* Filtro Verificato */}
            <Col xs={12} sm={6} md={4}>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <Text style={{ fontSize: 12, color: '#666' }}>Verificato</Text>
                <Select
                  size="small"
                  value={filters.verificato}
                  onChange={(value) => handleFilterChange('verificato', value)}
                  style={{ width: '100%' }}
                  options={[
                    { label: 'Tutti', value: 'all' },
                    { label: 'Sì', value: 'true' },
                    { label: 'No', value: 'false' }
                  ]}
                />
              </Space>
            </Col>
            
            {/* Filtro Include Spediti */}
            <Col xs={12} sm={6} md={4}>
              <Space direction="vertical" size={4}>
                <Text style={{ fontSize: 12, color: '#666' }}>Includi spediti</Text>
                <Switch
                  size="small"
                  checked={filters.includeShipped}
                  onChange={(checked) => handleFilterChange('includeShipped', checked)}
                />
              </Space>
            </Col>
            
            {/* Filtro Stato */}
            <Col xs={24} sm={12} md={4}>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <Text style={{ fontSize: 12, color: '#666' }}>Stato</Text>
                <Select
                  size="small"
                  value={filters.status}
                  onChange={(value) => handleFilterChange('status', value)}
                  style={{ width: '100%' }}
                  options={[
                    { label: 'Tutti gli stati', value: 'all' },
                    { label: '1 - Creato', value: '1' },
                    { label: '2 - Produzione Interna', value: '2' },
                    { label: '3 - Costruito', value: '3' },
                    { label: '4 - In preparazione nichelatura', value: '4' },
                    { label: '6 - Spedito', value: '6' }
                  ]}
                />
              </Space>
            </Col>
            
            {/* Ordinamento */}
            <Col xs={24} sm={12} md={4}>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <Text style={{ fontSize: 12, color: '#666' }}>Ordina per</Text>
                <Space size={4}>
                  <Select
                    size="small"
                    value={sortBy}
                    onChange={(value) => setSortBy(value)}
                    style={{ width: 120 }}
                    options={[
                      { label: 'Data creazione', value: 'createdAt' },
                      { label: 'Commessa', value: 'commessaCode' },
                      { label: 'Stato', value: 'status' },
                      { label: 'Descrizione', value: 'descrizione' }
                    ]}
                  />
                  <Button
                    size="small"
                    icon={<SortAscendingOutlined />}
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    type={sortOrder === 'asc' ? 'primary' : 'default'}
                  />
                </Space>
              </Space>
            </Col>
          </Row>
          
          {/* Statistiche filtri */}
          <div style={{ marginTop: 12, fontSize: 12, color: '#666' }}>
            Mostrando {visibleComponents.length} di {filteredAndSortedComponents.length} componenti
          </div>
        </Card>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <Spin size="large" />
          </div>
        ) : filteredAndSortedComponents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 0', color: '#999' }}>
            <Text type="secondary">Nessuna lavorazione trovata con i filtri selezionati</Text>
          </div>
        ) : (
          <>
            <Row gutter={[16, 16]}>
              {visibleComponents.map((comp) => (
              <Col key={comp._id} xs={24} sm={12} md={8} lg={6}>
                <Card 
                  size="small" 
                  style={{ 
                    height: '100%',
                    borderRadius: 8,
                    border: '1px solid #f0f0f0',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    cursor: 'pointer'
                  }}
                  bodyStyle={{ padding: 16 }}
                  onClick={() => navigate('/dettaglio-commessa', { 
                    state: { 
                      commessaId: comp.commessaId, 
                      highlightComponentId: comp._id 
                    } 
                  })}
                  extra={
                    <Space>
                      {/* Icona info completa */}
                      <Tooltip title="Informazioni complete">
                        <Button
                          type="text"
                          size="small"
                          icon={<PlusOutlined />}
                          onClick={() => setComponentInfoModal({ open: true, component: comp })}
                        />
                      </Tooltip>
                      
                      {/* Icona DDT per stati spediti */}
                      {(comp.status === '6') && (
                        <Tooltip title="Informazioni spedizione">
                          <Button
                            type="text"
                            size="small"
                            icon={<InfoCircleOutlined />}
                            onClick={() => setShippingInfoModal({ open: true, component: comp })}
                          />
                        </Tooltip>
                      )}
                    </Space>
                  }
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

                  {/* Verificato Status */}
                  <div style={{ marginBottom: 12 }}>
                    <Space>
                      <Text style={{ fontSize: 12 }}>Verificato:</Text>
                      <Tooltip title="Clicca per cambiare stato verificato">
                        <Switch
                          size="small"
                          checked={comp.verificato || false}
                          onChange={() => handleVerificatoChange(comp)}
                          checkedChildren="Sì"
                          unCheckedChildren="No"
                        />
                      </Tooltip>
                    </Space>
                  </div>

                  {/* Barcode */}
                  {comp.barcode && (
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

                  {/* Status - Clickable for quick change */}
                  <div>
                    <Tooltip title="Clicca qui per cambiare stato">
                      <Tag 
                        color={handleStatusColor(comp.status)} 
                        style={{ fontSize: 11, fontWeight: 'bold', cursor: 'pointer' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          openStatusChangeModal(comp);
                        }}
                      >
                        {getStatusLabel(comp.status)}
                      </Tag>
                    </Tooltip>
                  </div>
                </Card>
              </Col>
            ))}
            </Row>
            
            {/* Lazy Loading - Load More Button */}
            {hasMoreComponents && (
              <div style={{ 
                textAlign: 'center', 
                marginTop: 24, 
                paddingBottom: 16 
              }}>
                <Button
                  type="primary"
                  ghost
                  icon={<DownOutlined />}
                  loading={isLoadingMore}
                  onClick={handleLoadMore}
                  style={{ borderRadius: 20 }}
                >
                  Carica altri componenti ({filteredAndSortedComponents.length - visibleCount} rimanenti)
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Barcode Modal */}
      <Modal
        open={barcodeModal.open}
        onCancel={() => setBarcodeModal({ open: false, value: '' })}
        footer={null}
        centered
        title="Barcode"
        width={800}
        style={{ maxWidth: '90vw' }}
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <BarcodeWithText 
            value={barcodeModal.value} 
            width={3} 
            height={80} 
            fontSize={16} 
          />
        </div>
      </Modal>

      {/* Status Change Modal */}
      <Modal
        title="Cambio Stato"
        open={statusChangeModal.open}
        onOk={() => statusChangeForm.submit()}
        onCancel={handleCancelStatusChange}
        okText="Conferma"
        cancelText="Annulla"
        destroyOnClose
      >
        <Form
          form={statusChangeForm}
          layout="vertical"
          onFinish={handleStatusChange}
        >
          <div style={{ marginBottom: 16 }}>
            <Text strong>Componente: </Text>
            <Text>{statusChangeModal.component?.descrizioneComponente}</Text>
          </div>
          
          <div style={{ marginBottom: 16 }}>
            <Text strong>Stato attuale: </Text>
            <Tag color={getStatusColor(statusChangeModal.currentStatus)}>
              {getStatusLabel(statusChangeModal.currentStatus)}
            </Tag>
          </div>

          <Form.Item
            label="Nuovo stato"
            name="newStatus"
            rules={[{ required: true, message: 'Seleziona il nuovo stato' }]}
          >
            <Select
              placeholder="Seleziona stato"
              onChange={(value) => {
                const newModal = { ...statusChangeModal, newStatus: value };
                setStatusChangeModal(newModal);
              }}
            >
              {statusChangeModal.component && buildAllowedStatuses(statusChangeModal.component).map(status => (
                <Select.Option key={status.value} value={status.value}>
                  <Tag color={getStatusColor(status.value)} style={{ marginRight: 8 }}>
                    {status.label}
                  </Tag>
                  {status.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {/* Campi DDT per stato "Spedito" */}
          {statusChangeModal.newStatus === '6' && (
            <>
              <Divider orientation="left">Informazioni DDT</Divider>
              <Form.Item
                label="Numero DDT"
                name="numeroDDT"
                rules={[{ required: true, message: 'Il numero DDT è obbligatorio per la spedizione' }]}
              >
                <Input placeholder="Inserisci numero DDT" />
              </Form.Item>
              <Form.Item
                label="Data DDT"
                name="dataDDT"
                rules={[{ required: true, message: 'La data DDT è obbligatoria per la spedizione' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                label="Corriere"
                name="corriere"
              >
                <Input placeholder="Nome corriere (opzionale)" />
              </Form.Item>
              <Form.Item
                label="Numero di tracking"
                name="tracking"
              >
                <Input placeholder="Codice tracking (opzionale)" />
              </Form.Item>
            </>
          )}
          
          <Form.Item
            label="Nota (opzionale)"
            name="note"
          >
            <Input.TextArea rows={3} placeholder="Inserisci eventuali note..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Component Info Modal */}
      <Modal
        title="Informazioni Complete Componente"
        open={componentInfoModal.open}
        onCancel={() => setComponentInfoModal({ open: false, component: null })}
        footer={[
          <Button key="close" onClick={() => setComponentInfoModal({ open: false, component: null })}>
            Chiudi
          </Button>
        ]}
        width={800}
      >
        {componentInfoModal.component && (
          <div>
            <Row gutter={16}>
              <Col span={12}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>Commessa: </Text>
                  <Text>{componentInfoModal.component.commessaCode} - {componentInfoModal.component.commessaName}</Text>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>Descrizione: </Text>
                  <Text>{componentInfoModal.component.descrizioneComponente}</Text>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>Barcode: </Text>
                  <Text>{componentInfoModal.component.barcode || 'N/A'}</Text>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>Stato attuale: </Text>
                  <Tag color={handleStatusColor(componentInfoModal.component.status)}>
                    {getStatusLabel(componentInfoModal.component.status)}
                  </Tag>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>Verificato: </Text>
                  <Text style={{ color: componentInfoModal.component.verificato ? 'green' : 'red' }}>
                    {componentInfoModal.component.verificato ? 'Sì' : 'No'}
                  </Text>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>Data creazione: </Text>
                  <Text>
                    {componentInfoModal.component.createdAt ? 
                      new Date(componentInfoModal.component.createdAt).toLocaleString('it-IT') : 
                      'N/A'
                    }
                  </Text>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>Ultima modifica: </Text>
                  <Text>
                    {componentInfoModal.component.updatedAt ? 
                      new Date(componentInfoModal.component.updatedAt).toLocaleString('it-IT') : 
                      'N/A'
                    }
                  </Text>
                </div>
              </Col>
            </Row>
            
            {componentInfoModal.component.trattamenti && componentInfoModal.component.trattamenti.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <Text strong>Trattamenti: </Text>
                <div style={{ marginTop: 8 }}>
                  {componentInfoModal.component.trattamenti.map((treatment, index) => (
                    <Tag key={index} color="blue" style={{ marginBottom: 4 }}>
                      {treatment}
                    </Tag>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Shipping Info Modal */}
      <Modal
        title="Informazioni Spedizione"
        open={shippingInfoModal.open}
        onCancel={() => setShippingInfoModal({ open: false, component: null })}
        footer={[
          <Button key="close" onClick={() => setShippingInfoModal({ open: false, component: null })}>
            Chiudi
          </Button>
        ]}
        width={600}
      >
        {shippingInfoModal.component && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Text strong>Componente: </Text>
              <Text>{shippingInfoModal.component.descrizioneComponente}</Text>
            </div>
            
            {/* History DDT info */}
            {shippingInfoModal.component.history && shippingInfoModal.component.history.length > 0 ? (
              <div>
                <Text strong>Cronologia spedizioni:</Text>
                {shippingInfoModal.component.history
                  .filter(item => item.ddt)
                  .map((historyItem, index) => (
                    <div key={index} style={{ 
                      padding: 12, 
                      background: '#f5f5f5', 
                      borderRadius: 6, 
                      marginTop: 8 
                    }}>
                      <div style={{ marginBottom: 8 }}>
                        <Text strong>Numero DDT: </Text>
                        <Text>{historyItem.ddt?.number || 'Non specificato'}</Text>
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <Text strong>Data DDT: </Text>
                        <Text>
                          {historyItem.ddt?.date ? new Date(historyItem.ddt.date).toLocaleDateString('it-IT') : 'Non specificata'}
                        </Text>
                      </div>
                      <div>
                        <Text strong>Data cambio stato: </Text>
                        <Text>
                          {new Date(historyItem.timestamp).toLocaleDateString('it-IT')}
                        </Text>
                      </div>
                    </div>
                  ))
                }
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#999' }}>
                <Text type="secondary">Nessuna informazione di spedizione disponibile</Text>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
