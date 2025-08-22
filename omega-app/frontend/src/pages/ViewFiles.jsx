import React, { useState, useEffect } from 'react';
import { Table, Card, Button, message, Typography, Space, Spin, Breadcrumb, Tag } from 'antd';
import { DownloadOutlined, ReloadOutlined, FileOutlined, FolderOutlined, FolderOpenOutlined, HomeOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { api } from '../api';

const { Title } = Typography;

export default function ViewFiles() {
  const [data, setData] = useState({ currentPath: '', items: [], breadcrumbs: [] });
  const [loading, setLoading] = useState(false);
  
  // Estrai i valori dall'oggetto data
  const { currentPath, items: files, breadcrumbs } = data;

  const fetchFiles = async (path = '') => {
    setLoading(true);
    try {
      const response = await api.get('/api/files', { params: { path } });
      setData(response.data || { currentPath: '', items: [], breadcrumbs: [] });
    } catch (error) {
      console.error('Error fetching files:', error);
      setData({ currentPath: '', items: [], breadcrumbs: [] });
      if (error.response && error.response.status === 503) {
        message.warning('Azure File Share non configurato. Contattare l\'amministratore.');
      } else {
        message.error('Errore nel caricamento dei file');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleDownload = async (fileName) => {
    try {
      const fullPath = currentPath ? `${currentPath}/${fileName}` : fileName;
      const response = await api.get(`/api/files/${encodeURIComponent(fullPath)}`, {
        responseType: 'blob'
      });
      
      // Create blob URL and trigger download
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName; // Use just the filename for download
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

  const handleDirectoryClick = (directoryName) => {
    const newPath = currentPath ? `${currentPath}/${directoryName}` : directoryName;
    fetchFiles(newPath);
  };

  const handleBreadcrumbClick = (path) => {
    fetchFiles(path);
  };

  const columns = [
    {
      title: 'Nome',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          {record.type === 'directory' ? (
            <FolderOutlined style={{ color: '#1890ff' }} />
          ) : (
            <FileOutlined style={{ color: '#8c8c8c' }} />
          )}
          {record.type === 'directory' ? (
            <Button
              type="link"
              style={{ padding: 0, height: 'auto', fontSize: '14px' }}
              onClick={() => handleDirectoryClick(record.name)}
            >
              {text}
            </Button>
          ) : (
            <span>{text}</span>
          )}
        </Space>
      ),
    },
    {
      title: 'Tipo',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag color={type === 'directory' ? 'blue' : 'default'}>
          {type === 'directory' ? 'Cartella' : 'File'}
        </Tag>
      ),
      filters: [
        { text: 'Cartelle', value: 'directory' },
        { text: 'File', value: 'file' },
      ],
      onFilter: (value, record) => record.type === value,
    },
    {
      title: 'Dimensione',
      dataIndex: 'size',
      key: 'size',
      render: (size, record) => 
        record.type === 'file' ? formatFileSize(size) : '-',
      sorter: (a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return (a.size || 0) - (b.size || 0);
      },
    },
    {
      title: 'Ultima Modifica',
      dataIndex: 'lastModified',
      key: 'lastModified',
      render: (date) => formatDate(date),
      sorter: (a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return new Date(a.lastModified || 0) - new Date(b.lastModified || 0);
      },
    },
    {
      title: 'Azioni',
      key: 'actions',
      render: (_, record) => 
        record.type === 'file' ? (
          <Button
            type="primary"
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(record.name)}
          >
            Scarica
          </Button>
        ) : null,
    },
  ];

  return (
    <div style={{ padding: '16px' }}>
      <Card>
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={2} style={{ margin: 0 }}>
            Esplora Files
          </Title>
          <Button
            type="default"
            icon={<ReloadOutlined />}
            onClick={() => fetchFiles(currentPath)}
            loading={loading}
          >
            Aggiorna
          </Button>
        </div>

        {/* Breadcrumb Navigation */}
        <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
          <Breadcrumb>
            <Breadcrumb.Item>
              <Button
                type="link"
                icon={<HomeOutlined />}
                style={{ padding: 0 }}
                onClick={() => handleBreadcrumbClick('')}
              >
                Root
              </Button>
            </Breadcrumb.Item>
            {breadcrumbs.map((crumb, index) => (
              <Breadcrumb.Item key={index}>
                {index === breadcrumbs.length - 1 ? (
                  <span style={{ fontWeight: 'bold' }}>{crumb.name}</span>
                ) : (
                  <Button
                    type="link"
                    style={{ padding: 0 }}
                    onClick={() => handleBreadcrumbClick(crumb.path)}
                  >
                    {crumb.name}
                  </Button>
                )}
              </Breadcrumb.Item>
            ))}
          </Breadcrumb>
        </div>

        {/* Back Button */}
        {currentPath && (
          <div style={{ marginBottom: '16px' }}>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => {
                const parentPath = currentPath.split('/').slice(0, -1).join('/');
                handleBreadcrumbClick(parentPath);
              }}
            >
              Torna Indietro
            </Button>
          </div>
        )}
        
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={files}
            rowKey={(record) => `${record.type}-${record.name}`}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `Totale ${total} elementi`,
            }}
            locale={{
              emptyText: currentPath ? 'Nessun file o cartella in questa directory' : 'Nessun file trovato'
            }}
            scroll={{ x: 800 }}
          />
        </Spin>
      </Card>
    </div>
  );
}