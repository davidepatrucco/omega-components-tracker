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

  const statusOptions = [
    { value: '1', label: '1 - Nuovo', color: 'blue' },
    { value: '2', label: '2 - In lavorazione', color: 'orange' },
    { value: '3', label: '3 - Controllo qualità', color: 'purple' },
    { value: '4', label: '4 - Trattamento', color: 'cyan' },
    { value: '5', label: '5 - Pronto', color: 'green' },
    { value: '6', label: '6 - Spedito', color: 'gray' }
  ];

  const columnsDef = [
    { title: 'Codice Componente', dataIndex: 'descrizioneComponente', key: 'descrizioneComponente', width: 150 },
    { title: 'Note', dataIndex: 'componentNotes', key: 'componentNotes', width: 200 },
    { title: 'Livello', dataIndex: 'level', key: 'level', width: 80 },
    { title: 'Criticità', dataIndex: 'crit', key: 'crit', width: 80 },
    { title: 'BOM', dataIndex: 'bom_text', key: 'bom_text', width: 150 },
    { title: 'Qty U', dataIndex: 'qty_u', key: 'qty_u', width: 80 },
    { title: 'UtA U', dataIndex: 'uta_u', key: 'uta_u', width: 80 },
    { title: 'Qty T', dataIndex: 'qty_t', key: 'qty_t', width: 80 },
    { title: 'UtA T', dataIndex: 'uta_t', key: 'uta_t', width: 80 },
    { title: 'Trattamenti', dataIndex: 'trattamenti', key: 'trattamenti', width: 120 },
    { title: 'Stato', dataIndex: 'status', key: 'status', width: 120 },
    { title: 'Barcode', dataIndex: 'barcode', key: 'barcode', width: 120 },
    { title: 'Azioni', dataIndex: 'actions', key: 'actions', width: 150 }
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
          trattamenti: row.trattamenti ? [row.trattamenti] : [],
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
        const updatedData = {
          ...componentToUpdate,
          ...row,
          trattamenti: row.trattamenti ? [row.trattamenti] : componentToUpdate.trattamenti
        };
        
        const response = await api.put(`/api/components/${key}`, updatedData);
        
        if (response.status === 200) {
          antdMessage.success('Componente aggiornato');
          fetchData();
        }
      }
      
      setEditingKey('');
    } catch (errInfo) {
      console.log('Validate Failed:', errInfo);
      antdMessage.error('Errore nella validazione dei dati');
    }
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
      trattamenti: '-',
      status: '1',
      barcode: ''
    };
    setComponents(prev => [emptyRow, ...prev.filter(r => r.key !== 'new')]);
    form.setFieldsValue(emptyRow);
  };

  const getStatusColor = (status) => {
    const statusOption = statusOptions.find(s => s.value === status);
    return statusOption ? statusOption.color : 'default';
  };

  const getStatusLabel = (status) => {
    const statusOption = statusOptions.find(s => s.value === status);
    return statusOption ? statusOption.label : status;
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
          if (Array.isArray(text)) {
            return text.map((t, i) => (
              <Tag key={i} color="blue">{t}</Tag>
            ));
          }
          return <Tag color="blue">{text || '-'}</Tag>;
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
          options: statusOptions
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
        inputNode = <Input type="number" min="0" />;
      } else {
        inputNode = <Input />;
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
      <Modal
        open={barcodeModal.open}
        onCancel={() => setBarcodeModal({ open: false, value: '' })}
        footer={null}
        centered
        title="Barcode"
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
