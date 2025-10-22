import React, { useEffect, useState, useRef } from 'react';
import { Table, Button, Input, Form, Popconfirm, message, Space, Tooltip, Modal, Upload, Progress, Typography, Card, DatePicker } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SaveOutlined, CloseOutlined, UploadOutlined, InfoCircleOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons';
import { api } from '../api';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

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

const columnsDef = [
  { title: 'Codice', dataIndex: 'code', key: 'code', width: 120, editable: true, sorter: (a, b) => a.code.localeCompare(b.code), sortDirections: ['ascend', 'descend'], filtered: true, filterSearch: true },
  { title: 'Cliente', dataIndex: 'name', key: 'name', width: 180, editable: true, sorter: (a, b) => a.name.localeCompare(b.name), sortDirections: ['ascend', 'descend'], filtered: true, filterSearch: true },
  { title: 'Note', dataIndex: 'notes', key: 'notes', width: 200, editable: true, sorter: (a, b) => (a.notes || '').localeCompare(b.notes || ''), sortDirections: ['ascend', 'descend'], filtered: true, filterSearch: true },
  { title: 'Data di consegna', dataIndex: 'deliveryDate', key: 'deliveryDate', width: 160, 
    render: t => t ? dayjs(t).format('DD/MM/YYYY') : '-', 
    editable: true, editType: 'date',
    sorter: (a, b) => {
      const dateA = a.deliveryDate ? new Date(a.deliveryDate) : new Date(0);
      const dateB = b.deliveryDate ? new Date(b.deliveryDate) : new Date(0);
      return dateA - dateB;
    }, 
    sortDirections: ['ascend', 'descend'] 
  },
  { title: 'Data creazione', dataIndex: 'createdAt', key: 'createdAt', width: 160, render: t => t ? new Date(t).toLocaleString() : '-', editable: false, sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt), sortDirections: ['ascend', 'descend'] },
];

export default function Commesse() {
  const [commesse, setCommesse] = useState([]);
  const [editingKey, setEditingKey] = useState('');
  const [form] = Form.useForm();
  const [adding, setAdding] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formUpload] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Stato per gestire le larghezze delle colonne
  const [columnWidths, setColumnWidths] = useState(() => {
    const saved = localStorage.getItem('commesse_column_widths');
    return saved ? JSON.parse(saved) : {};
  });

  // Funzione per gestire il ridimensionamento delle colonne
  const handleResize = (dataIndex) => (e, { size }) => {
    const widths = { ...columnWidths };
    widths[dataIndex] = size.width;
    setColumnWidths(widths);
    localStorage.setItem('commesse_column_widths', JSON.stringify(widths));
  };

  const navigate = useNavigate();

  useEffect(() => {
    fetchCommesse();
  }, []);

  const fetchCommesse = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/commesse');
      setCommesse(res.data);
    } catch (err) {
      setCommesse([]);
      message.error(err.userMessage || 'Errore nel caricamento delle commesse');
    } finally {
      setLoading(false);
    }
  };

  const isEditing = (record) => record._id === editingKey || (adding && record._id === undefined);

  const edit = (record) => {
    const formValues = { ...record };
    // Convert deliveryDate to dayjs for the form
    if (formValues.deliveryDate) {
      formValues.deliveryDate = dayjs(formValues.deliveryDate);
    }
    form.setFieldsValue(formValues);
    setEditingKey(record._id);
  };

  const cancel = () => {
    setEditingKey('');
    setAdding(false);
    fetchCommesse();
  };

  const save = async (key) => {
    try {
      const row = await form.validateFields();
      // Remove fields not accepted by backend
      const { createdAt, updatedAt, _id, notes, deliveryDate, ...payload } = row;
      
      // Map notes field to note for backend
      if (notes !== undefined) payload.note = notes;
      
      // Handle deliveryDate conversion
      if (deliveryDate) {
        payload.deliveryDate = dayjs(deliveryDate).toISOString();
      } else if (deliveryDate === null) {
        payload.deliveryDate = null;
      }
      
      // Find original record to get code and name if missing
      const currentCommesse = Array.isArray(commesse) ? commesse : [];
      const original = currentCommesse.find(c => c._id === key);
      if (!payload.code && original) payload.code = original.code;
      if (!payload.name && original) payload.name = original.name;
      
      if (adding) {
        await api.post('/api/commesse', payload);
        message.success('Commessa creata');
        setAdding(false);
        setEditingKey('');
        fetchCommesse();
      } else {
        await api.put(`/api/commesse/${key}`, payload);
        message.success('Commessa aggiornata');
        setEditingKey('');
        fetchCommesse();
      }
    } catch (err) {
      if (err && err.userMessage) {
        message.error(err.userMessage);
      }
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/commesse/${id}`);
      message.success('Commessa eliminata');
      fetchCommesse();
    } catch (err) {
      message.error(err.userMessage || 'Errore eliminazione');
    }
  };

  const handleUpload = async (values) => {
    if (!fileList.length) {
      message.error('Carica un file Excel');
      return;
    }
    
    const { code, name, note, deliveryDate } = values;
    if (!code?.trim() || !name?.trim()) {
      message.error('Compila tutti i campi obbligatori');
      return;
    }
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('code', code.trim());
      formData.append('name', name.trim());
      if (note) formData.append('note', note.trim());
      if (deliveryDate) formData.append('deliveryDate', dayjs(deliveryDate).toISOString());
      formData.append('excel', fileList[0].originFileObj);
      
      await api.post('/api/commesse/import-excel', formData, { 
        headers: { 'Content-Type': 'multipart/form-data' } 
      });
      
      message.success('Upload completato');
      setUploadModalOpen(false);
      setFileList([]);
      formUpload.resetFields();
      fetchCommesse();
    } catch (err) {
      const backendMsg = err?.response?.data?.error;
      const details = err?.response?.data?.details;
      if (backendMsg) {
        let msg = backendMsg;
        if (details && Array.isArray(details)) {
          msg += details.map(e => `\nRiga ${e.row}: ${e.missing.join(', ')}`).join('');
        }
        message.error(msg);
      } else {
        message.error('Errore upload: ' + (err?.message || ''));
      }
    }
    setUploading(false);
  };

  const columns = [
    // Colonna dettaglio all'inizio
    {
      title: '',
      key: 'detail',
      width: columnWidths['detail'] || 60,
      onHeaderCell: () => ({
        width: columnWidths['detail'] || 60,
        onResize: handleResize('detail'),
      }),
      render: (_, record) => {
        if (isEditing(record)) return null;
        return (
          <Tooltip title="Dettaglio commessa">
            <Button
              icon={<EyeOutlined />}
              shape="circle"
              size="small"
              type="text"
              onClick={e => {
                e.stopPropagation();
                if (record._id) navigate(`/commesse/${record._id}`);
              }}
            />
          </Tooltip>
        );
      }
    },
    ...columnsDef.map(col => ({
      ...col,
      width: columnWidths[col.dataIndex] || col.width,
      onHeaderCell: () => ({
        width: columnWidths[col.dataIndex] || col.width,
        onResize: handleResize(col.dataIndex),
      }),
      sorter: col.sorter,
      sortDirections: col.sortDirections,
      ...(col.filtered ? {
        filterSearch: true,
        filterIcon: filtered => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
        onFilter: (value, record) => (record[col.dataIndex] || '').toLowerCase().includes(value.toLowerCase()),
        filters: Array.isArray(commesse) ? Array.from(new Set(commesse.map(c => c[col.dataIndex]).filter(Boolean))).map(val => ({ text: val, value: val })) : [],
      } : {})
    })),
    {
      title: 'Azioni',
      key: 'actions',
      width: columnWidths['actions'] || 120,
      onHeaderCell: () => ({
        width: columnWidths['actions'] || 120,
        onResize: handleResize('actions'),
      }),
      render: (_, record) => {
        const editable = isEditing(record);
        return (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minWidth: 90 }}>
            {editable ? (
              <Space>
            <Tooltip title="Salva">
              <Button icon={<SaveOutlined />} type="primary" shape="circle" size="small" onClick={() => save(record._id)} />
            </Tooltip>
            <Tooltip title="Annulla">
              <Button icon={<CloseOutlined />} shape="circle" size="small" onClick={cancel} />
            </Tooltip>
              </Space>
            ) : (
            <Space>
              <>
                <Tooltip title="Modifica">
                  <Button icon={<EditOutlined />} shape="circle" size="small" onClick={e => { e.stopPropagation(); edit(record); }} />
                </Tooltip>
                <Popconfirm 
                  title="Eliminare la commessa?" 
                  onConfirm={e => { e?.stopPropagation(); handleDelete(record._id); }} 
                  onCancel={e => { e?.stopPropagation(); }}
                  okText="Sì" cancelText="No"
                >
                  <Tooltip title="Elimina">
                    <Button icon={<DeleteOutlined />} danger shape="circle" size="small" onClick={e => e.stopPropagation()} />
                  </Tooltip>
                </Popconfirm>
              </>
            </Space>
            )}
          </div>
        );
      }
    }
  ];

  const mergedColumns = columns.map(col => {
    if (!col.editable || col.key === 'detail' || col.key === 'actions') return col;
    return {
      ...col,
      onCell: (record) => ({
        record,
        inputType: col.editType === 'date' ? 'date' : 'text',
        dataIndex: col.dataIndex,
        title: col.title,
        editing: isEditing(record),
      })
    };
  });

  const EditableCell = ({ editing, dataIndex, title, inputType, record, children, ...restProps }) => {
    let rules = [];
    if (editing && (dataIndex === 'code' || dataIndex === 'name')) {
      rules = [{ required: true, message: 'Campo obbligatorio' }];
    }
    
    const inputNode = inputType === 'date' ? (
      <DatePicker 
        format="DD/MM/YYYY"
        placeholder="Seleziona data"
        style={{ width: '100%' }}
      />
    ) : (
      <Input type={inputType} />
    );
    
    return (
      <td {...restProps}>
        {editing ? (
          <Form.Item
            name={dataIndex}
            style={{ margin: 0 }}
            rules={rules}
            getValueProps={(value) => {
              if (inputType === 'date' && value) {
                return { value: dayjs(value) };
              }
              return { value };
            }}
            normalize={(value) => {
              if (inputType === 'date' && value) {
                return value.toISOString();
              }
              return value;
            }}
          >
            {inputNode}
          </Form.Item>
        ) : children}
      </td>
    );
  };

  const dataSourceForTable = Array.isArray(commesse) ? commesse : [];

  return (
    <div>
      {/* Header Card */}
      <Card style={{ marginBottom: 24, borderRadius: 10 }}>
        <Title level={2} style={{ margin: 0, marginBottom: 8 }}>Gestione commesse</Title>
        <Text type="secondary">Crea, modifica e gestisci le commesse del sistema. Doppio click su una riga per modificarla.</Text>
      </Card>

      {/* Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => {
            setAdding(true);
            setEditingKey('new');
            form.resetFields();
            const currentCommesse = Array.isArray(commesse) ? commesse : [];
            setCommesse([{ key: 'new', ...columnsDef.reduce((acc, c) => ({ ...acc, [c.dataIndex]: '' }), {}) }, ...currentCommesse]);
          }}
        >
          Crea commessa
        </Button>
        <Button icon={<UploadOutlined />} onClick={() => setUploadModalOpen(true)}>
          Upload nuova commessa
        </Button>
        <Tooltip
          title={<div style={{ maxWidth: 320 }}>
            <b>Template Excel richiesto:</b><br />
            Il file deve rispettare <b>esattamente</b> la struttura del template fornito.<br />
            <a href="/assets/Base_Omega-Template.xlsx" download style={{ color: '#1677ff' }}>Scarica esempio</a>
            <div style={{ fontSize: 12, color: '#b00', marginTop: 6 }}>
              NB: L'header e l'ordine delle colonne devono essere identici al file di esempio.<br />
              Il campo Barcode è opzionale e, se presente, deve essere l'ultima colonna.
            </div>
          </div>}
        >
          <InfoCircleOutlined style={{ fontSize: 20, color: '#1677ff', verticalAlign: 'middle' }} />
        </Tooltip>
      </div>
      <Modal
        open={uploadModalOpen}
        title="Upload nuova commessa"
        onCancel={() => { 
          setUploadModalOpen(false); 
          setFileList([]);
          formUpload.resetFields(); 
        }}
        footer={null}
        destroyOnClose
      >
        <Form
          form={formUpload}
          layout="vertical"
          onFinish={handleUpload}
          initialValues={{
            code: '',
            name: '',
            note: ''
          }}
        >
          <Form.Item 
            label="Codice commessa" 
            name="code"
            rules={[{ required: true, message: 'Inserisci il codice commessa' }]}
          >
            <Input 
              autoComplete="off" 
              placeholder="Inserisci codice commessa"
            />
          </Form.Item>
          <Form.Item 
            label="Cliente" 
            name="name"
            rules={[{ required: true, message: 'Inserisci il nome del cliente' }]}
          >
            <Input 
              autoComplete="off" 
              placeholder="Inserisci nome cliente"
            />
          </Form.Item>
          <Form.Item label="Note" name="note">
            <Input.TextArea 
              rows={2} 
              autoComplete="off" 
              placeholder="Note opzionali"
            />
          </Form.Item>
          <Form.Item label="Data di consegna" name="deliveryDate">
            <DatePicker 
              format="DD/MM/YYYY"
              placeholder="Seleziona data di consegna"
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item label="File Excel" required>
            <Upload.Dragger
              accept=".xlsx,.xls"
              beforeUpload={() => false}
              fileList={fileList}
              onChange={info => setFileList(info.fileList.slice(-1))}
              maxCount={1}
            >
              <p className="ant-upload-drag-icon"><UploadOutlined /></p>
              <p className="ant-upload-text">Trascina o clicca per caricare il file Excel</p>
              <p className="ant-upload-hint">Supporta solo file .xlsx e .xls</p>
            </Upload.Dragger>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={uploading} block>
              Carica commessa
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Main Table */}
      <Card>
        <style>
          {`
            .commesse-table .ant-table-tbody > tr.editable-row:hover {
              background-color: #f0f7ff;
            }
            .commesse-table .ant-table-tbody > tr.editing-row {
              background-color: #f6f6f6 !important;
            }
            .commesse-table .ant-table-tbody > tr.editable-row td:not(:last-child):not(:first-child) {
              position: relative;
            }
            .commesse-table .ant-table-tbody > tr.editable-row:hover td:not(:last-child):not(:first-child)::after {
              content: '✎';
              position: absolute;
              right: 8px;
              top: 50%;
              transform: translateY(-50%);
              color: #1890ff;
              font-size: 14px;
              opacity: 0.6;
            }
          `}
        </style>
        <Form form={form} component={false}>
          <Table
            className="commesse-table"
            components={{ 
              body: { cell: EditableCell },
              header: { cell: ResizableTitle }
            }}
            bordered
            dataSource={dataSourceForTable}
            columns={mergedColumns}
            rowKey={record => record._id || record.key}
            pagination={{ 
              pageSize: 10, 
              showSizeChanger: true, 
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} di ${total} commesse`
            }}
            loading={loading}
            rowClassName={record => isEditing(record) ? 'editing-row' : 'editable-row'}
            onRow={record => ({
              onDoubleClick: (event) => {
                // Doppio click per entrare in edit mode (se non si è già in editing)
                if (isEditing(record)) return;
                
                // Non permettere doppio click su Actions column
                const target = event.target.closest('td');
                const actionCell = target?.querySelector('.ant-btn, .ant-popover');
                if (actionCell || target?.classList.contains('ant-table-cell') && target.cellIndex === columns.length - 1) {
                  return;
                }
                
                // Entra in modalità editing
                if (record._id) {
                  edit(record);
                }
              },
              style: isEditing(record) ? { cursor: 'default', background: '#f6f6f6' } : { cursor: 'default' },
            })}
            size="middle"
            scroll={{ x: 1100 }}
          />
        </Form>
      </Card>
    </div>
  );
}
