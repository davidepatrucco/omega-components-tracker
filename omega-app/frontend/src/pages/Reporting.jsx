import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Button, Space, Modal, Table, message, Popconfirm, Tag, Typography, Spin, Statistic, Descriptions } from 'antd';
import { api } from '../api';
import { FileExcelOutlined, EyeOutlined, DeleteOutlined, FilterOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { getStatusLabel } from '../utils/statusUtils';

const { Title, Text } = Typography;

const Reporting = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewing, setViewing] = useState({ open: false, report: null, components: [] });

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/reports');
      setReports(res.data || []);
    } catch (err) {
      console.error('Error loading reports', err);
      message.error('Errore nel caricamento dei report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  const viewResults = async (report) => {
    try {
      message.loading({ content: 'Caricamento risultati...', key: 'loading' });
      const res = await api.get(`/api/reports/${report._id}/results`);
      message.success({ content: `Trovati ${res.data.count} componenti`, key: 'loading', duration: 2 });
      setViewing({ open: true, report, components: res.data.components || [] });
    } catch (err) {
      console.error('Error getting report results', err);
      message.error({ content: 'Errore nel recupero dei risultati', key: 'loading' });
    }
  };

  const exportReport = async (report) => {
    try {
      message.loading({ content: 'Esportazione in corso...', key: 'export' });
      const res = await api.get(`/api/reports/${report._id}/results`);
      const components = res.data.components || [];

      if (components.length === 0) {
        message.warning({ content: 'Nessun componente da esportare', key: 'export' });
        return;
      }

      // Map to flat rows
      const rows = components.map(c => ({
        Commessa: c.commessaCode,
        'Nome Commessa': c.commessaName,
        Descrizione: c.descrizioneComponente,
        'Qty': c.qty_t || c.qty_u,
        Stato: getStatusLabel(c.status),
        Trattamenti: Array.isArray(c.trattamenti) ? c.trattamenti.join('; ') : c.trattamenti || '',
        'Fornitore Tratt.': c.fornitoreTrattamenti || '',
        'DDT Tratt.': c.ddtTrattamenti || '',
        Verificato: c.verificato ? 'Sì' : 'No',
        Barcode: c.barcode || ''
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Report');
      const fileName = `${report.name}.${new Date().toISOString().slice(0,10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      message.success({ content: `Export completato: ${fileName}`, key: 'export', duration: 3 });
    } catch (err) {
      console.error('Error exporting report', err);
      message.error({ content: 'Errore durante l\'export', key: 'export' });
    }
  };

  const deleteReport = async (report) => {
    try {
      await api.delete(`/api/reports/${report._id}`);
      message.success('Report eliminato');
      fetchReports();
    } catch (err) {
      console.error('Error deleting report', err);
      message.error('Errore durante l\'eliminazione');
    }
  };

  const renderFiltersSummary = (filters) => {
    if (!filters || Object.keys(filters).length === 0) {
      return <Text type="secondary" style={{ fontSize: 11 }}>Nessun filtro</Text>;
    }

    const parts = [];
    
    // Ant Design filters format: { columnKey: [value1, value2, ...] }
    if (filters.commessaCode && Array.isArray(filters.commessaCode) && filters.commessaCode.length > 0) {
      parts.push({ label: 'Commessa', value: filters.commessaCode[0], color: 'blue' });
    }
    if (filters.descrizioneComponente && Array.isArray(filters.descrizioneComponente) && filters.descrizioneComponente.length > 0) {
      parts.push({ label: 'Descrizione', value: filters.descrizioneComponente[0], color: 'blue' });
    }
    if (filters.status) {
      if (Array.isArray(filters.status) && filters.status.length > 0) {
        const statusLabels = filters.status.map(s => getStatusLabel(s)).join(', ');
        parts.push({ label: 'Stato', value: statusLabels, color: 'geekblue' });
      } else if (typeof filters.status === 'string' && filters.status !== 'all') {
        parts.push({ label: 'Stato', value: getStatusLabel(filters.status), color: 'geekblue' });
      }
    }
    if (filters.type && Array.isArray(filters.type) && filters.type.length > 0) {
      parts.push({ label: 'Type', value: filters.type.join(', '), color: 'purple' });
    }
    if (filters.trattamenti && Array.isArray(filters.trattamenti) && filters.trattamenti.length > 0) {
      parts.push({ label: 'Trattamenti', value: filters.trattamenti[0], color: 'cyan' });
    }
    if (filters.fornitoreTrattamenti && Array.isArray(filters.fornitoreTrattamenti) && filters.fornitoreTrattamenti.length > 0) {
      parts.push({ label: 'Fornitore', value: filters.fornitoreTrattamenti[0], color: 'magenta' });
    }
    if (filters.verificato) {
      if (Array.isArray(filters.verificato) && filters.verificato.length > 0) {
        const valore = filters.verificato.map(v => v ? 'Sì' : 'No').join(', ');
        parts.push({ label: 'Verificato', value: valore, color: 'green' });
      } else if (typeof filters.verificato === 'string' && filters.verificato !== 'all') {
        const valore = filters.verificato === 'true' ? 'Sì' : 'No';
        parts.push({ label: 'Verificato', value: valore, color: 'green' });
      } else if (typeof filters.verificato === 'boolean') {
        parts.push({ label: 'Verificato', value: filters.verificato ? 'Sì' : 'No', color: 'green' });
      }
    }
    
    // Old format support
    if (filters.search && typeof filters.search === 'string' && filters.search.trim()) {
      parts.push({ label: 'Ricerca', value: filters.search, color: 'blue' });
    }

    if (parts.length === 0) {
      return <Text type="secondary" style={{ fontSize: 11 }}>Tutti i componenti</Text>;
    }

    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {parts.map((p, i) => (
          <Tag key={i} color={p.color} style={{ fontSize: 10, margin: 0 }}>
            <strong>{p.label}:</strong> {p.value}
          </Tag>
        ))}
      </div>
    );
  };

  return (
    <div>
      {/* Header */}
      <Card style={{ marginBottom: 16, borderRadius: 10 }}>
        <Title level={3} style={{ margin: 0 }}>Report Salvati</Title>
        <Text type="secondary">
          Visualizza ed esporta i report salvati. I risultati vengono aggiornati dinamicamente.
        </Text>
      </Card>

      {/* Reports Grid */}
      <Card style={{ borderRadius: 10 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <Spin size="large" />
          </div>
        ) : reports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 0', color: '#999' }}>
            <FilterOutlined style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }} />
            <div>
              <Text type="secondary">Nessun report salvato</Text>
            </div>
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Vai su Lavorazioni e clicca "Salva Report" per creare il tuo primo report
              </Text>
            </div>
          </div>
        ) : (
          <Row gutter={[16, 16]}>
            {reports.map(r => (
              <Col key={r._id} xs={24} sm={12} md={8} lg={6}>
                <Card 
                  size="small" 
                  hoverable
                  style={{ 
                    height: '100%',
                    borderRadius: 8,
                    border: '1px solid #f0f0f0',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                  bodyStyle={{ padding: 16 }}
                >
                  <div style={{ marginBottom: 12 }}>
                    <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 8 }}>
                      {r.name}
                    </Text>
                    <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>
                      <Text style={{ fontSize: 11 }}>Creato da: {r.createdBy || '-'}</Text>
                    </div>
                    <div style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11 }}>Data: {new Date(r.createdAt).toLocaleDateString('it-IT')}</Text>
                    </div>
                  </div>

                  {/* Filters Summary */}
                  <div style={{ marginBottom: 16, minHeight: 50 }}>
                    <Text style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 6 }}>
                      Filtri:
                    </Text>
                    {renderFiltersSummary(r.filters)}
                  </div>

                  {/* Actions */}
                  <Space style={{ width: '100%', justifyContent: 'flex-start' }} size="small">
                    <Button 
                      type="primary"
                      size="small" 
                      icon={<EyeOutlined />} 
                      onClick={() => viewResults(r)}
                    >
                      Vedi
                    </Button>
                    <Button 
                      size="small" 
                      icon={<FileExcelOutlined />} 
                      onClick={() => exportReport(r)}
                    >
                      Excel
                    </Button>
                    <Popconfirm 
                      title="Eliminare il report?" 
                      onConfirm={() => deleteReport(r)} 
                      okText="Sì" 
                      cancelText="No"
                      placement="topRight"
                    >
                      <Button 
                        danger 
                        size="small"
                        icon={<DeleteOutlined />}
                      />
                    </Popconfirm>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Card>

      {/* Results Modal */}
      <Modal
        title={
          <Space direction="vertical" size={0}>
            <Text strong>{viewing.report?.name}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {viewing.components.length} componenti trovati
            </Text>
          </Space>
        }
        open={viewing.open}
        onCancel={() => setViewing({ open: false, report: null, components: [] })}
        footer={[
          <Button 
            key="export" 
            type="primary"
            icon={<FileExcelOutlined />}
            onClick={() => {
              exportReport(viewing.report);
            }}
          >
            Esporta Excel
          </Button>,
          <Button 
            key="close" 
            onClick={() => setViewing({ open: false, report: null, components: [] })}
          >
            Chiudi
          </Button>
        ]}
        width={1200}
        style={{ top: 20 }}
      >
        {viewing.report && (
          <div style={{ marginBottom: 16 }}>
            <Text strong>Filtri applicati: </Text>
            {renderFiltersSummary(viewing.report.filters)}
          </div>
        )}
        
        <Table
          dataSource={viewing.components}
          columns={[
            { 
              title: 'Commessa', 
              dataIndex: 'commessaCode', 
              key: 'commessaCode',
              width: 100,
              fixed: 'left',
              render: (text, record) => (
                <div>
                  <Text strong style={{ fontSize: 12 }}>{text}</Text>
                  <div style={{ fontSize: 10, color: '#666' }}>{record.commessaName}</div>
                </div>
              )
            },
            { 
              title: 'Descrizione', 
              dataIndex: 'descrizioneComponente', 
              key: 'descrizioneComponente',
              ellipsis: true,
              width: 180
            },
            { 
              title: 'Qty', 
              dataIndex: 'qty_t', 
              key: 'qty_t',
              width: 60,
              align: 'center',
              render: (text) => text || '-'
            },
            { 
              title: 'Stato', 
              dataIndex: 'status', 
              key: 'status',
              width: 120,
              render: (status) => (
                <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>
                  {getStatusLabel(status)}
                </Tag>
              )
            },
            { 
              title: 'Trattamenti', 
              dataIndex: 'trattamenti', 
              key: 'trattamenti',
              width: 140,
              render: t => {
                if (!t || (Array.isArray(t) && t.length === 0)) return '-';
                const trattamenti = Array.isArray(t) ? t : [t];
                return (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    {trattamenti.slice(0, 2).map((tr, i) => (
                      <Tag key={i} style={{ fontSize: 9, margin: 0 }}>{tr}</Tag>
                    ))}
                    {trattamenti.length > 2 && (
                      <Tag style={{ fontSize: 9, margin: 0 }}>+{trattamenti.length - 2}</Tag>
                    )}
                  </div>
                );
              }
            },
            { 
              title: 'Fornitore', 
              dataIndex: 'fornitoreTrattamenti', 
              key: 'fornitoreTrattamenti',
              width: 100,
              ellipsis: true,
              render: t => t || '-'
            },
            { 
              title: 'DDT Tratt.', 
              dataIndex: 'ddtTrattamenti', 
              key: 'ddtTrattamenti',
              width: 100,
              ellipsis: true,
              render: t => t || '-'
            },
            { 
              title: 'Verif.', 
              dataIndex: 'verificato', 
              key: 'verificato',
              width: 70,
              align: 'center',
              render: v => v ? (
                <Tag color="success" style={{ fontSize: 9, margin: 0 }}>Sì</Tag>
              ) : (
                <Tag color="default" style={{ fontSize: 9, margin: 0 }}>No</Tag>
              )
            }
          ]}
          rowKey={r => r._id}
          pagination={{ 
            pageSize: 20,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total) => `Totale: ${total} componenti`
          }}
          size="small"
          scroll={{ x: 900, y: 500 }}
        />
      </Modal>
    </div>
  );
};

export default Reporting;
