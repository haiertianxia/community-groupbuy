import React, { useState, useEffect } from 'react'
import { Layout, Menu, Breadcrumb, Card, Row, Col, Statistic, Table, Tag, Button, Space, Typography, message, Modal, Form, Input } from 'antd'
import {
  DashboardOutlined, ShoppingOutlined, TeamOutlined, GiftOutlined,
  ShoppingCartOutlined, DollarOutlined, SettingOutlined, LogoutOutlined,
  AppstoreOutlined, FileTextOutlined, AlertOutlined
} from '@ant-design/icons'
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom'
import './App.css'
import Login from './pages/Login'
import { authApi, statsApi, productsApi, activitiesApi, ordersApi, leaderApi } from './api'

const { Header, Sider, Content, Footer } = Layout
const { Title, Text } = Typography
const { confirm } = Modal

function isLoggedIn(): boolean {
  return !!localStorage.getItem('admin_token')
}

function getLoggedUser(): string {
  try {
    const u = JSON.parse(localStorage.getItem('admin_user') || '{}')
    return u.email || '管理员'
  } catch { return '管理员' }
}

function logout() {
  localStorage.removeItem('admin_token')
  localStorage.removeItem('admin_user')
  window.location.href = '/login'
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  return isLoggedIn() ? <>{children}</> : <Navigate to="/login" replace />
}

// ─── Dashboard ───────────────────────────────────────────────────────────
function Dashboard() {
  const [stats, setStats] = useState({
    total_users: 0, total_leaders: 0, total_orders: 0, total_revenue: 0,
    pending_orders: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    statsApi.overview()
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <Title level={3}>运营看板</Title>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}><Card loading={loading}><Statistic title="总用户数" value={stats.total_users} prefix={<TeamOutlined />} /></Card></Col>
        <Col span={6}><Card loading={loading}><Statistic title="团长数量" value={stats.total_leaders} prefix={<GiftOutlined />} /></Card></Col>
        <Col span={6}><Card loading={loading}><Statistic title="总订单数" value={stats.total_orders} prefix={<ShoppingCartOutlined />} /></Card></Col>
        <Col span={6}><Card loading={loading}><Statistic title="总销售额" value={stats.total_revenue} prefix={<DollarOutlined />} precision={2} /></Card></Col>
      </Row>
      <Row gutter={16}>
        <Col span={6}><Card title="待处理订单" loading={loading}><Statistic value={stats.pending_orders} suffix="单" valueStyle={{ color: '#ff6b35' }} /></Card></Col>
      </Row>
    </div>
  )
}

// ─── Product ─────────────────────────────────────────────────────────────
function ProductManagement() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  const [form] = Form.useForm()

  const load = (p = 1) => {
    setLoading(true)
    productsApi.list({ page: p, page_size: 20 })
      .then(r => { setProducts(r.data.items); setTotal(r.data.total); setPage(p) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const statusMap: Record<number, { text: string; color: string }> = {
    0: { text: '待审核', color: 'orange' }, 1: { text: '正常', color: 'green' }, 2: { text: '已拒绝', color: 'red' },
  }

  const handleCreate = async () => {
    try {
      const values = await form.validateFields()
      await productsApi.create(values)
      message.success('创建成功')
      setCreateOpen(false)
      form.resetFields()
      load()
    } catch (e: any) {
      if (e.errorFields) return // validation
      message.error(e.response?.data?.detail || '创建失败')
    }
  }

  return (
    <div>
      <Title level={3}>商品管理</Title>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" style={{ background: '#ff6b35', borderColor: '#ff6b35' }} onClick={() => setCreateOpen(true)}>创建商品</Button>
      </div>
      <Table
        dataSource={products} rowKey="id" loading={loading}
        pagination={{ current: page, total, pageSize: 20, onChange: load }}
        columns={[
          { title: '商品名称', dataIndex: 'name', key: 'name' },
          { title: '分类', dataIndex: 'category', key: 'category' },
          { title: '价格', dataIndex: 'price', key: 'price', render: (v: number) => `¥${v.toFixed(2)}` },
          { title: '库存', dataIndex: 'stock', key: 'stock' },
          { title: '销量', dataIndex: 'sales_count', key: 'sales_count' },
          { title: '状态', dataIndex: 'status', key: 'status', render: (v: number) => <Tag color={statusMap[v]?.color}>{statusMap[v]?.text}</Tag> },
        ]}
      />
      <Modal title="创建商品" open={createOpen} onOk={handleCreate} onCancel={() => setCreateOpen(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="商品名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="category" label="分类"><Input /></Form.Item>
          <Form.Item name="price" label="价格" rules={[{ required: true }]}><Input type="number" /></Form.Item>
          <Form.Item name="stock" label="库存"><Input type="number" /></Form.Item>
          <Form.Item name="description" label="描述"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

// ─── Activity ────────────────────────────────────────────────────────────
function ActivityManagement() {
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    activitiesApi.list({ page_size: 100 })
      .then(r => setActivities(r.data.items))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const statusMap: Record<string, { text: string; color: string }> = {
    pending: { text: '预热中', color: 'orange' },
    active: { text: '进行中', color: 'green' },
    completed: { text: '已成团', color: 'blue' },
    closed: { text: '已截团', color: 'default' },
  }

  return (
    <div>
      <Title level={3}>活动管理</Title>
      <Table
        dataSource={activities} rowKey="id" loading={loading}
        columns={[
          { title: '活动名称', dataIndex: 'title', key: 'title' },
          { title: '团购价', dataIndex: 'group_price', key: 'group_price', render: (v: number) => `¥${v?.toFixed(2) || '0.00'}` },
          { title: '参团人数', key: 'people', render: (_: any, r: any) => `${r.current_people || 0}/${r.min_people || 0}` },
          { title: '状态', dataIndex: 'status', key: 'status', render: (v: string) => <Tag color={statusMap[v]?.color}>{statusMap[v]?.text || v}</Tag> },
          { title: '开始时间', dataIndex: 'start_time', key: 'start_time' },
          { title: '结束时间', dataIndex: 'end_time', key: 'end_time' },
        ]}
      />
    </div>
  )
}

// ─── User Management ─────────────────────────────────────────────────────
function UserManagement() {
  return (
    <div>
      <Title level={3}>用户管理</Title>
      <Card><Text type="secondary">用户列表功能开发中...</Text></Card>
    </div>
  )
}

// ─── Leader Management ───────────────────────────────────────────────────
function LeaderManagement() {
  const [leaders, setLeaders] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    leaderApi.profile()
      .then(r => setLeaders([r.data]))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const statusMap: Record<number, { text: string; color: string }> = {
    0: { text: '待审核', color: 'orange' }, 1: { text: '已通过', color: 'green' },
    2: { text: '已拒绝', color: 'red' }, 3: { text: '已禁用', color: 'default' },
  }

  return (
    <div>
      <Title level={3}>团长管理</Title>
      <Table
        dataSource={leaders} rowKey="id" loading={loading}
        columns={[
          { title: '昵称', dataIndex: 'nickname', key: 'nickname' },
          { title: '手机', dataIndex: 'phone', key: 'phone' },
          { title: '地区', key: 'area', render: (_: any, r: any) => `${r.province || ''} ${r.city || ''}` },
          { title: '自提点', dataIndex: 'pickup_address', key: 'pickup_address' },
          { title: '状态', dataIndex: 'status', key: 'status', render: (v: number) => <Tag color={statusMap[v]?.color}>{statusMap[v]?.text}</Tag> },
        ]}
      />
    </div>
  )
}

// ─── Order Management ────────────────────────────────────────────────────
function OrderManagement() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const load = (p = 1) => {
    setLoading(true)
    ordersApi.list({ page: p, page_size: 20 })
      .then(r => { setOrders(r.data.items); setTotal(r.data.total); setPage(p) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const statusMap: Record<string, { text: string; color: string }> = {
    pending_payment: { text: '待支付', color: 'orange' },
    paid: { text: '待发货', color: 'blue' },
    shipped: { text: '已发货', color: 'cyan' },
    completed: { text: '已完成', color: 'green' },
    cancelled: { text: '已取消', color: 'default' },
  }

  return (
    <div>
      <Title level={3}>订单管理</Title>
      <Table
        dataSource={orders} rowKey="id" loading={loading}
        pagination={{ current: page, total, pageSize: 20, onChange: load }}
        columns={[
          { title: '订单号', dataIndex: 'order_no', key: 'order_no', width: 180 },
          { title: '数量', dataIndex: 'quantity', key: 'quantity' },
          { title: '金额', dataIndex: 'total_amount', key: 'total_amount', render: (v: number) => `¥${v?.toFixed(2) || '0.00'}` },
          { title: '状态', dataIndex: 'status', key: 'status', render: (v: string) => <Tag color={statusMap[v]?.color}>{statusMap[v]?.text}</Tag> },
          { title: '收货人', dataIndex: 'receiver_name', key: 'receiver_name' },
          { title: '地址', dataIndex: 'address', key: 'address', ellipsis: true },
          { title: '时间', dataIndex: 'created_at', key: 'created_at', width: 160 },
        ]}
      />
    </div>
  )
}

// ─── Placeholder Pages ───────────────────────────────────────────────────
function Placeholder({ title }: { title: string }) {
  return (
    <div>
      <Title level={3}>{title}</Title>
      <Card><Text type="secondary">功能开发中...</Text></Card>
    </div>
  )
}

// ─── Main Layout ─────────────────────────────────────────────────────────
function MainLayout() {
  const location = useLocation()
  const navigate = useNavigate()

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: '运营看板' },
    { key: '/products', icon: <ShoppingOutlined />, label: '商品管理' },
    { key: '/activities', icon: <AppstoreOutlined />, label: '活动管理' },
    { key: '/orders', icon: <ShoppingCartOutlined />, label: '订单管理' },
    { key: '/users', icon: <TeamOutlined />, label: '用户管理' },
    { key: '/leaders', icon: <GiftOutlined />, label: '团长管理' },
    { key: '/reports', icon: <FileTextOutlined />, label: '数据报表' },
    { key: '/settings', icon: <SettingOutlined />, label: '系统设置' },
  ]

  const breadcrumbNameMap: Record<string, string> = {
    '/': '运营看板', '/products': '商品管理', '/activities': '活动管理',
    '/orders': '订单管理', '/users': '用户管理', '/leaders': '团长管理',
    '/reports': '数据报表', '/settings': '系统设置',
  }

  const pathSnippets = location.pathname.split('/').filter(i => i)
  const breadcrumbItems = [
    { key: '/', title: <Link to="/">首页</Link> },
    ...pathSnippets.map((_, index) => {
      const url = '/' + pathSnippets.slice(0, index + 1).join('/')
      return { key: url, title: breadcrumbNameMap[url] || url }
    }),
  ]

  const handleLogout = () => {
    confirm({
      title: '确认退出？',
      icon: <LogoutOutlined />,
      onOk: logout,
    })
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="light" width={200} style={{ borderRight: '1px solid #f0f0f0' }}>
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #f0f0f0' }}>
          <Title level={4} style={{ margin: 0, color: '#ff6b35' }}>🏪 社区团购</Title>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ height: 'calc(100vh - 64px)', overflowY: 'auto' }}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Breadcrumb items={breadcrumbItems} />
          <Space>
            <Text>{getLoggedUser()}</Text>
            <Button icon={<LogoutOutlined />} onClick={handleLogout}>退出</Button>
          </Space>
        </Header>
        <Content style={{ padding: 24, overflow: 'auto' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<ProductManagement />} />
            <Route path="/activities" element={<ActivityManagement />} />
            <Route path="/orders" element={<OrderManagement />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/leaders" element={<LeaderManagement />} />
            <Route path="/reports" element={<Placeholder title="数据报表" />} />
            <Route path="/settings" element={<Placeholder title="系统设置" />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Content>
        <Footer style={{ textAlign: 'center', borderTop: '1px solid #f0f0f0' }}>
          社区团购管理系统 ©2026
        </Footer>
      </Layout>
    </Layout>
  )
}

// ─── App Root ────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={<PrivateRoute><MainLayout /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  )
}
