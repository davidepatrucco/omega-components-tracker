import React, { useState, useEffect } from 'react';
import { Table, Card, Button, message, Typography, Space, Spin } from 'antd';
import { DownloadOutlined, ReloadOutlined, FileOutlined } from '@ant-design/icons';
import api from '../api';

const { Title } = Typography;

export default function ViewFiles() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/files');
      setFiles(response.data);
    } catch (error) {
      console.error('Error fetching files:', error);
      message.error('Errore nel caricamento dei file');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleDownload = async (fileName) => {
    try {
      const response = await api.get(`/api/files/${fileName}`, {
        responseType: 'blob'
      });
      
      // Create blob URL and trigger download
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success('Download avviato');
    } catch (error) {
      console.error('Error downloading file:', error);
      message.error('Errore nel download del file');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('it-IT');
  };

  const columns = [
    {
      title: 'Nome File',
      dataIndex: 'name',
      key: 'name',
      render: (text) => (
        <Space>
          <FileOutlined />
          {text}
        </Space>
      ),
    },
    {
      title: 'Dimensione',
      dataIndex: 'size',
      key: 'size',
      render: (size) => formatFileSize(size),
      sorter: (a, b) => a.size - b.size,
    },
    {
      title: 'Ultima Modifica',
      dataIndex: 'lastModified',
      key: 'lastModified',
      render: (date) => formatDate(date),
      sorter: (a, b) => new Date(a.lastModified) - new Date(b.lastModified),
    },
    {
      title: 'Azioni',
      key: 'actions',
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<DownloadOutlined />}
          onClick={() => handleDownload(record.name)}
        >
          Scarica
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '16px' }}>
      <Card>
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={2} style={{ margin: 0 }}>
            Vedi Files
          </Title>
          <Button
            type="default"
            icon={<ReloadOutlined />}
            onClick={fetchFiles}
            loading={loading}
          >
            Aggiorna
          </Button>
        </div>
        
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={files}
            rowKey="name"
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `Totale ${total} file`,
            }}
            locale={{
              emptyText: 'Nessun file trovato'
            }}
          />
        </Spin>
      </Card>
    </div>
  );
}