import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Tabs, Table, Button, Modal, Form, Input, Upload, message, Timeline } from 'antd';
import { UploadOutlined, HistoryOutlined, PlusOutlined } from '@ant-design/icons';
import api from '../api';

const { TabPane } = Tabs;

export default function DettaglioCommesse() {
  const { id } = useParams();
  const [commessa, setCommessa] = useState(null);
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalNewVisible, setModalNewVisible] = useState(false);

  useEffect(() => { fetchData(); }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cRes, compRes] = await Promise.all([
        api.get(`/commesse/${id}`),
        api.get('/components', { params: { commessaId: id, pageSize: 50 } })
      ]);
      setCommessa(cRes.data);
      setComponents(compRes.data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const columns = [
    { title: 'Nome', dataIndex: 'name', key: 'name' },
    { title: 'Barcode', dataIndex: 'barcode', key: 'barcode' },
    { title: 'Status', dataIndex: 'status', key: 'status' },
    { title: 'Trattamenti', dataIndex: 'trattamenti', key: 'trattamenti', render: t => (t || []).join(', ') },
    { title: 'Azioni', key: 'actions', render: (_, r) => <Button size="small">Cambia stato</Button> }
  ];

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2>{commessa?.name || 'Dettaglio Commessa'}</h2>
        <div>
          <Button icon={<PlusOutlined />} onClick={() => setModalNewVisible(true)}>Nuovo componente</Button>
        </div>
      </div>

      <Tabs defaultActiveKey="1">
        <TabPane tab={<span><HistoryOutlined />Componenti</span>} key="1">
          <Table dataSource={components} columns={columns} rowKey={r => r._id} loading={loading} />
        </TabPane>
        <TabPane tab={<span><HistoryOutlined />Cronologia</span>} key="2">
          <Timeline>
            <Timeline.Item>Placeholder eventi</Timeline.Item>
          </Timeline>
        </TabPane>
        <TabPane tab="Files / DDT" key="3">
          <Upload beforeUpload={() => false} onChange={(info) => console.log(info)}>
            <Button icon={<UploadOutlined />}>Upload DDT</Button>
          </Upload>
        </TabPane>
        <TabPane tab="Note" key="4">
          <Form>
            <Form.Item name="notes">
              <Input.TextArea defaultValue={commessa?.notes} rows={6} />
            </Form.Item>
            <Form.Item><Button type="primary">Salva note</Button></Form.Item>
          </Form>
        </TabPane>
      </Tabs>

      <Modal visible={modalNewVisible} title="Nuovo componente" onCancel={() => setModalNewVisible(false)} footer={null}>
        <Form onFinish={async (vals) => { try { await api.post('/components', { ...vals, commessaId: id }); message.success('Creato'); setModalNewVisible(false); fetchData(); } catch (e) { message.error('Errore'); } }}>
          <Form.Item name="name" rules={[{ required: true }]}><Input placeholder="Nome componente"/></Form.Item>
          <Form.Item name="barcode"><Input placeholder="Barcode"/></Form.Item>
          <Form.Item><Button htmlType="submit" type="primary">Crea</Button></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
