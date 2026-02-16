import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, 
  Typography, 
  Button, 
  Table, 
  Form, 
  Input, 
  Select, 
  Modal, 
  Popconfirm, 
  Space, 
  Tag, 
  message as antdMessage,
  Tooltip,
  Spin,
  Divider,
  Switch,
  Timeline,
  Dropdown,
  Checkbox
} from 'antd';
import { 
  ArrowLeftOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  SaveOutlined, 
  CloseOutlined, 
  HistoryOutlined, 
  PlusOutlined,
  InfoCircleOutlined,
  EyeOutlined,
  SettingOutlined,
  SearchOutlined,
  FilterOutlined
} from '@ant-design/icons';
import BarcodeWithText from '../BarcodeWithText';
import { getStatusLabel, getStatusColor, formatStatusDisplay, buildAllowedStatuses } from '../utils/statusUtils';
import { api } from '../api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

// Componente per header ridimensionabile con drag nativo
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
      // Verifica se il click è vicino al bordo destro (ultimi 10px)
      const rect = th.getBoundingClientRect();
      const isNearRightEdge = e.clientX > rect.right - 10;
      
      if (!isNearRightEdge) return;

      isResizing = true;
      startX = e.clientX;
      startWidth = th.offsetWidth;

      e.preventDefault();
      e.stopPropagation();

      // Previeni selezione testo
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';

      const handleMouseMove = (e) => {
        if (!isResizing) return;
        
        const diff = e.clientX - startX;
        const newWidth = Math.max(50, startWidth + diff); // Minimo 50px
        
        // Aggiorna IMMEDIATAMENTE la larghezza visiva
        th.style.width = `${newWidth}px`;
        th.style.minWidth = `${newWidth}px`;
        th.style.maxWidth = `${newWidth}px`;
      };

      const handleMouseUp = (e) => {
        if (!isResizing) return;
        
        isResizing = false;
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        
        // Solo alla fine del drag, salva la larghezza finale
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

const DettaglioCommessa = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [commessa, setCommessa] = useState(null);
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form] = Form.useForm();
  const [editingKey, setEditingKey] = useState('');
  const [adding, setAdding] = useState(false);
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);
  const [barcodeModal, setBarcodeModal] = useState({ open: false, value: '' });
  const [treatments, setTreatments] = useState([]); // Lista trattamenti dall'anagrafica
  const [statusChangeModal, setStatusChangeModal] = useState({ 
    open: false, 
    componentId: null, 
    currentStatus: '', 
    newStatus: '', 
    component: null 
  });
  const [statusChangeForm] = Form.useForm();
  const [historyModal, setHistoryModal] = useState({ open: false, component: null });
  
  // Stato per gestire le colonne visibili
  const [hiddenColumns, setHiddenColumns] = useState(() => {
    // Carica preferenze da localStorage o usa default
    const saved = localStorage.getItem('dettaglio_commessa_hidden_columns');
    return saved ? JSON.parse(saved) : ['bom_text', 'qty_u', 'uta_u', 'uta_t'];
  });

  // Stato per gestire le larghezze delle colonne
  const [columnWidths, setColumnWidths] = useState(() => {
    const saved = localStorage.getItem('dettaglio_commessa_column_widths');
    return saved ? JSON.parse(saved) : {};
  });

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

  const columnsDef = [
    { title: 'Liv.', dataIndex: 'level', key: 'level', width: 70 },
    { title: 'Crit.', dataIndex: 'crit', key: 'crit', width: 70 },
    { title: 'Codice Componente', dataIndex: 'descrizioneComponente', key: 'descrizioneComponente', width: 140 },
    { title: 'Descrizione', dataIndex: 'componentNotes', key: 'componentNotes', width: 180 },
    { title: 'BOM', dataIndex: 'bom_text', key: 'bom_text', width: 140 },
    { title: 'Qty U', dataIndex: 'qty_u', key: 'qty_u', width: 60 },
    { title: 'UtA U', dataIndex: 'uta_u', key: 'uta_u', width: 60 },
    { title: 'Qty T', dataIndex: 'qty_t', key: 'qty_t', width: 60 },
    { title: 'UtA T', dataIndex: 'uta_t', key: 'uta_t', width: 60 },
    { title: 'MAG - Note', dataIndex: 'mag', key: 'mag', width: 150 },
    { title: 'Stato', dataIndex: 'status', key: 'status', width: 110 },
    { title: 'Type', dataIndex: 'type', key: 'type', width: 90 },
    { title: 'Trattamenti', dataIndex: 'trattamenti', key: 'trattamenti', width: 120 },
    { title: 'Fornitore Tratt.', dataIndex: 'fornitoreTrattamenti', key: 'fornitoreTrattamenti', width: 150 },
    { title: 'DDT Tratt.', dataIndex: 'ddtTrattamenti', key: 'ddtTrattamenti', width: 120 },
    { title: 'Verificato', dataIndex: 'verificato', key: 'verificato', width: 90 },
    { title: 'Barcode', dataIndex: 'barcode', key: 'barcode', width: 80 },
    { title: 'Azioni', dataIndex: 'actions', key: 'actions', width: 80 }
  ];

  useEffect(() => {
    fetchData();
    fetchTreatments();
  }, [id]);

  const fetchTreatments = async () => {
    try {
      const response = await api.get('/api/treatments');
      setTreatments(response.data || []);
    } catch (error) {
      console.error('Error loading treatments:', error);
      // Non mostrare errore all'utente, i trattamenti sono opzionali
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      console.log('[Frontend] fetchData called, commessa ID:', id);
      
      // Recupera la commessa
      const commessaResponse = await api.get(`/api/commesse/${id}`);
      setCommessa(commessaResponse.data);
      
      // Recupera i componenti per questa commessa
      const componentsResponse = await api.get(`/api/components/commessa/${id}`);
      console.log('[Frontend] fetchData - received components:', componentsResponse.data?.length);
      console.log('[Frontend] fetchData - components sample:', componentsResponse.data?.[0]);
      
      // Aggiungi timestamp per forzare re-render
      const componentsWithTimestamp = (componentsResponse.data || []).map(comp => ({
        ...comp,
        _fetchTimestamp: Date.now()
      }));
      
      setComponents(componentsWithTimestamp);
      
    } catch (error) {
      console.error('Error loading data:', error);
      antdMessage.error('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const isEditing = (record) => (record._id || record.key) === editingKey;
  
  const edit = (record) => {
    form.resetFields(); // Reset form prima di impostare nuovi valori
    form.setFieldsValue({ ...record });
    setEditingKey(record._id || record.key);
  };

  const cancel = () => {
    setEditingKey('');
    if (adding) {
      setAdding(false);
      setComponents(prev => prev.filter(r => r.key !== 'new'));
    }
  };

  const save = async (key) => {
    try {
      const row = await form.validateFields();
      
      console.log('[Frontend] save() - Form values:', row);
      console.log('[Frontend] save() - ddtTrattamenti value:', row.ddtTrattamenti);
      
      // Normalizza i trattamenti in un array
      if (row.trattamenti) {
        if (typeof row.trattamenti === 'string') {
          // Se è una stringa, splittala sui separatori comuni
          row.trattamenti = row.trattamenti
            .split(/[+,;]/)
            .map(t => t.trim().toLowerCase())
            .filter(t => t && t.length > 0);
        } else if (!Array.isArray(row.trattamenti)) {
          row.trattamenti = [];
        } else {
          // Se è già un array, normalizza ogni elemento
          row.trattamenti = row.trattamenti
            .map(t => typeof t === 'string' ? t.trim().toLowerCase() : t)
            .filter(t => t && t.length > 0);
        }
      } else {
        row.trattamenti = [];
      }
      
      if (adding) {
        // Creazione nuovo componente
        const componentData = {
          ...row,
          commessaId: id,
          commessaCode: commessa?.code || '',
          commessaName: commessa?.name || '',
          commessaNotes: commessa?.notes || '',
          commessaCreatedAt: commessa?.createdAt || new Date(),
          status: row.status || '1',
          allowedStatuses: ['1', '2', '3', '5', '6'], // Base statuses
          verificato: false,
          cancellato: false
        };
        
        const response = await api.post('/api/components', componentData);
        
        if (response.status === 200 || response.status === 201) {
          antdMessage.success('Componente aggiunto');
          fetchData();
          setAdding(false);
        }
      } else {
        // Aggiornamento componente esistente
        const componentToUpdate = components.find(c => c._id === key);
        
        // Controlla se è cambiato lo stato
        if (row.status && row.status !== componentToUpdate.status) {
          // Apri modale per cambio stato
          setStatusChangeModal({
            open: true,
            componentId: key,
            currentStatus: componentToUpdate.status,
            newStatus: row.status,
            component: componentToUpdate,
            otherChanges: { ...row, status: undefined } // Altri campi modificati
          });
          return; // Esce dalla funzione save, la modale gestirà il salvataggio
        }
        
        // Rimuovi solo i campi gestiti automaticamente dal backend
        const { history, createdAt, updatedAt, __v, _fetchTimestamp, ...componentDataToSend } = componentToUpdate;
        
        const updatedData = {
          ...componentDataToSend,
          ...row
        };
        
        console.log('[Frontend] Updating component:', key);
        console.log('[Frontend] Component to update:', componentToUpdate);
        console.log('[Frontend] Row data:', row);
        console.log('[Frontend] Final updated data:', updatedData);
        
        const response = await api.put(`/api/components/${key}`, updatedData);
        
        console.log('[Frontend] Update response status:', response.status);
        console.log('[Frontend] Update response data:', response.data);
        
        if (response.status === 200) {
          antdMessage.success('Componente aggiornato');
          fetchData();
        }
      }
      
      setEditingKey('');
    } catch (errInfo) {
      console.error('[Frontend] Error in save operation:', errInfo);
      console.log('[Frontend] Validate Failed:', errInfo);
      antdMessage.error('Errore nella validazione dei dati');
    }
  };

  const handleStatusChange = async (values) => {
    try {
      const { componentId, currentStatus, newStatus, component, otherChanges } = statusChangeModal;
      
      // Prepara i dati per l'aggiornamento - ESCLUDI solo i campi gestiti automaticamente dal backend
      const { history, createdAt, updatedAt, __v, _fetchTimestamp, ...componentDataToSend } = component;
      
      const updatedData = {
        ...componentDataToSend,
        ...otherChanges, // Altri campi modificati nella tabella
        status: newStatus,
        statusChangeNote: values.note || ''
      };
      
      console.log('[Frontend] Status change - updating component:', componentId);
      console.log('[Frontend] Status change data:', updatedData);
      
      const response = await api.put(`/api/components/${componentId}`, updatedData);
      
      if (response.status === 200) {
        antdMessage.success(`Stato cambiato da "${getStatusLabel(currentStatus)}" a "${getStatusLabel(newStatus)}"`);
        console.log('[Frontend] Status change successful, calling fetchData...');
        await fetchData();
        console.log('[Frontend] fetchData completed after status change');
        setStatusChangeModal({ open: false, componentId: null, currentStatus: '', newStatus: '', component: null });
        statusChangeForm.resetFields();
        setEditingKey('');
      }
    } catch (error) {
      console.error('[Frontend] Error in status change:', error);
      antdMessage.error('Errore durante il cambio di stato');
    }
  };

  const handleCancelStatusChange = () => {
    setStatusChangeModal({ open: false, componentId: null, currentStatus: '', newStatus: '', component: null });
    statusChangeForm.resetFields();
    setEditingKey(''); // Esce dalla modalità editing
  };

  // Funzione per gestire il ridimensionamento delle colonne
  const handleResize = (dataIndex) => (e, { size }) => {
    const widths = { ...columnWidths };
    widths[dataIndex] = size.width;
    setColumnWidths(widths);
    localStorage.setItem('dettaglio_commessa_column_widths', JSON.stringify(widths));
  };

  // Funzione per toggleare la visibilità di una colonna
  const toggleColumnVisibility = (columnKey) => {
    setHiddenColumns(prev => {
      const newHidden = prev.includes(columnKey)
        ? prev.filter(k => k !== columnKey)
        : [...prev, columnKey];
      
      // Salva in localStorage
      localStorage.setItem('dettaglio_commessa_hidden_columns', JSON.stringify(newHidden));
      return newHidden;
    });
  };

  const handleDelete = async (key) => {
    try {
      const response = await api.delete(`/api/components/${key}`);
      
      if (response.status === 200) {
        antdMessage.success('Componente eliminato');
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting component:', error);
      antdMessage.error('Errore durante l\'eliminazione');
    }
  };

  const addNewComponent = () => {
    setAdding(true);
    setEditingKey('new');
    const emptyRow = { 
      key: 'new',
      descrizioneComponente: '',
      componentNotes: '',
      level: '',
      crit: '',
      bom_text: '',
      qty_u: 1,
      uta_u: 'PC',
      qty_t: 1,
      uta_t: 'PC',
      mag: '',
      type: '',
      trattamenti: [],
      fornitoreTrattamenti: '',
      ddtTrattamenti: '',
      status: '1',
      verificato: false,
      barcode: ''
    };
    setComponents(prev => [emptyRow, ...prev.filter(r => r.key !== 'new')]);
    form.setFieldsValue(emptyRow);
  };

  // Usa la configurazione centralizzata degli stati
  const getStatusColor = (status) => {
    const statusDisplay = formatStatusDisplay(status);
    
    // Mappa i colori hex ai nomi di colori Ant Design
    const colorMap = {
      '#d9d9d9': 'default',
      '#1890ff': 'blue', 
      '#722ed1': 'purple',
      '#52c41a': 'green',
      '#389e0d': 'green',
      '#faad14': 'gold',
      '#ff4d4f': 'red',
      '#eb2f96': 'magenta',
      '#13c2c2': 'cyan',
      '#fa541c': 'volcano'
    };
    
    return colorMap[statusDisplay.color] || 'default';
  };

  const columns = columnsDef
    .filter(col => !hiddenColumns.includes(col.dataIndex)) // Filtra le colonne nascoste
    .map((col, index) => {
    // Applica la larghezza salvata o usa quella di default
    const width = columnWidths[col.dataIndex] || col.width;
    
    // Proprietà comuni a tutte le colonne per il resize
    const commonProps = {
      ...col,
      width,
      onHeaderCell: () => ({
        width,
        onResize: handleResize(col.dataIndex),
      }),
    };
    
    if (col.dataIndex === 'descrizioneComponente') {
      return {
        ...commonProps,
        filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
          <div style={{ padding: 8 }}>
            <Input
              placeholder="Cerca codice componente"
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
        render: (text, record) => (
          <div style={{ fontWeight: 500 }}>{text}</div>
        ),
        onCell: (record) => ({
          record,
          inputType: 'text',
          dataIndex: col.dataIndex,
          title: col.title,
          editing: isEditing(record),
          required: true
        }),
      };
    }

    if (col.dataIndex === 'trattamenti') {
      return {
        ...commonProps,
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
          if (!record.trattamenti) return false;
          if (Array.isArray(record.trattamenti)) {
            return record.trattamenti.some(t => 
              t?.toLowerCase().includes(value.toLowerCase())
            );
          }
          return record.trattamenti.toLowerCase().includes(value.toLowerCase());
        },
        render: (text, record) => {
          if (Array.isArray(text) && text.length > 0) {
            return (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {text.map((t, i) => (
                  <Tag key={i} color="blue" style={{ marginBottom: 4 }}>
                    {t}
                  </Tag>
                ))}
              </div>
            );
          }
          if (typeof text === 'string' && text.trim() && text !== '-') {
            return <Tag color="blue">{text}</Tag>;
          }
          return <span style={{ color: '#999', fontStyle: 'italic' }}>Nessun trattamento</span>;
        },
        onCell: (record) => ({
          record,
          inputType: 'tags',
          dataIndex: col.dataIndex,
          title: col.title,
          editing: isEditing(record),
        }),
      };
    }

    if (col.dataIndex === 'status') {
      return {
        ...commonProps,
        filters: [
          { text: '1 - Nuovo', value: '1' },
          { text: '2 - Produzione Interna', value: '2' },
          { text: '2 - Produzione Esterna', value: '2-ext' },
          { text: '3 - Costruito', value: '3' },
          { text: '4a - In preparazione', value: 'PREP' },
          { text: '4b - In trattamento', value: 'IN' },
          { text: '4c - Arrivato da trattamento', value: 'ARR' },
          { text: '5 - Pronto per consegna', value: '5' },
          { text: '6 - Spedito', value: '6' },
        ],
        onFilter: (value, record) => {
          if (['PREP', 'IN', 'ARR'].includes(value)) {
            return record.status && record.status.startsWith('4:') && record.status.endsWith(':' + value);
          }
          return record.status === value;
        },
        filterIcon: filtered => <FilterOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
        render: (text, record) => (
          <Tag color={getStatusColor(text)}>
            {getStatusLabel(text)}
          </Tag>
        ),
        onCell: (record) => ({
          record,
          inputType: 'select',
          dataIndex: col.dataIndex,
          title: col.title,
          editing: isEditing(record),
          options: generateStatusOptions(record)
        }),
      };
    }

    if (col.dataIndex === 'verificato') {
      return {
        ...commonProps,
        filters: [
          { text: 'Verificato', value: true },
          { text: 'Da verificare', value: false },
        ],
        onFilter: (value, record) => record.verificato === value,
        filterIcon: filtered => <FilterOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
        render: (text, record) => (
          <Tag color={text ? 'green' : 'orange'}>
            {text ? 'Verificato' : 'Da verificare'}
          </Tag>
        ),
        onCell: (record) => ({
          record,
          inputType: 'boolean',
          dataIndex: col.dataIndex,
          title: col.title,
          editing: isEditing(record),
        }),
      };
    }

    if (col.dataIndex === 'barcode') {
      return {
        ...commonProps,
        render: (text, record) => {
          if (!text) return '-';
          return (
            <div style={{ cursor: 'pointer' }} onClick={() => setBarcodeModal({ open: true, value: text })}>
              <BarcodeWithText value={text} width={1} height={15} fontSize={6} />
            </div>
          );
        },
        onCell: (record) => ({
          record,
          inputType: 'text',
          dataIndex: col.dataIndex,
          title: col.title,
          editing: isEditing(record),
        }),
      };
    }

    if (col.dataIndex === 'ddtTrattamenti') {
      return {
        ...commonProps,
        filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
          <div style={{ padding: 8 }}>
            <Input
              placeholder="Cerca DDT"
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
          record.ddtTrattamenti?.toLowerCase().includes(value.toLowerCase()),
        onCell: (record) => ({
          record,
          inputType: 'text',
          dataIndex: col.dataIndex,
          title: col.title,
          editing: isEditing(record),
        }),
      };
    }

    if (col.dataIndex === 'actions') {
      return {
        ...commonProps,
        render: (text, record) => {
          const editable = isEditing(record);
          return (
            <Space size={4}>
              {editable ? (
                <>
                  <Tooltip title="Salva">
                    <Button 
                      icon={<SaveOutlined />} 
                      type="primary" 
                      shape="circle" 
                      size="small" 
                      onClick={() => save(record._id || record.key)} 
                    />
                  </Tooltip>
                  <Tooltip title="Annulla">
                    <Button 
                      icon={<CloseOutlined />} 
                      shape="circle" 
                      size="small" 
                      onClick={cancel} 
                    />
                  </Tooltip>
                </>
              ) : (
                <>
                  <Tooltip title="Modifica">
                    <Button 
                      icon={<EditOutlined />} 
                      shape="circle" 
                      size="small" 
                      onClick={() => edit(record)} 
                    />
                  </Tooltip>
                  {record.history && record.history.length > 0 && (
                    <Tooltip title="Storico stati">
                      <Button 
                        icon={<HistoryOutlined />} 
                        shape="circle" 
                        size="small" 
                        onClick={() => setHistoryModal({ open: true, component: record })}
                      />
                    </Tooltip>
                  )}

                  <Popconfirm 
                    title="Eliminare il componente?" 
                    onConfirm={() => handleDelete(record._id)} 
                    okText="Sì" 
                    cancelText="No"
                  >
                    <Tooltip title="Elimina">
                      <Button 
                        icon={<DeleteOutlined />} 
                        danger 
                        shape="circle" 
                        size="small" 
                      />
                    </Tooltip>
                  </Popconfirm>
                </>
              )}
            </Space>
          );
        }
      };
    }

    // Aggiungi filtri per colonne specifiche
    const filters = {};
    if (col.dataIndex === 'type') {
      filters.filters = [
        { text: 'INT', value: 'INT' },
        { text: 'EST', value: 'EST' },
        { text: 'C/LAV', value: 'C/LAV' },
        { text: 'CLM', value: 'CLM' },
      ];
      filters.onFilter = (value, record) => record.type === value;
      filters.filterIcon = filtered => <FilterOutlined style={{ color: filtered ? '#1890ff' : undefined }} />;
    }
    
    if (col.dataIndex === 'fornitoreTrattamenti') {
      filters.filterDropdown = ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
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
      );
      filters.filterIcon = filtered => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />;
      filters.onFilter = (value, record) => 
        record.fornitoreTrattamenti?.toLowerCase().includes(value.toLowerCase());
    }
    
    if (col.dataIndex === 'componentNotes') {
      filters.filterDropdown = ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Cerca descrizione"
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
      );
      filters.filterIcon = filtered => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />;
      filters.onFilter = (value, record) => 
        record.componentNotes?.toLowerCase().includes(value.toLowerCase());
    }

    return {
      ...commonProps,
      ...filters,
      onCell: (record) => ({
        record,
        inputType: col.dataIndex === 'qty_u' || col.dataIndex === 'qty_t' ? 'number' : 'text',
        dataIndex: col.dataIndex,
        title: col.title,
        editing: isEditing(record),
      }),
    };
  });

  const expandedRowRender = (record) => (
    <div style={{ background: '#f9f9f9', padding: 12, borderRadius: 8 }}>
      <Typography.Text strong>Storico cambi stato</Typography.Text>
      <Table
        size="small"
        pagination={false}
        columns={[
          { title: 'Da', dataIndex: 'from', key: 'from' },
          { title: 'A', dataIndex: 'to', key: 'to' },
          { title: 'Data', dataIndex: 'date', key: 'date', render: d => d ? new Date(d).toLocaleString() : '' },
          { title: 'Note', dataIndex: 'note', key: 'note' },
          { title: 'Utente', dataIndex: 'user', key: 'user' },
        ]}
        dataSource={(record.history || []).map((h, i) => ({ ...h, key: i }))}
      />
    </div>
  );

  const EditableCell = ({ editing, dataIndex, title, inputType, record, children, options, required, ...restProps }) => {
    let inputNode;
    
    if (editing) {
      if (inputType === 'select') {
        inputNode = (
          <Select style={{ minWidth: 120 }}>
            {options?.map(opt => (
              <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
            ))}
          </Select>
        );
      } else if (inputType === 'boolean') {
        inputNode = <Switch checkedChildren="Sì" unCheckedChildren="No" />;
      } else if (inputType === 'number') {
        inputNode = <Input type="number" min="0" style={{ minWidth: 60 }} />;
      } else if (dataIndex === 'type') {
        // Gestione campo Type con select
        inputNode = (
          <Select
            style={{ minWidth: 90 }}
            placeholder="Seleziona tipo"
            allowClear
            options={[
              { label: 'INT', value: 'INT' },
              { label: 'EST', value: 'EST' },
              { label: 'C/LAV', value: 'C/LAV' },
              { label: 'CLM', value: 'CLM' }
            ]}
          />
        );
      } else if (dataIndex === 'trattamenti') {
        // Gestione speciale per i trattamenti con tag e suggerimenti
        inputNode = (
          <Select
            mode="tags"
            style={{ minWidth: 200 }}
            placeholder="Seleziona o inserisci trattamenti"
            tokenSeparators={[',', '+', ';']}
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={treatments.map(t => ({
              label: t.name,
              value: t.name
            }))}
          />
        );
      } else {
        inputNode = <Input style={{ minWidth: 50 }}/>;
      }
    }

    return (
      <td {...restProps}>
        {editing ? (
          <Form.Item
            name={dataIndex}
            style={{ margin: 0 }}
            rules={[{ required: required, message: `${title} è obbligatorio` }]}
            valuePropName={inputType === 'boolean' ? 'checked' : 'value'}
          >
            {inputNode}
          </Form.Item>
        ) : children}
      </td>
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <Button
        icon={<ArrowLeftOutlined />}
        style={{ marginBottom: 16 }}
        onClick={() => navigate(-1)}
      >
        Indietro
      </Button>
      
      <Title level={2}>Dettaglio Commessa</Title>
      
      <Spin spinning={loading}>
        {commessa && (
          <Card style={{ marginBottom: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div>
                <Text strong>Codice:</Text>
                <div>{commessa.code}</div>
              </div>
              <div>
                <Text strong>Cliente:</Text>
                <div>{commessa.name}</div>
              </div>
              <div>
                <Text strong>Note:</Text>
                <div>{commessa.notes || '-'}</div>
              </div>
              <div>
                <Text strong>Data di consegna:</Text>
                <div>{commessa.deliveryDate ? dayjs(commessa.deliveryDate).format('DD/MM/YYYY') : '-'}</div>
              </div>
              <div>
                <Text strong>Data creazione:</Text>
                <div>{commessa.createdAt ? new Date(commessa.createdAt).toLocaleString() : '-'}</div>
              </div>
            </div>
          </Card>
        )}

        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={3}>Componenti ({components.length})</Title>
          <Space>
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'bom_text',
                    label: (
                      <Checkbox
                        checked={!hiddenColumns.includes('bom_text')}
                        onChange={() => toggleColumnVisibility('bom_text')}
                      >
                        BOM
                      </Checkbox>
                    )
                  },
                  {
                    key: 'qty_u',
                    label: (
                      <Checkbox
                        checked={!hiddenColumns.includes('qty_u')}
                        onChange={() => toggleColumnVisibility('qty_u')}
                      >
                        Qty U
                      </Checkbox>
                    )
                  },
                  {
                    key: 'uta_u',
                    label: (
                      <Checkbox
                        checked={!hiddenColumns.includes('uta_u')}
                        onChange={() => toggleColumnVisibility('uta_u')}
                      >
                        UtA U
                      </Checkbox>
                    )
                  },
                  {
                    key: 'qty_t',
                    label: (
                      <Checkbox
                        checked={!hiddenColumns.includes('qty_t')}
                        onChange={() => toggleColumnVisibility('qty_t')}
                      >
                        Qty T
                      </Checkbox>
                    )
                  },
                  {
                    key: 'uta_t',
                    label: (
                      <Checkbox
                        checked={!hiddenColumns.includes('uta_t')}
                        onChange={() => toggleColumnVisibility('uta_t')}
                      >
                        UtA T
                      </Checkbox>
                    )
                  },
                  {
                    key: 'barcode',
                    label: (
                      <Checkbox
                        checked={!hiddenColumns.includes('barcode')}
                        onChange={() => toggleColumnVisibility('barcode')}
                      >
                        Barcode
                      </Checkbox>
                    )
                  }
                ]
              }}
              trigger={['click']}
            >
              <Button icon={<SettingOutlined />}>
                Colonne
              </Button>
            </Dropdown>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={addNewComponent}
              disabled={adding}
            >
              Nuovo Componente
            </Button>
          </Space>
        </div>

        <Form form={form} component={false}>
          <Table
            components={{ 
              body: { cell: EditableCell },
              header: { cell: ResizableTitle }
            }}
            bordered
            dataSource={components}
            columns={columns}
            rowKey={record => record._id || record.key}
            pagination={{ pageSize: 20, showSizeChanger: true, showQuickJumper: true }}
            size="small"
            expandable={{
              expandedRowRender,
              expandedRowKeys,
              onExpandedRowsChange: setExpandedRowKeys,
              rowExpandable: record => record.history && record.history.length > 0,
              expandIcon: () => null,
            }}
            scroll={{ x: 1200 }}
          />
        </Form>
      </Spin>

      {/* Modal Barcode */}
      
      {/* Modale cambio stato */}
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
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <BarcodeWithText 
            value={barcodeModal.value} 
            width={3} 
            height={80} 
            fontSize={16} 
          />
        </div>
      </Modal>

      {/* Modal Storico Stati */}
      <Modal
        title="Storico Cambi Stato"
        open={historyModal.open}
        onCancel={() => setHistoryModal({ open: false, component: null })}
        footer={[
          <Button key="close" onClick={() => setHistoryModal({ open: false, component: null })}>
            Chiudi
          </Button>
        ]}
        width={800}
      >
        {historyModal.component && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Text strong>Componente: </Text>
              <Text>{historyModal.component.descrizioneComponente}</Text>
            </div>
            
            {historyModal.component.history && historyModal.component.history.length > 0 ? (
              <Timeline
                items={historyModal.component.history.map((change, index) => ({
                  color: getStatusColor(change.to),
                  children: (
                    <div key={index}>
                      <div style={{ marginBottom: 8 }}>
                        <Tag color={getStatusColor(change.from)}>{getStatusLabel(change.from)}</Tag>
                        <span> → </span>
                        <Tag color={getStatusColor(change.to)}>{getStatusLabel(change.to)}</Tag>
                      </div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: 4 }}>
                        {new Date(change.date).toLocaleString('it-IT')}
                        {change.user && ` • ${change.user}`}
                      </div>
                      {change.note && (
                        <div style={{ fontSize: '12px', fontStyle: 'italic', marginBottom: 4 }}>
                          "{change.note}"
                        </div>
                      )}
                      {(change.ddt_number || change.ddt_date) && (
                        <div style={{ fontSize: '12px', color: '#1890ff' }}>
                          DDT: {change.ddt_number} {change.ddt_date && `(${new Date(change.ddt_date).toLocaleDateString('it-IT')})`}
                        </div>
                      )}
                    </div>
                  )
                }))}
              />
            ) : (
              <div style={{ textAlign: 'center', color: '#999', padding: '20px 0' }}>
                Nessun cambio di stato registrato
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DettaglioCommessa;
