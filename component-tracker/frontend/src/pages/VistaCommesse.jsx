import React, { useEffect, useState } from 'react';
import { Table, Button, Input, Modal, Form, Progress, Popconfirm, message } from 'antd';
import { PlusOutlined, ImportOutlined, ExportOutlined, EyeOutlined } from '@ant-design/icons';
import api from '../api';

export default function VistaCommesse() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => { fetchPage(); }, [page, pageSize]);

  const fetchPage = async () => {
    setLoading(true);
    try {
      const res = await api.get('/commesse', { params: { page, pageSize } });
      setData(res?.data || []);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  const columns = [
    { title: 'Codice', dataIndex: 'code', key: 'code', render: (v, r) => <a href={`/commesse/${r._id}`}>{v}</a> },
    { title: 'Nome', dataIndex: 'name', key: 'name' },
    { title: 'Componenti', dataIndex: 'count', key: 'count' },
    { title: 'Avanzamento', dataIndex: 'progress', key: 'progress', render: p => <Progress percent={p || 0} /> },
    { title: 'Azioni', key: 'actions', render: (_, r) => (
      <div>
        <a href={`/commesse/${r._id}`}><EyeOutlined /></a>
      </div>
    ) }
  ];

  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <Input.Search placeholder="Cerca commessa" onSearch={(v) => console.log('search', v)} style={{ width: 320 }} />
        </div>
        <div>
          <Button icon={<ImportOutlined />} style={{ marginRight: 8 }}>Importa</Button>
          <Button icon={<ExportOutlined />} style={{ marginRight: 8 }}>Esporta</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>Nuova Commessa</Button>
        </div>
      </div>

      <Table columns={columns} dataSource={data} loading={loading} rowKey={r => r._id} pagination={{ current: page, pageSize, onChange: (p, ps) => { setPage(p); setPageSize(ps); } }} />

      <Modal visible={modalVisible} title="Nuova Commessa" onCancel={() => setModalVisible(false)} footer={null}>
        <Form onFinish={async (vals) => {
          try { await api.post('/commesse', vals); message.success('Commessa creata'); setModalVisible(false); fetchPage(); } catch (e) { message.error('Errore'); }
        }}>
          <Form.Item name="code" rules={[{ required: true }]}><Input placeholder="Codice" /></Form.Item>
          <Form.Item name="name" rules={[{ required: true }]}><Input placeholder="Nome" /></Form.Item>
          <Form.Item><Button htmlType="submit" type="primary">Crea</Button></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
