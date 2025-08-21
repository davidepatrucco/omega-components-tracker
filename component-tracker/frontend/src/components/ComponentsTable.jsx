import React from 'react';
import { Table, Tag, Dropdown, Menu, Button } from 'antd';
import { MoreOutlined } from '@ant-design/icons';

export default function ComponentsTable({ data = [], onRefresh }) {
  const columns = [
    { title: 'Nome', dataIndex: 'name', key: 'name' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: s => <Tag color={s === '5' ? 'green' : 'blue'}>{s}</Tag> },
    { title: 'Trattamenti', dataIndex: 'trattamenti', key: 'trattamenti', render: t => (t || []).map(x => <Tag key={x}>{x}</Tag>) },
    { title: 'Azioni', key: 'actions', render: (_, r) => (
      <Dropdown overlay={<Menu><Menu.Item>Apri</Menu.Item><Menu.Item>Change state</Menu.Item></Menu>} trigger={["click"]}>
        <Button icon={<MoreOutlined />} />
      </Dropdown>
    ) }
  ];

  return <Table dataSource={data} columns={columns} rowKey={r => r._id} />;
}
