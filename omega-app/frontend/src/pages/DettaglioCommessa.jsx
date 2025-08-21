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
  Divider
} from 'antd';
import { 
  ArrowLeftOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  SaveOutlined, 
  CloseOutlined, 
  HistoryOutlined, 
  PlusOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import BarcodeWithText from '../BarcodeWithText';
import { getStatusLabel, getStatusColor, formatStatusDisplay, buildAllowedStatuses } from '../utils/statusUtils';
import { api } from '../api';

const { Title, Text } = Typography;

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
  const [statusChangeModal, setStatusChangeModal] = useState({ 
    open: false, 
    componentId: null, 
    currentStatus: '', 
    newStatus: '', 
    component: null 
  });
  const [statusChangeForm] = Form.useForm();

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
    { title: 'Codice Componente', dataIndex: 'descrizioneComponente', key: 'descrizioneComponente', width: 140 },
    { title: 'Note', dataIndex: 'componentNotes', key: 'componentNotes', width: 180 },
    { title: 'Liv.', dataIndex: 'level', key: 'level', width: 70 },
    { title: 'Crit.', dataIndex: 'crit', key: 'crit', width: 70 },
    { title: 'BOM', dataIndex: 'bom_text', key: 'bom_text', width: 140 },
    { title: 'Qty U', dataIndex: 'qty_u', key: 'qty_u', width: 60 },
    { title: 'UtA U', dataIndex: 'uta_u', key: 'uta_u', width: 60 },
    { title: 'Qty T', dataIndex: 'qty_t', key: 'qty_t', width: 60 },
    { title: 'UtA T', dataIndex: 'uta_t', key: 'uta_t', width: 60 },
    { title: 'Trattamenti', dataIndex: 'trattamenti', key: 'trattamenti', width: 120 },
    { title: 'Stato', dataIndex: 'status', key: 'status', width: 110 },
    { title: 'Barcode', dataIndex: 'barcode', key: 'barcode', width: 80 },
    { title: 'Azioni', dataIndex: 'actions', key: 'actions', width: 80 }
  ];

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Recupera la commessa
      const commessaResponse = await api.get(`/api/commesse/${id}`);
      setCommessa(commessaResponse.data);
      
      // Recupera i componenti per questa commessa
      const componentsResponse = await api.get(`/api/components/commessa/${id}`);
      setComponents(componentsResponse.data || []);
      
    } catch (error) {
      console.error('Error loading data:', error);
      antdMessage.error('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const isEditing = (record) => (record._id || record.key) === editingKey;
  
  const edit = (record) => {
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
        
        const updatedData = {
          ...componentToUpdate,
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
      
      // Prepara i dati per l'aggiornamento
      const updatedData = {
        ...component,
        ...otherChanges, // Altri campi modificati nella tabella
        status: newStatus,
        statusChangeNote: values.note || '',
        ddtNumber: values.ddtNumber || '',
        ddtDate: values.ddtDate || ''
      };
      
      console.log('[Frontend] Status change - updating component:', componentId);
      console.log('[Frontend] Status change data:', updatedData);
      
      const response = await api.put(`/api/components/${componentId}`, updatedData);
      
      if (response.status === 200) {
        antdMessage.success(`Stato cambiato da "${getStatusLabel(currentStatus)}" a "${getStatusLabel(newStatus)}"`);
        fetchData();
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

  const requiresDDT = (status) => {
    return status === '6' || status.includes(':ARR');
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
      trattamenti: [],
      status: '1',
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
      '#faad14': 'gold',
      '#ff4d4f': 'red'
    };
    
    return colorMap[statusDisplay.color] || 'default';
  };

  const columns = columnsDef.map((col) => {
    if (col.dataIndex === 'descrizioneComponente') {
      return {
        ...col,
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
        ...col,
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
        ...col,
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

    if (col.dataIndex === 'barcode') {
      return {
        ...col,
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

    if (col.dataIndex === 'actions') {
      return {
        ...col,
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
                    <Tooltip title="Storico">
                      <Button 
                        icon={<HistoryOutlined />} 
                        shape="circle" 
                        size="small" 
                        type={expandedRowKeys.includes(record._id) ? "primary" : "default"}
                        onClick={() => {
                          setExpandedRowKeys(prev => 
                            prev.includes(record._id) 
                              ? prev.filter(k => k !== record._id)
                              : [...prev, record._id]
                          );
                        }}
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

    return {
      ...col,
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
      } else if (inputType === 'number') {
        inputNode = <Input type="number" min="0" style={{ minWidth: 60 }} />;
      } else if (dataIndex === 'trattamenti') {
        // Gestione speciale per i trattamenti con tag
        inputNode = (
          <Select
            mode="tags"
            style={{ minWidth: 200 }}
            placeholder="Inserisci trattamenti (es: nichelatura, marcatura)"
            tokenSeparators={[',', '+', ';']}
            open={false} // Impedisce dropdown, solo tag input
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
                <Text strong>Nome:</Text>
                <div>{commessa.name}</div>
              </div>
              <div>
                <Text strong>Note:</Text>
                <div>{commessa.notes || '-'}</div>
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
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={addNewComponent}
            disabled={adding}
          >
            Nuovo Componente
          </Button>
        </div>

        <Form form={form} component={false}>
          <Table
            components={{ body: { cell: EditableCell } }}
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
    </div>
  );
};

export default DettaglioCommessa;
