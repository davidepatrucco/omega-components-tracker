import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { api } from '../api';
import { Row, Col, Card, Typography, Statistic, Spin, Tag, Modal, Button, Form, Input, message, Space, Tooltip, Select, Switch, DatePicker, Divider, Table, Segmented, Dropdown } from 'antd';
import { InfoCircleOutlined, PlusOutlined, CheckCircleOutlined, CloseCircleOutlined, SearchOutlined, FilterOutlined, SortAscendingOutlined, DownOutlined, AppstoreOutlined, UnorderedListOutlined, SaveOutlined, CopyOutlined } from '@ant-design/icons';
import BarcodeWithText from '../BarcodeWithText';
import { getStatusLabel, getStatusColor, formatStatusDisplay, buildAllowedStatuses } from '../utils/statusUtils';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

// Componente per header ridimensionabile
const ResizableTitle = (props) => {
  const { onResize, width, ...restProps } = props;
  const thRef = useRef(null);

  useEffect(() => {
    if (!thRef.current || !width) return;

    const th = thRef.current;
    let startX = 0;
    let startWidth = 0;
    let isResizing = false;

    const handleMouseDown = (e) => {
      const rect = th.getBoundingClientRect();
      const isNearRightEdge = e.clientX > rect.right - 10;
      
      if (!isNearRightEdge) return;

      isResizing = true;
      startX = e.clientX;
      startWidth = th.offsetWidth;

      e.preventDefault();
      e.stopPropagation();

      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';

      const handleMouseMove = (e) => {
        if (!isResizing) return;
        
        const diff = e.clientX - startX;
        const newWidth = Math.max(50, startWidth + diff);
        
        th.style.width = `${newWidth}px`;
        th.style.minWidth = `${newWidth}px`;
        th.style.maxWidth = `${newWidth}px`;
      };

      const handleMouseUp = (e) => {
        if (!isResizing) return;
        
        isResizing = false;
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        
        const diff = e.clientX - startX;
        const finalWidth = Math.max(50, startWidth + diff);
        
        if (onResize) {
          onResize(e, { size: { width: finalWidth } });
        }
        
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e) => {
      if (isResizing) return;
      
      const rect = th.getBoundingClientRect();
      const isNearRightEdge = e.clientX > rect.right - 10;
      
      th.style.cursor = isNearRightEdge ? 'col-resize' : '';
    };

    th.addEventListener('mousedown', handleMouseDown);
    th.addEventListener('mousemove', handleMouseMove);

    return () => {
      th.removeEventListener('mousedown', handleMouseDown);
      th.removeEventListener('mousemove', handleMouseMove);
    };
  }, [width, onResize]);

  if (!width) {
    return <th {...restProps} />;
  }

  return (
    <th 
      {...restProps} 
      ref={thRef}
      style={{ 
        ...restProps.style, 
        width: `${width}px`,
        position: 'relative',
        minWidth: '50px'
      }} 
    />
  );
};

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
  const [editingStatus, setEditingStatus] = useState(null); // Per editing inline
  const [form] = Form.useForm(); // Form per editing inline
  
  // Filtri e ordinamento
  const [filters, setFilters] = useState(() => {
    const saved = sessionStorage.getItem('lavorazioni_filters');
    return saved ? JSON.parse(saved) : {
      search: '',
      verificato: 'all', // 'all', 'true', 'false'
      includeShipped: true,
      status: 'all'
    };
  });
  const [sortBy, setSortBy] = useState(() => {
    return sessionStorage.getItem('lavorazioni_sortBy') || 'createdAt';
  }); // 'createdAt', 'commessaCode', 'status', 'descrizione'
  const [sortOrder, setSortOrder] = useState(() => {
    return sessionStorage.getItem('lavorazioni_sortOrder') || 'desc';
  }); // 'asc', 'desc'
  
  // Paginazione lazy
  const [visibleCount, setVisibleCount] = useState(8);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Save Report state
  const [saveReportModalOpen, setSaveReportModalOpen] = useState(false);
  const [newReportName, setNewReportName] = useState('');
  const [savingReport, setSavingReport] = useState(false);
  
  // Table filters state (for Ant Design table filters)
  const [tableFilters, setTableFilters] = useState(() => {
    const saved = sessionStorage.getItem('lavorazioni_tableFilters');
    return saved ? JSON.parse(saved) : {};
  });
  
  // Visualizzazione (card o lista)
  const [viewMode, setViewMode] = useState(() => {
    // Recupera la preferenza salvata o default 'card'
    return localStorage.getItem('lavorazioni_view_mode') || 'card';
  });

  // Stato per gestire le larghezze delle colonne
  const [columnWidths, setColumnWidths] = useState(() => {
    const saved = localStorage.getItem('lavorazioni_column_widths');
    return saved ? JSON.parse(saved) : {};
  });

  // 🆕 Stati per selezione multipla e azioni di massa
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Persistenza filtri in sessionStorage
  useEffect(() => {
    sessionStorage.setItem('lavorazioni_filters', JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    sessionStorage.setItem('lavorazioni_sortBy', sortBy);
  }, [sortBy]);

  useEffect(() => {
    sessionStorage.setItem('lavorazioni_sortOrder', sortOrder);
  }, [sortOrder]);

  useEffect(() => {
    sessionStorage.setItem('lavorazioni_tableFilters', JSON.stringify(tableFilters));
  }, [tableFilters]);

  // Funzione per gestire il ridimensionamento delle colonne
  const handleResize = (dataIndex) => (e, { size }) => {
    const widths = { ...columnWidths };
    widths[dataIndex] = size.width;
    setColumnWidths(widths);
    localStorage.setItem('lavorazioni_column_widths', JSON.stringify(widths));
  };

  // Genera statusOptions dinamicamente usando la configurazione centralizzata  
  const generateStatusOptions = (component = null) => {
    if (!component) {
      // Stati base per la creazione di nuovi componenti
      return [
        { value: '1', label: getStatusLabel('1'), color: getStatusColor('1') },
        { value: '2', label: getStatusLabel('2'), color: getStatusColor('2') },
        { value: '2-ext', label: getStatusLabel('2-ext'), color: getStatusColor('2-ext') },
        { value: '3', label: getStatusLabel('3'), color: getStatusColor('3') }
      ];
    }
    
    // Stati consentiti per il componente specifico
    const allowedStatuses = buildAllowedStatuses(component);
    return allowedStatuses.map(status => ({
      value: status,
      label: getStatusLabel(status),
      color: getStatusColor(status)
    }));
  };

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
      
      const fetchedCommesse = commisseRes.data || [];
      const fetchedComponents = componentsRes.data.items || [];
      
      // Crea una mappa commessaId -> deliveryDate per facilitare il join
      const commesseMap = {};
      fetchedCommesse.forEach(comm => {
        commesseMap[comm._id] = comm.deliveryDate;
      });
      
      // Arricchisci i componenti con deliveryDate dalla commessa
      const enrichedComponents = fetchedComponents.map(comp => ({
        ...comp,
        deliveryDate: commesseMap[comp.commessaId] || null
      }));
      
      setComponents(enrichedComponents);
      setCommesse(fetchedCommesse);
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
      const { componentId, newStatus, component } = statusChangeModal;
      
      const updateData = { 
        status: newStatus,
        note: values.note || undefined
      };

      // Se lo stato è "Spedito" (6), aggiungi i dati DDT (come DettaglioCommessa)
      if (requiresDDT(newStatus)) {
        if (!values.ddtNumber || !values.ddtDate) {
          message.error('Numero DDT e Data DDT sono obbligatori per la spedizione');
          return;
        }
        
        updateData.ddt = {
          numero: values.ddtNumber,
          date: values.ddtDate,
          corriere: values.corriere || '',
          tracking: values.tracking || ''
        };
      }

      await api.put(`/api/components/${componentId}`, updateData);
      message.success('Stato aggiornato con successo');
      setStatusChangeModal({ open: false, componentId: null, currentStatus: '', newStatus: '', component: null });
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

  // 🆕 Calcola gli stati comuni disponibili per i componenti selezionati
  const bulkAvailableStatuses = useMemo(() => {
    if (selectedRowKeys.length === 0) return [];
    
    const selectedComponents = components.filter(c => selectedRowKeys.includes(c._id));
    if (selectedComponents.length === 0) return [];
    
    // Intersezione degli allowedStatuses di tutti i componenti selezionati
    const commonStatuses = selectedComponents.reduce((acc, comp) => {
      const allowed = comp.allowedStatuses || [];
      if (acc === null) return new Set(allowed);
      return new Set([...acc].filter(s => allowed.includes(s)));
    }, null);
    
    return Array.from(commonStatuses || []);
  }, [selectedRowKeys, components]);

  // 🆕 Genera le opzioni del menu dropdown per SPOSTA IN
  const bulkStatusMenuItems = useMemo(() => {
    return bulkAvailableStatuses.map(status => ({
      key: status,
      label: getStatusLabel(status)
    }));
  }, [bulkAvailableStatuses]);

  // 🆕 Handler per cambio stato massivo generico
  const handleBulkStatusChange = async ({ key: newStatus }) => {
    if (selectedRowKeys.length === 0) {
      message.warning('Seleziona almeno un componente');
      return;
    }

    const selectedComponents = components.filter(c => selectedRowKeys.includes(c._id));
    const statusLabel = getStatusLabel(newStatus);
    
    Modal.confirm({
      title: `Sposta in: ${statusLabel}`,
      content: (
        <div>
          <p>Vuoi spostare <strong>{selectedComponents.length} componenti</strong> allo stato:</p>
          <p style={{ fontSize: 16, fontWeight: 'bold', color: '#1677ff' }}>{statusLabel}</p>
          {selectedComponents.length > 5 && (
            <p style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
              Componenti selezionati: {selectedComponents.slice(0, 5).map(c => c.descrizioneComponente || c.barcode).join(', ')}...
            </p>
          )}
        </div>
      ),
      okText: 'Conferma',
      cancelText: 'Annulla',
      onOk: async () => {
        setBulkActionLoading(true);
        try {
          const result = await api.post('/api/components/bulk-status-change', {
            componentIds: selectedRowKeys,
            newStatus,
            note: `Cambio stato di massa a: ${statusLabel}`
          });
          
          const { success, failed } = result.data.results || { success: [], failed: [] };
          
          if (failed.length > 0) {
            message.warning(`${success.length} componenti spostati, ${failed.length} non validi`);
          } else {
            message.success(`${success.length} componenti spostati in "${statusLabel}"`);
          }
          
          setSelectedRowKeys([]);
          fetchData();
        } catch (err) {
          console.error('Bulk status change error:', err);
          message.error(err.userMessage || 'Errore durante il cambio stato di massa');
        } finally {
          setBulkActionLoading(false);
        }
      }
    });
  };

  // Funzione legacy mantenuta per retrocompatibilità
  const handleBulkStartProduction = async () => {
    handleBulkStatusChange({ key: '2' });
  };

  // 🆕 Funzione per cancellazione multipla componenti
  const handleBulkDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Seleziona almeno un componente da cancellare');
      return;
    }

    const selectedComponents = components.filter(c => selectedRowKeys.includes(c._id));
    
    Modal.confirm({
      title: '⚠️ Conferma Cancellazione',
      content: (
        <div>
          <p><strong>Attenzione!</strong> Stai per cancellare <strong>{selectedComponents.length} componenti</strong>.</p>
          <p>Questa operazione è <strong>irreversibile</strong>.</p>
          <p style={{ marginTop: 16, fontSize: 12, color: '#666' }}>
            Componenti selezionati:
          </p>
          <ul style={{ maxHeight: 200, overflow: 'auto', fontSize: 12 }}>
            {selectedComponents.slice(0, 10).map(c => (
              <li key={c._id}>
                {c.descrizioneComponente || c._id} - {c.commessaCode} - {getStatusLabel(c.status)}
              </li>
            ))}
            {selectedComponents.length > 10 && <li>... e altri {selectedComponents.length - 10}</li>}
          </ul>
        </div>
      ),
      okText: 'Sì, cancella',
      okType: 'danger',
      cancelText: 'Annulla',
      icon: null,
      onOk: async () => {
        setBulkActionLoading(true);
        try {
          await api.post('/api/components/bulk-delete', {
            componentIds: selectedRowKeys
          });
          
          message.success(`${selectedComponents.length} componenti cancellati con successo`);
          setSelectedRowKeys([]);
          fetchData(); // Refresh data
        } catch (err) {
          console.error('Bulk delete error:', err);
          message.error(err.userMessage || 'Errore durante la cancellazione');
        } finally {
          setBulkActionLoading(false);
        }
      }
    });
  };

  // Funzioni per editing inline del status (come DettaglioCommessa)
  const editStatus = (componentId) => {
    setEditingStatus(componentId);
    const component = components.find(c => c._id === componentId);
    form.setFieldsValue({ status: component.status });
  };

  const cancelStatusEdit = () => {
    setEditingStatus(null);
    form.resetFields();
  };

  const saveStatusChange = async (componentId) => {
    try {
      const values = await form.validateFields(['status']);
      const component = components.find(c => c._id === componentId);
      
      // Se lo stato è cambiato, apri il modal ESATTAMENTE come DettaglioCommessa
      if (values.status !== component.status) {
        setStatusChangeModal({
          open: true,
          componentId: componentId,
          currentStatus: component.status,
          newStatus: values.status,
          component: component
        });
      }
      
      setEditingStatus(null);
    } catch (err) {
      console.error('Validation failed:', err);
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
    setStatusChangeModal({ open: false, componentId: null, currentStatus: '', newStatus: '', component: null });
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
          (comp.barcode && comp.barcode.toLowerCase().includes(searchLower)) ||
          (comp.trattamenti && comp.trattamenti.some(t => t.toLowerCase().includes(searchLower)));
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
        case 'deliveryDate':
          // Ordina per data di consegna della commessa
          aVal = a.deliveryDate ? new Date(a.deliveryDate) : new Date(0);
          bVal = b.deliveryDate ? new Date(b.deliveryDate) : new Date(0);
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
      // 🔥 CARICA TUTTI i componenti rimanenti, non solo +8
      setVisibleCount(filteredAndSortedComponents.length);
      setIsLoadingMore(false);
    }, 300);
  }, [filteredAndSortedComponents.length]);

  const handleFilterChange = (key, value) => {
    console.log(`Filter change: ${key} = ${value}`);
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value };
      console.log('New filters state:', newFilters);
      return newFilters;
    });
    setVisibleCount(8); // Reset pagination
  };

  const generateDefaultReportName = () => {
    const parts = [];
    
    // Check table filters instead of filters state
    if (tableFilters.commessaCode && tableFilters.commessaCode.length > 0) {
      parts.push(`Commessa: ${tableFilters.commessaCode[0]}`);
    }
    if (tableFilters.descrizioneComponente && tableFilters.descrizioneComponente.length > 0) {
      parts.push(`Desc: ${tableFilters.descrizioneComponente[0]}`);
    }
    if (tableFilters.status && tableFilters.status.length > 0) {
      parts.push(`Stato: ${getStatusLabel(tableFilters.status[0])}`);
    }
    if (tableFilters.trattamenti && tableFilters.trattamenti.length > 0) {
      parts.push(`Tratt: ${tableFilters.trattamenti[0]}`);
    }
    if (tableFilters.verificato && tableFilters.verificato.length > 0) {
      parts.push(`Verif: ${tableFilters.verificato[0] ? 'Sì' : 'No'}`);
    }
    
    const base = parts.length ? parts.join(' | ') : 'Tutti';
    const date = new Date().toISOString().slice(0,10);
    return `Report - ${base} - ${date}`;
  };

  const openSaveReportModal = () => {
    console.log('Opening save report modal. Current table filters:', tableFilters);
    setNewReportName(generateDefaultReportName());
    setSaveReportModalOpen(true);
  };

  const handleSaveReport = async () => {
    try {
      if (!newReportName || newReportName.trim().length === 0) {
        message.error('Inserire un nome per il report');
        return;
      }
      setSavingReport(true);
      
      // Save table filters instead of filters state
      console.log('Saving report with table filters:', tableFilters);
      
      const response = await api.post('/api/reports', { 
        name: newReportName.trim(), 
        filters: tableFilters 
      });
      console.log('Report saved:', response.data);
      
      message.success('Report salvato');
      setSaveReportModalOpen(false);
    } catch (err) {
      console.error('Error saving report', err);
      message.error('Errore durante il salvataggio del report');
    } finally {
      setSavingReport(false);
    }
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Typography.Title level={3} style={{ margin: 0 }}>Dashboard Lavorazioni</Typography.Title>
            <Typography.Text type="secondary">Qui trovi lo stato delle lavorazioni e le notifiche rapide.</Typography.Text>
          </div>
          <Segmented
            value={viewMode}
            onChange={(value) => {
              setViewMode(value);
              localStorage.setItem('lavorazioni_view_mode', value);
            }}
            options={[
              { 
                label: 'Card', 
                value: 'card', 
                icon: <AppstoreOutlined /> 
              },
              { 
                label: 'Lista', 
                value: 'list', 
                icon: <UnorderedListOutlined /> 
              }
            ]}
            style={{ 
              backgroundColor: '#fff',
              borderRadius: 8,
              padding: 2
            }}
            size="middle"
          />
        </div>
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
        
        {/* Filtri e Ordinamento */}
        <Card 
          size="small" 
          style={{ 
            marginBottom: 20, 
            backgroundColor: '#fafafa',
            border: '1px solid #e8e8e8'
          }}
        >
          <Row gutter={[12, 16]} align="middle">
            {/* Ricerca */}
            <Col xs={24} sm={10} md={8} lg={7}>
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
            <Col xs={8} sm={4} md={3} lg={2}>
              <Space direction="vertical" size={2} style={{ width: '100%' }}>
                <Text style={{ fontSize: 11, color: '#666' }}>Verif.</Text>
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
            <Col xs={8} sm={4} md={3} lg={2}>
              <Space direction="vertical" size={2} align="center" style={{ width: '100%' }}>
                <Text style={{ fontSize: 11, color: '#666' }}>Spediti</Text>
                <Switch
                  size="small"
                  checked={filters.includeShipped}
                  onChange={(checked) => handleFilterChange('includeShipped', checked)}
                />
              </Space>
            </Col>
            
            {/* Filtro Stato */}
            <Col xs={8} sm={6} md={4} lg={3}>
              <Space direction="vertical" size={2} style={{ width: '100%' }}>
                <Text style={{ fontSize: 11, color: '#666' }}>Stato</Text>
                <Select
                  size="small"
                  value={filters.status}
                  onChange={(value) => handleFilterChange('status', value)}
                  style={{ width: '100%' }}
                  options={[
                    { label: 'Tutti', value: 'all' },
                    { label: getStatusLabel('1'), value: '1' },
                    { label: getStatusLabel('2'), value: '2' },
                    { label: getStatusLabel('2-ext'), value: '2-ext' },
                    { label: getStatusLabel('3'), value: '3' },
                    { label: getStatusLabel('4'), value: '4' },
                    { label: getStatusLabel('5'), value: '5' },
                    { label: getStatusLabel('6'), value: '6' }
                  ]}
                />
              </Space>
            </Col>
            
            {/* Ordinamento */}
            <Col xs={24} sm={10} md={6} lg={5}>
              <Space direction="vertical" size={2} style={{ width: '100%' }}>
                <Text style={{ fontSize: 11, color: '#666' }}>Ordina per</Text>
                <Space size={4} style={{ width: '100%' }}>
                  <Select
                    size="small"
                    value={sortBy}
                    onChange={(value) => setSortBy(value)}
                    style={{ flex: 1, minWidth: 110 }}
                    options={[
                      { label: 'Data creaz.', value: 'createdAt' },
                      { label: 'Data consegna', value: 'deliveryDate' },
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
          
          {/* Statistiche filtri e azioni di massa */}
          <div style={{ marginTop: 12, fontSize: 12, color: '#666', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>Mostrando {visibleComponents.length} di {filteredAndSortedComponents.length} componenti</div>
            <Space size={8}>
              {/* 🆕 Azioni di massa - mostrate solo in visualizzazione lista */}
              {viewMode === 'list' && selectedRowKeys.length > 0 && (
                <>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {selectedRowKeys.length} selezionati
                  </Text>
                  <Dropdown
                    menu={{ 
                      items: bulkStatusMenuItems,
                      onClick: handleBulkStatusChange
                    }}
                    disabled={bulkStatusMenuItems.length === 0 || bulkActionLoading}
                    trigger={['click']}
                  >
                    <Button 
                      size="small" 
                      type="primary"
                      loading={bulkActionLoading}
                    >
                      SPOSTA IN <DownOutlined />
                    </Button>
                  </Dropdown>
                  {bulkStatusMenuItems.length === 0 && selectedRowKeys.length > 0 && (
                    <Tooltip title="I componenti selezionati non hanno stati di destinazione comuni">
                      <Text type="secondary" style={{ fontSize: 11 }}>Nessuno stato comune</Text>
                    </Tooltip>
                  )}
                  <Button 
                    size="small" 
                    danger
                    loading={bulkActionLoading}
                    onClick={handleBulkDelete}
                  >
                    Cancella selezionati
                  </Button>
                  <Button 
                    size="small" 
                    onClick={() => setSelectedRowKeys([])}
                  >
                    Deseleziona
                  </Button>
                </>
              )}
              <Button size="small" icon={<SaveOutlined />} onClick={openSaveReportModal}>
                Salva Report
              </Button>
            </Space>
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
        ) : viewMode === 'list' ? (
          /* Visualizzazione Lista/Tabella */
          <Card style={{ marginTop: 16 }}>
            <Table
              dataSource={visibleComponents}
              rowKey="_id"
              pagination={false}
              size="small"
              bordered
              rowSelection={{
                selectedRowKeys,
                onChange: (selectedKeys) => setSelectedRowKeys(selectedKeys),
                getCheckboxProps: (record) => ({
                  // Opzionale: disabilita checkbox per componenti non in stato NUOVO
                  // disabled: record.status !== '1',
                }),
              }}
              components={{
                header: { cell: ResizableTitle }
              }}
              onChange={(pagination, filters, sorter, extra) => {
                console.log('Table filters changed:', filters);
                // Clean filters: remove null/undefined values
                const cleanedFilters = Object.keys(filters).reduce((acc, key) => {
                  if (filters[key] !== null && filters[key] !== undefined) {
                    acc[key] = filters[key];
                  }
                  return acc;
                }, {});
                console.log('Cleaned filters:', cleanedFilters);
                setTableFilters(cleanedFilters);
                
                // 🔥 SOLUZIONE: Se ci sono filtri attivi, carica TUTTI i componenti automaticamente
                const hasActiveFilters = Object.keys(cleanedFilters).length > 0;
                if (hasActiveFilters && visibleCount < filteredAndSortedComponents.length) {
                  console.log('🔍 Filtro applicato - carico tutti i componenti automaticamente');
                  setVisibleCount(filteredAndSortedComponents.length);
                }
              }}
              onRow={(record) => ({
                onClick: (event) => {
                  // Non navigare se l'utente sta selezionando testo (per copiare codici componente)
                  const selection = window.getSelection();
                  if (selection && selection.toString().trim().length > 0) {
                    return;
                  }
                  // Non navigare se si clicca su elementi interattivi
                  const isInteractiveElement = event.target.closest('.ant-switch, .ant-tag, .ant-btn, .ant-select, .ant-checkbox');
                  if (!isInteractiveElement && record.commessaId) {
                    navigate(`/commesse/${record.commessaId}`);
                  }
                },
                style: { cursor: 'pointer' }
              })}
              columns={[
                {
                  title: 'Commessa',
                  dataIndex: 'commessaCode',
                  key: 'commessaCode',
                  width: columnWidths['commessaCode'] || 140,
                  filteredValue: tableFilters.commessaCode || null,
                  onHeaderCell: () => ({
                    width: columnWidths['commessaCode'] || 140,
                    onResize: handleResize('commessaCode'),
                  }),
                  filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
                    <div style={{ padding: 8 }}>
                      <Input
                        placeholder="Cerca commessa"
                        value={selectedKeys[0]}
                        onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
                        onPressEnter={() => confirm()}
                        style={{ width: 188, marginBottom: 8, display: 'block' }}
                      />
                      <Space>
                        <Button
                          type="primary"
                          onClick={() => confirm()}
                          icon={<SearchOutlined />}
                          size="small"
                          style={{ width: 90 }}
                        >
                          Cerca
                        </Button>
                        <Button onClick={() => { clearFilters(); confirm(); }} size="small" style={{ width: 90 }}>
                          Reset
                        </Button>
                      </Space>
                    </div>
                  ),
                  filterIcon: filtered => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
                  onFilter: (value, record) => 
                    record.commessaCode?.toLowerCase().includes(value.toLowerCase()) ||
                    record.commessaName?.toLowerCase().includes(value.toLowerCase()),
                  render: (text, record) => (
                    <div>
                      <Text strong style={{ color: '#1677ff', fontSize: 13 }}>{text}</Text>
                      <div style={{ fontSize: 11, color: '#666' }}>{record.commessaName}</div>
                    </div>
                  )
                },
                {
                  title: 'Componente',
                  dataIndex: 'descrizioneComponente',
                  key: 'descrizioneComponente',
                  width: columnWidths['descrizioneComponente'] || 180,
                  filteredValue: tableFilters.descrizioneComponente || null,
                  onHeaderCell: () => ({
                    width: columnWidths['descrizioneComponente'] || 180,
                    onResize: handleResize('descrizioneComponente'),
                  }),
                  filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
                    <div style={{ padding: 8 }}>
                      <Input
                        placeholder="Cerca componente"
                        value={selectedKeys[0]}
                        onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
                        onPressEnter={() => confirm()}
                        style={{ width: 188, marginBottom: 8, display: 'block' }}
                      />
                      <Space>
                        <Button
                          type="primary"
                          onClick={() => confirm()}
                          icon={<SearchOutlined />}
                          size="small"
                          style={{ width: 90 }}
                        >
                          Cerca
                        </Button>
                        <Button onClick={() => { clearFilters(); confirm(); }} size="small" style={{ width: 90 }}>
                          Reset
                        </Button>
                      </Space>
                    </div>
                  ),
                  filterIcon: filtered => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
                  onFilter: (value, record) => 
                    record.descrizioneComponente?.toLowerCase().includes(value.toLowerCase()),
                  ellipsis: true,
                  render: (text) => (
                    <span 
                      onClick={(e) => e.stopPropagation()} 
                      style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <span style={{ cursor: 'text', userSelect: 'text', flex: 1 }}>{text}</span>
                      <Tooltip title="Copia codice">
                        <Button
                          type="text"
                          size="small"
                          icon={<CopyOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(text);
                            message.success('Codice copiato!');
                          }}
                          style={{ padding: 0, height: 'auto', minWidth: 'auto', color: '#999' }}
                        />
                      </Tooltip>
                    </span>
                  )
                },
                {
                  title: 'Qty',
                  dataIndex: 'qty_t',
                  key: 'qty_t',
                  width: columnWidths['qty_t'] || 80,
                  onHeaderCell: () => ({
                    width: columnWidths['qty_t'] || 80,
                    onResize: handleResize('qty_t'),
                  }),
                  align: 'center',
                  render: (text) => text || '-'
                },
                {
                  title: 'Stato',
                  dataIndex: 'status',
                  key: 'status',
                  width: columnWidths['status'] || 160,
                  filteredValue: tableFilters.status || null,
                  onHeaderCell: () => ({
                    width: columnWidths['status'] || 160,
                    onResize: handleResize('status'),
                  }),
                  filters: [
                    { text: 'Arrivato', value: '1' },
                    { text: 'In lavorazione interna', value: '2' },
                    { text: 'Inviato a trattamento', value: '2-ext' },
                    { text: 'Arrivato da trattamento', value: '2-ext:ARR' },
                    { text: 'Lavorato', value: '3' },
                    { text: 'Montato', value: '4' },
                    { text: 'Pronto', value: '5' },
                    { text: 'Spedito', value: '6' },
                  ],
                  onFilter: (value, record) => record.status === value,
                  filterIcon: filtered => <FilterOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
                  render: (status, record) => {
                    if (editingStatus === record._id) {
                      return (
                        <Form form={form} component={false}>
                          <Form.Item name="status" style={{ margin: 0 }}>
                            <Select 
                              style={{ width: '100%' }}
                              onBlur={() => saveStatusChange(record._id)}
                              onSelect={(value) => {
                                form.setFieldsValue({ status: value });
                                saveStatusChange(record._id);
                              }}
                              autoFocus
                              size="small"
                            >
                              {generateStatusOptions(record).map(option => (
                                <Select.Option key={option.value} value={option.value}>
                                  {option.label}
                                </Select.Option>
                              ))}
                            </Select>
                          </Form.Item>
                        </Form>
                      );
                    }
                    
                    const display = formatStatusDisplay(status);
                    return (
                      <Tooltip title="Clicca per cambiare stato">
                        <Tag 
                          color={display.color} 
                          style={{ 
                            cursor: 'pointer',
                            margin: 0,
                            fontSize: 11
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            editStatus(record._id);
                          }}
                        >
                          {display.label}
                        </Tag>
                      </Tooltip>
                    );
                  }
                },
                {
                  title: 'Type',
                  dataIndex: 'type',
                  key: 'type',
                  width: columnWidths['type'] || 100,
                  filteredValue: tableFilters.type || null,
                  onHeaderCell: () => ({
                    width: columnWidths['type'] || 100,
                    onResize: handleResize('type'),
                  }),
                  filters: [
                    { text: 'INT', value: 'INT' },
                    { text: 'EST', value: 'EST' },
                    { text: 'C/LAV', value: 'C/LAV' },
                    { text: 'CLM', value: 'CLM' },
                  ],
                  onFilter: (value, record) => record.type === value,
                  filterIcon: filtered => <FilterOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
                  align: 'center',
                  render: (text) => text ? (
                    <Tag color="blue" style={{ fontSize: 10 }}>{text}</Tag>
                  ) : '-'
                },
                {
                  title: 'Trattamenti',
                  dataIndex: 'trattamenti',
                  key: 'trattamenti',
                  width: columnWidths['trattamenti'] || 130,
                  filteredValue: tableFilters.trattamenti || null,
                  onHeaderCell: () => ({
                    width: columnWidths['trattamenti'] || 130,
                    onResize: handleResize('trattamenti'),
                  }),
                  filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
                    <div style={{ padding: 8 }}>
                      <Input
                        placeholder="Cerca trattamento"
                        value={selectedKeys[0]}
                        onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
                        onPressEnter={() => confirm()}
                        style={{ width: 188, marginBottom: 8, display: 'block' }}
                      />
                      <Space>
                        <Button
                          type="primary"
                          onClick={() => confirm()}
                          icon={<SearchOutlined />}
                          size="small"
                          style={{ width: 90 }}
                        >
                          Cerca
                        </Button>
                        <Button onClick={() => { clearFilters(); confirm(); }} size="small" style={{ width: 90 }}>
                          Reset
                        </Button>
                      </Space>
                    </div>
                  ),
                  filterIcon: filtered => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
                  onFilter: (value, record) => {
                    if (!record.trattamenti || !Array.isArray(record.trattamenti)) return false;
                    return record.trattamenti.some(t => 
                      t?.toLowerCase().includes(value.toLowerCase())
                    );
                  },
                  render: (trattamenti) => (
                    trattamenti && trattamenti.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {trattamenti.map((t, i) => (
                          <Tag key={i} style={{ fontSize: 10, margin: 0 }}>{t}</Tag>
                        ))}
                      </div>
                    ) : '-'
                  )
                },
                {
                  title: 'Fornitore Tratt.',
                  dataIndex: 'fornitoreTrattamenti',
                  key: 'fornitoreTrattamenti',
                  width: columnWidths['fornitoreTrattamenti'] || 150,
                  filteredValue: tableFilters.fornitoreTrattamenti || null,
                  onHeaderCell: () => ({
                    width: columnWidths['fornitoreTrattamenti'] || 150,
                    onResize: handleResize('fornitoreTrattamenti'),
                  }),
                  filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
                    <div style={{ padding: 8 }}>
                      <Input
                        placeholder="Cerca fornitore"
                        value={selectedKeys[0]}
                        onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
                        onPressEnter={() => confirm()}
                        style={{ width: 188, marginBottom: 8, display: 'block' }}
                      />
                      <Space>
                        <Button
                          type="primary"
                          onClick={() => confirm()}
                          icon={<SearchOutlined />}
                          size="small"
                          style={{ width: 90 }}
                        >
                          Cerca
                        </Button>
                        <Button onClick={() => { clearFilters(); confirm(); }} size="small" style={{ width: 90 }}>
                          Reset
                        </Button>
                      </Space>
                    </div>
                  ),
                  filterIcon: filtered => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
                  onFilter: (value, record) => 
                    record.fornitoreTrattamenti?.toLowerCase().includes(value.toLowerCase()),
                  render: (text) => text || '-'
                },
                {
                  title: 'DDT Tratt.',
                  dataIndex: 'ddtTrattamenti',
                  key: 'ddtTrattamenti',
                  width: columnWidths['ddtTrattamenti'] || 120,
                  onHeaderCell: () => ({
                    width: columnWidths['ddtTrattamenti'] || 120,
                    onResize: handleResize('ddtTrattamenti'),
                  }),
                  render: (text) => text || '-'
                },
                {
                  title: 'Verificato',
                  dataIndex: 'verificato',
                  key: 'verificato',
                  width: columnWidths['verificato'] || 100,
                  filteredValue: tableFilters.verificato || null,
                  onHeaderCell: () => ({
                    width: columnWidths['verificato'] || 100,
                    onResize: handleResize('verificato'),
                  }),
                  filters: [
                    { text: 'Verificato', value: true },
                    { text: 'Da verificare', value: false },
                  ],
                  onFilter: (value, record) => record.verificato === value,
                  filterIcon: filtered => <FilterOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
                  align: 'center',
                  render: (verificato, record) => (
                    <Tooltip title="Clicca per cambiare">
                      <Switch
                        size="small"
                        checked={verificato || false}
                        onChange={(checked, e) => {
                          e.stopPropagation();
                          handleVerificatoChange(record);
                        }}
                        onClick={(checked, e) => e.stopPropagation()}
                        checkedChildren="Sì"
                        unCheckedChildren="No"
                      />
                    </Tooltip>
                  )
                },
                {
                  title: 'Barcode',
                  dataIndex: 'barcode',
                  key: 'barcode',
                  width: columnWidths['barcode'] || 120,
                  onHeaderCell: () => ({
                    width: columnWidths['barcode'] || 120,
                    onResize: handleResize('barcode'),
                  }),
                  render: (text) => text ? (
                    <Tooltip title="Clicca per ingrandire">
                      <Text 
                        style={{ fontSize: 11, cursor: 'pointer', color: '#1677ff' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setBarcodeModal({ open: true, value: text });
                        }}
                      >
                        {text}
                      </Text>
                    </Tooltip>
                  ) : '-'
                },
                {
                  title: 'Info',
                  key: 'actions',
                  width: columnWidths['actions'] || 100,
                  onHeaderCell: () => ({
                    width: columnWidths['actions'] || 100,
                    onResize: handleResize('actions'),
                  }),
                  align: 'center',
                  fixed: 'right',
                  render: (_, record) => (
                    <Space size="small">
                      <Tooltip title="Info complete">
                        <Button
                          type="text"
                          size="small"
                          icon={<InfoCircleOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            setComponentInfoModal({ open: true, component: record });
                          }}
                        />
                      </Tooltip>
                      {record.status === '6' && (
                        <Tooltip title="Info spedizione">
                          <Button
                            type="text"
                            size="small"
                            icon={<InfoCircleOutlined style={{ color: '#52c41a' }} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              setShippingInfoModal({ open: true, component: record });
                            }}
                          />
                        </Tooltip>
                      )}
                    </Space>
                  )
                }
              ]}
              scroll={{ x: 1600 }}
            />
            {visibleComponents.length < filteredAndSortedComponents.length && (
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <Button
                  type="primary"
                  ghost
                  icon={<DownOutlined />}
                  onClick={handleLoadMore}
                  loading={isLoadingMore}
                  style={{ borderRadius: 20 }}
                >
                  Carica tutti i componenti ({filteredAndSortedComponents.length - visibleCount} rimanenti)
                </Button>
              </div>
            )}
          </Card>
        ) : (
          /* Visualizzazione Card (esistente) */
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
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  bodyStyle={{ padding: 16 }}
                  hoverable
                  onClick={() => {
                    // Naviga al dettaglio commessa
                    if (comp.commessaId) {
                      navigate(`/commesse/${comp.commessaId}`);
                    }
                  }}
                  extra={
                    <Space>
                      {/* Icona info completa */}
                      <Tooltip title="Informazioni complete">
                        <Button
                          type="text"
                          size="small"
                          icon={<PlusOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            setComponentInfoModal({ open: true, component: comp });
                          }}
                        />
                      </Tooltip>
                      
                      {/* Icona DDT per stati spediti */}
                      {(comp.status === '6') && (
                        <Tooltip title="Informazioni spedizione">
                          <Button
                            type="text"
                            size="small"
                            icon={<InfoCircleOutlined />}
                            onClick={(e) => {
                              e.stopPropagation();
                              setShippingInfoModal({ open: true, component: comp });
                            }}
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
                        responsive={true}
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

                  {/* DDT Trattamenti */}
                  {comp.ddtTrattamenti && (
                    <div style={{ marginBottom: 12 }}>
                      <Text style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 4 }}>
                        DDT Tratt.:
                      </Text>
                      <Text style={{ fontSize: 12 }}>{comp.ddtTrattamenti}</Text>
                    </div>
                  )}

                  {/* Status - Clickable for quick change */}
                  <div>
                    {editingStatus === comp._id ? (
                      <Form form={form} component={false}>
                        <Form.Item name="status" style={{ margin: 0 }}>
                          <Select 
                            style={{ minWidth: 120 }}
                            onBlur={() => saveStatusChange(comp._id)}
                            onSelect={(value) => {
                              form.setFieldsValue({ status: value });
                              saveStatusChange(comp._id);
                            }}
                            autoFocus
                          >
                            {generateStatusOptions(comp).map(option => (
                              <Select.Option key={option.value} value={option.value}>
                                {option.label}
                              </Select.Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Form>
                    ) : (
                      <Tooltip title="Clicca qui per cambiare stato">
                        <Tag 
                          color={handleStatusColor(comp.status)} 
                          style={{ fontSize: 11, fontWeight: 'bold', cursor: 'pointer' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            editStatus(comp._id);
                          }}
                        >
                          {getStatusLabel(comp.status)}
                        </Tag>
                      </Tooltip>
                    )}
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
                  Carica tutti i componenti ({filteredAndSortedComponents.length - visibleCount} rimanenti)
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Barcode Modal */}
      {/* Save Report Modal */}
      <Modal
        title="Salva Report"
        open={saveReportModalOpen}
        onCancel={() => setSaveReportModalOpen(false)}
        onOk={handleSaveReport}
        okText="Salva"
        confirmLoading={savingReport}
      >
        <div style={{ marginBottom: 8 }}>Salva i filtri correnti come un report dinamico. Il report verrà rieseguito al momento della visualizzazione.</div>
        <Form layout="vertical">
          <Form.Item label="Nome report" required>
            <Input value={newReportName} onChange={(e) => setNewReportName(e.target.value)} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        open={barcodeModal.open}
        onCancel={() => setBarcodeModal({ open: false, value: '' })}
        footer={null}
        centered
        title="Barcode"
        width={800}
        style={{ maxWidth: '90vw' }}
      >
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <BarcodeWithText 
            value={barcodeModal.value} 
            width={3} 
            height={80} 
            fontSize={16}
            responsive={true}
          />
        </div>
      </Modal>

      {/* Status Change Modal - IDENTICO a DettaglioCommessa */}
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
            <Text strong>Cambio stato: </Text>
            <Tag color={getStatusColor(statusChangeModal.currentStatus)}>
              {getStatusLabel(statusChangeModal.currentStatus)}
            </Tag>
            <Text> → </Text>
            <Tag color={getStatusColor(statusChangeModal.newStatus)}>
              {getStatusLabel(statusChangeModal.newStatus)}
            </Tag>
          </div>
          
          <Form.Item
            label="Nota (opzionale)"
            name="note"
          >
            <Input.TextArea 
              rows={3} 
              placeholder="Inserisci una nota per questo cambio di stato..."
            />
          </Form.Item>
          
          {requiresDDT(statusChangeModal.newStatus) && (
            <>
              <Divider orientation="left">Dati DDT</Divider>
              <Form.Item
                label="Numero DDT"
                name="ddtNumber"
              >
                <Input placeholder="Inserisci numero DDT..." />
              </Form.Item>
              
              <Form.Item
                label="Data DDT"
                name="ddtDate"
              >
                <Input type="date" />
              </Form.Item>
            </>
          )}
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
            
            {componentInfoModal.component.ddtTrattamenti && (
              <div style={{ marginTop: 20 }}>
                <Text strong>DDT Trattamenti: </Text>
                <Text>{componentInfoModal.component.ddtTrattamenti}</Text>
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
