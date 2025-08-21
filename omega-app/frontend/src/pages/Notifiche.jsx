import React, { useState, useEffect } from 'react';
import { 
  Card, 
  List, 
  Badge, 
  Button, 
  Typography, 
  Space, 
  Tag, 
  Tooltip, 
  Modal, 
  Pagination,
  Empty,
  Spin,
  message,
  Popconfirm
} from 'antd';
import { 
  BellOutlined, 
  DeleteOutlined, 
  EyeOutlined, 
  CheckOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  SettingOutlined,
  LinkOutlined
} from '@ant-design/icons';
import { api } from '../api';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const Notifiche = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('all'); // 'all', 'unread'
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
  }, [pagination.page, filter]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        unreadOnly: filter === 'unread'
      };
      
      const response = await api.get('/api/notifications', { params });
      const { notifications: data, pagination: paginationData, unreadCount: count } = response.data;
      
      setNotifications(data);
      setPagination(prev => ({ ...prev, ...paginationData }));
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      message.error('Errore nel caricamento delle notifiche');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const response = await api.post(`/api/notifications/${notificationId}/read`);
      const { unreadCount: newCount } = response.data;
      
      // Aggiorna la notifica nell'elenco
      setNotifications(prev => 
        prev.map(n => 
          n._id === notificationId 
            ? { ...n, isRead: true, readAt: new Date() }
            : n
        )
      );
      
      setUnreadCount(newCount);
      
      // Aggiorna il conteggio globale nel localStorage per la navbar
      localStorage.setItem('unreadNotificationsCount', newCount.toString());
      window.dispatchEvent(new CustomEvent('unreadNotificationsChanged', { detail: newCount }));
      
    } catch (error) {
      console.error('Error marking notification as read:', error);
      message.error('Errore nell\'aggiornamento della notifica');
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/api/notifications/mark-all-read');
      
      // Aggiorna tutte le notifiche nell'elenco
      setNotifications(prev => 
        prev.map(n => ({ ...n, isRead: true, readAt: new Date() }))
      );
      
      setUnreadCount(0);
      
      // Aggiorna il conteggio globale
      localStorage.setItem('unreadNotificationsCount', '0');
      window.dispatchEvent(new CustomEvent('unreadNotificationsChanged', { detail: 0 }));
      
      message.success('Tutte le notifiche sono state marcate come lette');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      message.error('Errore nell\'aggiornamento delle notifiche');
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const response = await api.delete(`/api/notifications/${notificationId}`);
      const { unreadCount: newCount } = response.data;
      
      // Rimuovi la notifica dall'elenco
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      setUnreadCount(newCount);
      
      // Aggiorna il conteggio globale
      localStorage.setItem('unreadNotificationsCount', newCount.toString());
      window.dispatchEvent(new CustomEvent('unreadNotificationsChanged', { detail: newCount }));
      
      message.success('Notifica eliminata');
    } catch (error) {
      console.error('Error deleting notification:', error);
      message.error('Errore nell\'eliminazione della notifica');
    }
  };

  const handleNotificationClick = (notification) => {
    // Marca come letta se non è già letta
    if (!notification.isRead) {
      markAsRead(notification._id);
    }
    
    // Naviga se c'è un URL di azione
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'warning':
        return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
      case 'error':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'system':
        return <SettingOutlined style={{ color: '#722ed1' }} />;
      default:
        return <InfoCircleOutlined style={{ color: '#1890ff' }} />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'success': return '#f6ffed';
      case 'warning': return '#fffbe6';
      case 'error': return '#fff2f0';
      case 'system': return '#f9f0ff';
      default: return '#e6f7ff';
    }
  };

  const getPriorityTag = (priority) => {
    const configs = {
      urgent: { color: 'red', text: 'Urgente' },
      high: { color: 'orange', text: 'Alta' },
      medium: { color: 'blue', text: 'Media' },
      low: { color: 'default', text: 'Bassa' }
    };
    
    const config = configs[priority] || configs.medium;
    return <Tag color={config.color} size="small">{config.text}</Tag>;
  };

  const formatDate = (date) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffMs = now - notificationDate;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Ora';
    if (diffMinutes < 60) return `${diffMinutes}m fa`;
    if (diffHours < 24) return `${diffHours}h fa`;
    if (diffDays < 7) return `${diffDays}g fa`;
    return notificationDate.toLocaleDateString();
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
            <BellOutlined />
            Notifiche
            {unreadCount > 0 && (
              <Badge count={unreadCount} style={{ marginLeft: 8 }} />
            )}
          </Title>
          <Text type="secondary">
            {filter === 'all' 
              ? `${pagination.total} notifiche totali, ${unreadCount} non lette`
              : `${unreadCount} notifiche non lette`
            }
          </Text>
        </div>
        
        <Space>
          <Button 
            type={filter === 'all' ? 'primary' : 'default'}
            onClick={() => setFilter('all')}
          >
            Tutte
          </Button>
          <Button 
            type={filter === 'unread' ? 'primary' : 'default'}
            onClick={() => setFilter('unread')}
          >
            Non lette ({unreadCount})
          </Button>
          {unreadCount > 0 && (
            <Popconfirm
              title="Marcare tutte le notifiche come lette?"
              onConfirm={markAllAsRead}
              okText="Sì"
              cancelText="No"
            >
              <Button icon={<CheckOutlined />}>
                Marca tutte lette
              </Button>
            </Popconfirm>
          )}
        </Space>
      </div>

      <Card>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" />
          </div>
        ) : notifications.length === 0 ? (
          <Empty 
            description={
              filter === 'unread' 
                ? "Nessuna notifica non letta" 
                : "Nessuna notifica"
            } 
          />
        ) : (
          <>
            <List
              itemLayout="horizontal"
              dataSource={notifications}
              renderItem={(notification) => (
                <List.Item
                  key={notification._id}
                  style={{ 
                    backgroundColor: notification.isRead ? '#fff' : getNotificationColor(notification.type),
                    padding: '12px 16px',
                    marginBottom: 8,
                    borderRadius: 8,
                    border: notification.isRead ? '1px solid #f0f0f0' : '1px solid #d9d9d9',
                    cursor: notification.actionUrl ? 'pointer' : 'default'
                  }}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%' }}>
                    <div style={{ fontSize: 18, marginTop: 2 }}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                        <Title level={5} style={{ margin: 0, fontWeight: notification.isRead ? 'normal' : 'bold', lineHeight: 1.3 }}>
                          {notification.title}
                        </Title>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {getPriorityTag(notification.priority)}
                            <Text type="secondary" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                              {formatDate(notification.createdAt)}
                            </Text>
                          </div>
                          
                          <Space size="small">
                            {!notification.isRead && (
                              <Tooltip title="Marca come letta">
                                <Button 
                                  size="small" 
                                  type="text"
                                  icon={<EyeOutlined />}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(notification._id);
                                  }}
                                  style={{ padding: '2px 4px', height: 'auto' }}
                                />
                              </Tooltip>
                            )}
                            <Popconfirm
                              title="Eliminare questa notifica?"
                              onConfirm={(e) => {
                                e?.stopPropagation();
                                deleteNotification(notification._id);
                              }}
                              okText="Sì"
                              cancelText="No"
                            >
                              <Button 
                                size="small" 
                                type="text"
                                danger 
                                icon={<DeleteOutlined />}
                                onClick={(e) => e.stopPropagation()}
                                style={{ padding: '2px 4px', height: 'auto' }}
                              />
                            </Popconfirm>
                            {notification.actionUrl && (
                              <Tooltip title="Vai alla risorsa">
                                <LinkOutlined style={{ color: '#1890ff', fontSize: 12 }} />
                              </Tooltip>
                            )}
                          </Space>
                        </div>
                      </div>
                      
                      <Text style={{ 
                        color: notification.isRead ? '#999' : '#000', 
                        fontSize: 13,
                        lineHeight: 1.4,
                        display: 'block',
                        marginBottom: 4
                      }}>
                        {notification.message}
                      </Text>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          {notification.relatedEntity && (
                            <Tag color="geekblue" size="small" style={{ margin: 0 }}>
                              {notification.relatedEntity.type}: {notification.relatedEntity.name}
                            </Tag>
                          )}
                        </div>
                        
                        {notification.isRead && notification.readAt && (
                          <Text type="secondary" style={{ fontSize: 10 }}>
                            Letta il {new Date(notification.readAt).toLocaleString()}
                          </Text>
                        )}
                      </div>
                    </div>
                  </div>
                </List.Item>
              )}
            />
            
            {pagination.pages > 1 && (
              <div style={{ textAlign: 'center', marginTop: 24 }}>
                <Pagination
                  current={pagination.page}
                  total={pagination.total}
                  pageSize={pagination.limit}
                  onChange={(page) => setPagination(prev => ({ ...prev, page }))}
                  showSizeChanger={false}
                  showQuickJumper
                  showTotal={(total, range) => 
                    `${range[0]}-${range[1]} di ${total} notifiche`
                  }
                />
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
};

export default Notifiche;
