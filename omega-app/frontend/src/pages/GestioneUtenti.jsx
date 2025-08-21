import React, { useEffect, useState } from 'react';
import { Table, Button, Form, Input, Select, Popconfirm, message, Space, Tooltip } from 'antd';
import { SaveOutlined, CloseOutlined, EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { api } from '../api';

const profili = [
  { label: 'UFF', value: 'UFF' },
  { label: 'TRATT', value: 'TRATT' },
  { label: 'COLL', value: 'COLL' },
  { label: 'ADMIN', value: 'ADMIN' },
];

function GestioneUtenti() {
  const [utenti, setUtenti] = useState([]);
  const [editingKey, setEditingKey] = useState('');
  const [form] = Form.useForm();

  useEffect(() => {
    fetchUtenti();
  }, []);

  const fetchUtenti = async () => {
    try {
      const res = await api.get('/api/utenti');
      setUtenti(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setUtenti([]);
      message.error(err.userMessage || 'Errore nel caricamento degli utenti');
    }
  };

  const isEditing = (record) => {
    if (!record) return false;
    return (record._id || record.key) === editingKey;
  };

  const addUser = () => {
    form.resetFields();
    const newKey = `new_${Date.now()}`;
    setUtenti(prev => [{ key: newKey, username: '', email: '', profilo: '', password: '' }, ...prev.filter(r => r.key !== newKey)]);
    setEditingKey(newKey);
    setTimeout(() => {
      form.setFieldsValue({ username: '', email: '', profilo: '', password: '' });
    }, 0);
  };

  const edit = (record) => {
    if (!record) return;
    form.setFieldsValue({ ...record, password: '' });
    setEditingKey(record._id || record.key);
  };

  const cancel = () => {
    setEditingKey('');
    form.resetFields();
    setUtenti(prev => prev.filter(r => !r.key || !r.key.startsWith('new_')));
  };

  const save = async (key) => {
    try {
      const row = await form.validateFields();
      if (key && key !== 'new' && !key.startsWith('new_')) {
        if (row.password) {
          await api.put(`/api/utenti/${key}/reset-password`, { password: row.password });
        }
        const { password, ...toSend } = row;
        await api.put(`/api/utenti/${key}`, toSend);
        message.success('Utente aggiornato');
      } else {
        if (!row.password) return message.error('Password obbligatoria');
        await api.post('/api/utenti', row);
        message.success('Utente creato');
      }
      setEditingKey('');
      fetchUtenti();
    } catch (err) {
      message.error(err.userMessage || 'Errore salvataggio');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/utenti/${id}`);
      message.success('Utente eliminato');
      fetchUtenti();
    } catch (err) {
      message.error(err.userMessage || 'Errore eliminazione');
    }
  };

  const columns = [
    { title: 'Name', dataIndex: 'username', key: 'username', editable: true, width: 180 },
    { title: 'Email', dataIndex: 'email', key: 'email', editable: true, width: 220 },
    { title: 'Profilo', dataIndex: 'profilo', key: 'profilo', editable: true, width: 180, render: t => t },
    { title: 'Password', dataIndex: 'password', key: 'password', editable: true, width: 180, render: () => null },
    {
      title: 'Azioni',
      key: 'actions',
      width: 180,
      render: (_, record) => {
        if (!record) return null;
        const editable = isEditing(record);
        const rowKey = record._id || record.key;
        return editable ? (
          <Space>
            <Tooltip title="Salva">
              <Button 
                shape="circle" 
                icon={<SaveOutlined />} 
                onClick={() => save(rowKey)} 
                type="primary"
              />
            </Tooltip>
            <Tooltip title="Annulla">
              <Button 
                shape="circle" 
                icon={<CloseOutlined />} 
                onClick={cancel}
              />
            </Tooltip>
          </Space>
        ) : (
          <Space>
            <Tooltip title="Modifica">
              <Button 
                shape="circle" 
                icon={<EditOutlined />} 
                onClick={() => edit(record)} 
              />
            </Tooltip>
            <Popconfirm 
              title="Eliminare l'utente?" 
              onConfirm={() => handleDelete(rowKey)} 
              okText="Sì" 
              cancelText="No"
            >
              <Tooltip title="Elimina">
                <Button 
                  shape="circle" 
                  icon={<DeleteOutlined />} 
                  danger 
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      }
    }
  ];

  // Applica onCell alle colonne editabili
  const mergedColumns = columns.map(col => {
    if (!col.editable) return col;
    return {
      ...col,
      onCell: (record) => ({
        record,
        dataIndex: col.dataIndex,
        title: col.title,
        editing: isEditing(record),
      })
    };
  });

  const EditableCell = ({ editing, dataIndex, title, record, children, ...restProps }) => {
    if (!record) return <td {...restProps}>{children}</td>;
    if (editing) {
      if (dataIndex === 'profilo') {
        return (
          <td {...restProps}>
            <Form.Item 
              name="profilo" 
              style={{ margin: 0 }} 
              rules={[{ required: true, message: 'Campo obbligatorio' }]}
            > 
              <Select options={profili} />
            </Form.Item>
          </td>
        );
      }
      if (dataIndex === 'password') {
        return (
          <td {...restProps}>
            <Form.Item 
              name="password" 
              style={{ margin: 0 }} 
              rules={record._id ? [] : [{ required: true, message: 'Password obbligatoria' }]}
            > 
              <Input.Password 
                autoComplete="new-password" 
                placeholder={record._id ? "Lascia vuoto per non cambiare" : "Password"}
              />
            </Form.Item>
          </td>
        );
      }
      return (
        <td {...restProps}>
          <Form.Item 
            name={dataIndex} 
            style={{ margin: 0 }} 
            rules={[{ required: true, message: 'Campo obbligatorio' }]}
          > 
            <Input 
              type={dataIndex === 'email' ? 'email' : 'text'} 
              autoComplete="off"
            />
          </Form.Item>
        </td>
      );
    }
    return <td {...restProps}>{children}</td>;
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <h2 style={{ fontWeight: 700, fontSize: 28, marginBottom: 24 }}>Gestione Utenti</h2>
      <Button 
        type="primary" 
        icon={<PlusOutlined />} 
        style={{ marginBottom: 16 }} 
        onClick={addUser}
      >
        Nuovo utente
      </Button>
      <Form form={form} component={false}>
        <Table 
          components={{ body: { cell: EditableCell } }} 
          bordered 
          dataSource={Array.isArray(utenti) ? utenti : []} 
          columns={mergedColumns} 
          rowKey={record => record._id || record.key}
          pagination={false}
          size="small"
          style={{ background: '#fff', borderRadius: 12 }}
        />
      </Form>
    </div>
  );
}

export default GestioneUtenti;