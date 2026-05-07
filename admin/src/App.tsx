import React, { useState, useEffect } from 'react'
import { Layout, Menu, Breadcrumb, Card, Row, Col, Statistic, Table, Tag, Button, Space, Typography, message } from 'antd'
import {
  DashboardOutlined, ShoppingOutlined, TeamOutlined, GiftOutlined,
  ShoppingCartOutlined, DollarOutlined, SettingOutlined, LogoutOutlined,
  AppstoreOutlined, FileTextOutlined, AlertOutlined
} from '@ant-design/icons'
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom'
import './App.css'

const { Header, Sider, Content, Footer } = Layout
const { Title, Text } = Typography

// API
const API_BASE = 'http://localhost:8080/api/v1/admin'

const adminApi = {
  async getDashboard() {
    const res = await fetch(`${API_BASE}/dashboard`)
    return res.json()
  },
  async getUsers(params: any) {
    const res = await fetch(`${API_BASE}/users`)
    return res.json()
  },
  async getLeaders(params: any) {
    const res = await fetch(`${API_BASE}/leaders`)
    return res.json()
  },
  async auditProduct(id: number, approved: boolean, remark: string) {
    const res = await fetch(`${API_BASE}/products/${id}/audit`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved, remark }),
    })
    return res.json()
  },
  async auditActivity(id: number, approved: boolean, remark: string) {
    const res = await fetch(`${API_BASE}/activities/${id}/audit`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved, remark }),
    })
    return res.json()
  },
  async updateLeaderStatus(id: number, status: number) {
    const res = await fetch(`${API_BASE}/leaders/${id}/status`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    return res.json()
  },
}

// Dashboard Component
function Dashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0, totalLeaders: 0, todayOrders: 0, todaySales: 0,
    pendingProducts: 0, pendingActivities: 0, pendingLeaders: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      const data = await adminApi.getDashboard()
      setStats(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Title level={3}>运营看板</Title>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic title="总用户数" value={stats.totalUsers} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic title="团长数量" value={stats.totalLeaders} prefix={<GiftOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic title="今日订单" value={stats.todayOrders} prefix={<ShoppingCartOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic title="今日销售额" value={stats.todaySales} prefix={<DollarOutlined />} precision={2} prefix="¥" />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Card title="待审核商品" extra={<Link to="/products">查看全部</Link>} loading={loading}>
            <Statistic value={stats.pendingProducts} suffix="件" />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="待审核活动" extra={<Link to="/activities">查看全部</Link>} loading={loading}>
            <Statistic value={stats.pendingActivities} suffix="个" />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="待审核团长" extra={<Link to="/leaders">查看全部</Link>} loading={loading}>
            <Statistic value={stats.pendingLeaders} suffix="人" />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

// Product Audit Component
function ProductAudit() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const loadProducts = async () => {
    try {
      setLoading(true)
      const data = await adminApi.getUsers({})
      setProducts(data.list || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadProducts() }, [])

  const handleAudit = async (id: number, approved: boolean) => {
    try {
      await adminApi.auditProduct(id, approved, '')
      message.success(approved ? '已通过' : '已拒绝')
      loadProducts()
    } catch (e: any) { message.error(e.message) }
  }

  return (
    <div>
      <Title level={3}>商品审核</Title>
      <Table
        dataSource={products}
        rowKey="id"
        loading={loading}
        columns={[
          { title: '商品名称', dataIndex: 'name', key: 'name' },
          { title: '分类', dataIndex: 'category', key: 'category' },
          { title: '团长', dataIndex: 'leader', key: 'leader' },
          { title: '价格', dataIndex: 'price', key: 'price', render: (v) => `¥${v}` },
          {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            render: (v) => v === 0 ? <Tag color="orange">待审核</Tag> : v === 1 ? <Tag color="green">已通过</Tag> : <Tag color="red">已拒绝</Tag>
          },
          {
            title: '操作',
            key: 'action',
            render: (_, r) => r.status === 0 && (
              <Space>
                <Button size="small" type="primary" onClick={() => handleAudit(r.id, true)}>通过</Button>
                <Button size="small" danger onClick={() => handleAudit(r.id, false)}>拒绝</Button>
              </Space>
            )
          },
        ]}
      />
    </div>
  )
}

// Leader Management Component
function LeaderManagement() {
  const [leaders, setLeaders] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const loadLeaders = async () => {
    try {
      setLoading(true)
      const data = await adminApi.getLeaders({})
      setLeaders(data.list || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadLeaders() }, [])

  const handleStatus = async (id: number, status: number) => {
    try {
      await adminApi.updateLeaderStatus(id, status)
      message.success('操作成功')
      loadLeaders()
    } catch (e: any) { message.error(e.message) }
  }

  const statusText: Record<number, string> = { 1: '待审核', 2: '已通过', 3: '已拒绝', 4: '已禁用' }
  const statusColor: Record<number, string> = { 1: 'orange', 2: 'green', 3: 'red', 4: 'default' }

  return (
    <div>
      <Title level={3}>团长管理</Title>
      <Table
        dataSource={leaders}
        rowKey="id"
        loading={loading}
        columns={[
          { title: '团长ID', dataIndex: 'id', key: 'id', width: 80 },
          { title: '昵称', dataIndex: 'nickname', key: 'nickname' },
          { title: '真实姓名', dataIndex: 'real_name', key: 'real_name' },
          { title: '手机号', dataIndex: 'phone', key: 'phone' },
          { title: '地区', dataIndex: 'area', key: 'area', render: (_, r) => `${r.province} ${r.city}` },
          {
            title: '等级',
            dataIndex: 'level',
            key: 'level',
            render: (v) => ['实习', '正式', '金牌', '钻石'][v - 1] || '实习'
          },
          { title: '累计销售额', dataIndex: 'total_sales', key: 'total_sales', render: (v) => `¥${v}` },
          {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            render: (v) => <Tag color={statusColor[v]}>{statusText[v]}</Tag>
          },
          {
            title: '操作',
            key: 'action',
            render: (_, r) => (
              <Space>
                {r.status === 1 && (
                  <>
                    <Button size="small" type="primary" onClick={() => handleStatus(r.id, 2)}>通过</Button>
                    <Button size="small" danger onClick={() => handleStatus(r.id, 3)}>拒绝</Button>
                  </>
                )}
                {r.status === 2 && <Button size="small" danger onClick={() => handleStatus(r.id, 4)}>禁用</Button>}
                {r.status === 4 && <Button size="small" onClick={() => handleStatus(r.id, 2)}>启用</Button>}
              </Space>
            )
          },
        ]}
      />
    </div>
  )
}

// Main Layout
function MainLayout() {
  const location = useLocation()
  const navigate = useNavigate()

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: '运营看板' },
    { key: '/users', icon: <TeamOutlined />, label: '用户管理' },
    { key: '/leaders', icon: <GiftOutlined />, label: '团长管理' },
    { key: '/products', icon: <ShoppingOutlined />, label: '商品审核' },
    { key: '/activities', icon: <AppstoreOutlined />, label: '活动审核' },
    { key: '/orders', icon: <ShoppingCartOutlined />, label: '订单管理' },
    { key: '/settlements', icon: <DollarOutlined />, label: '结算管理' },
    { key: '/marketing', icon: <GiftOutlined />, label: '营销管理' },
    { key: '/risk', icon: <AlertOutlined />, label: '风控中心' },
    { key: '/reports', icon: <FileTextOutlined />, label: '数据报表' },
    { key: '/settings', icon: <SettingOutlined />, label: '系统设置' },
  ]

  const breadcrumbNameMap: Record<string, string> = {
    '/': '运营看板', '/users': '用户管理', '/leaders': '团长管理',
    '/products': '商品审核', '/activities': '活动审核', '/orders': '订单管理',
    '/settlements': '结算管理', '/marketing': '营销管理', '/risk': '风控中心',
    '/reports': '数据报表', '/settings': '系统设置',
  }

  const pathSnippets = location.pathname.split('/').filter(i => i)
  const extraBreadcrumbItems = pathSnippets.map((_, index) => {
    const url = `/${pathSnippets.slice(0, index + 1).join('/')}`
    return { key: url, title: breadcrumbNameMap[url] || url }
  })

  const breadcrumbItems = [
    { key: '/', title: <Link to="/">首页</Link> },
    ...extraBreadcrumbItems,
  ]

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
            <Text>管理员</Text>
            <Button icon={<LogoutOutlined />}>退出</Button>
          </Space>
        </Header>
        <Content style={{ padding: 24, overflow: 'auto' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/users" element={<div><Title level={3}>用户管理</Title><Text>用户列表、行为分析、拉黑管理</Text></div>} />
            <Route path="/leaders" element={<LeaderManagement />} />
            <Route path="/products" element={<ProductAudit />} />
            <Route path="/activities" element={<div><Title level={3}>活动审核</Title></div>} />
            <Route path="/orders" element={<div><Title level={3}>订单管理</Title></div>} />
            <Route path="/settlements" element={<div><Title level={3}>结算管理</Title></div>} />
            <Route path="/marketing" element={<div><Title level={3}>营销管理</Title></div>} />
            <Route path="/risk" element={<div><Title level={3}>风控中心</Title></div>} />
            <Route path="/reports" element={<div><Title level={3}>数据报表</Title></div>} />
            <Route path="/settings" element={<div><Title level={3}>系统设置</Title></div>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Content>
        <Footer style={{ textAlign: 'center', borderTop: '1px solid #f0f0f0' }}>
          社区团购管理系统 ©2026
        </Footer>
      </Content>
    </Layout>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <MainLayout />
    </BrowserRouter>
  )
}
