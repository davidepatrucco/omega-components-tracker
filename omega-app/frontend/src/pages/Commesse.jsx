import React, { useEffect, useState } from 'react';
import { Table, Button, Input, Form, Popconfirm, message, Space, Tooltip, Modal, Upload, Progress, Typography, Card } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SaveOutlined, CloseOutlined, UploadOutlined, InfoCircleOutlined, EyeOutlined } from '@ant-design/icons';
import { api } from '../api';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const columnsDef = [
  { title: 'Codice', dataIndex: 'code', key: 'code', width: 120, editable: true, sorter: (a, b) => a.code.localeCompare(b.code), sortDirections: ['ascend', 'descend'], filtered: true, filterSearch: true },
  { title: 'Nome', dataIndex: 'name', key: 'name', width: 180, editable: true, sorter: (a, b) => a.name.localeCompare(b.name), sortDirections: ['ascend', 'descend'], filtered: true, filterSearch: true },
  { title: 'Note', dataIndex: 'notes', key: 'notes', width: 200, editable: true, sorter: (a, b) => (a.notes || '').localeCompare(b.notes || ''), sortDirections: ['ascend', 'descend'], filtered: true, filterSearch: true },
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
    form.setFieldsValue({ ...record });
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
      const { createdAt, updatedAt, _id, notes, ...payload } = row;
      // Map notes field to note for backend
      if (notes !== undefined) payload.note = notes;
      
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
    
    const { code, name, note } = values;
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
      width: 50,
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
      sorter: col.sorter,
      sortDirections: col.sortDirections,
      ...(col.filtered ? {
        filterSearch: true,
        onFilter: (value, record) => (record[col.dataIndex] || '').toLowerCase().includes(value.toLowerCase()),
        filters: Array.isArray(commesse) ? Array.from(new Set(commesse.map(c => c[col.dataIndex]).filter(Boolean))).map(val => ({ text: val, value: val })) : [],
      } : {})
    })),
    {
      title: 'Azioni',
      key: 'actions',
      width: 120,
      render: (_, record) => {
        const editable = isEditing(record);
        return editable ? (
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
          </Space>
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
        inputType: 'text',
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
    return (
      <td {...restProps}>
        {editing ? (
          <Form.Item
            name={dataIndex}
            style={{ margin: 0 }}
            rules={rules}
          >
            <Input type={inputType} />
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
        <Text type="secondary">Crea, modifica e gestisci le commesse del sistema</Text>
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
            label="Nome commessa" 
            name="name"
            rules={[{ required: true, message: 'Inserisci il nome commessa' }]}
          >
            <Input 
              autoComplete="off" 
              placeholder="Inserisci nome commessa"
            />
          </Form.Item>
          <Form.Item label="Note" name="note">
            <Input.TextArea 
              rows={2} 
              autoComplete="off" 
              placeholder="Note opzionali"
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
            .commesse-table .ant-table-tbody > tr:not(.editing-row):hover {
              background-color: #f5f5f5;
            }
            .commesse-table .ant-table-tbody > tr:not(.editing-row) td:last-child {
              cursor: default !important;
            }
            .commesse-table .ant-table-tbody > tr:not(.editing-row) td:not(:last-child) {
              cursor: pointer;
            }
          `}
        </style>
        <Form form={form} component={false}>
          <Table
            className="commesse-table"
            components={{ body: { cell: EditableCell } }}
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
              onClick: (event) => {
                // Non navigare se si sta cliccando sulla colonna Actions o se si è in editing
                if (isEditing(record)) return;
                
                // Controlla se il click è avvenuto nella colonna Actions
                const target = event.target.closest('td');
                const actionCell = target?.querySelector('.ant-btn, .ant-popover');
                if (actionCell || target?.classList.contains('ant-table-cell') && target.cellIndex === columns.length - 1) {
                  return; // Non navigare se click su Actions
                }
                
                // Naviga al dettaglio se c'è un ID valido
                if (record._id) {
                  navigate(`/commesse/${record._id}`);
                }
              },
              style: isEditing(record) ? { cursor: 'default', background: '#f6f6f6' } : { cursor: 'pointer' },
            })}
            size="middle"
            scroll={{ x: 900 }}
          />
        </Form>
      </Card>
    </div>
  );
}
