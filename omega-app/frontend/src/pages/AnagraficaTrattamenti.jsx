import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Space, message, Popconfirm, Typography, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { api } from '../api';
import dayjs from 'dayjs';

const { Title } = Typography;

const AnagraficaTrattamenti = () => {
  const [treatments, setTreatments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchTreatments();
  }, []);

  const fetchTreatments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/treatments');
      setTreatments(response.data);
    } catch (error) {
      console.error('Error fetching treatments:', error);
      message.error('Errore nel caricamento dei trattamenti');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingTreatment(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (treatment) => {
    setEditingTreatment(treatment);
    form.setFieldsValue({ name: treatment.name });
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/treatments/${id}`);
      message.success('Trattamento eliminato con successo');
      fetchTreatments();
    } catch (error) {
      console.error('Error deleting treatment:', error);
      message.error('Errore nell\'eliminazione del trattamento');
    }
  };

  const handleSubmit = async (values) => {
    try {
      if (editingTreatment) {
        // Modifica
        await api.put(`/api/treatments/${editingTreatment._id}`, values);
        message.success('Trattamento modificato con successo');
      } else {
        // Creazione
        await api.post('/api/treatments', values);
        message.success('Trattamento creato con successo');
      }
      setModalVisible(false);
      form.resetFields();
      fetchTreatments();
    } catch (error) {
      console.error('Error saving treatment:', error);
      const errorMessage = error.response?.data?.error || 'Errore nel salvataggio del trattamento';
      message.error(errorMessage);
    }
  };

  const columns = [
    {
      title: 'Nome Trattamento',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text) => <strong>{text}</strong>
    },
    {
      title: 'Utilizzi',
      dataIndex: 'usageCount',
      key: 'usageCount',
      sorter: (a, b) => a.usageCount - b.usageCount,
      render: (count) => <Tag color="blue">{count}</Tag>,
      width: 120,
      align: 'center'
    },
    {
      title: 'Ultimo Utilizzo',
      dataIndex: 'lastUsedAt',
      key: 'lastUsedAt',
      sorter: (a, b) => new Date(a.lastUsedAt) - new Date(b.lastUsedAt),
      render: (date) => date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '-',
      width: 180
    },
    {
      title: 'Data Creazione',
      dataIndex: 'createdAt',
      key: 'createdAt',
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm'),
      width: 180
    },
    {
      title: 'Azioni',
      key: 'actions',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
          />
          <Popconfirm
            title="Eliminare questo trattamento?"
            description="Questa azione non può essere annullata"
            onConfirm={() => handleDelete(record._id)}
            okText="Sì"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              size="small"
            />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={3} style={{ margin: 0 }}>Anagrafica Trattamenti</Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            Nuovo Trattamento
          </Button>
        </div>

        <Table
          dataSource={treatments}
          columns={columns}
          rowKey="_id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Totale: ${total} trattamenti`
          }}
          size="small"
          bordered
        />
      </Card>

      <Modal
        title={editingTreatment ? 'Modifica Trattamento' : 'Nuovo Trattamento'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            label="Nome Trattamento"
            name="name"
            rules={[
              { required: true, message: 'Il nome del trattamento è obbligatorio' },
              { min: 2, message: 'Il nome deve avere almeno 2 caratteri' }
            ]}
          >
            <Input
              placeholder="Es: Nichelatura, Zincatura, ecc."
              autoFocus
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setModalVisible(false);
                form.resetFields();
              }}>
                Annulla
              </Button>
              <Button type="primary" htmlType="submit">
                {editingTreatment ? 'Salva Modifiche' : 'Crea Trattamento'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AnagraficaTrattamenti;
