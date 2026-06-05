import React, { useState } from 'react'
import { Form, Input, Button, Card, Typography, message } from 'antd'
import { MailOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api'

const { Title, Text } = Typography

export default function Login() {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const onFinish = async (values: { email: string; password: string }) => {
    try {
      setLoading(true)
      const res = await authApi.login(values)
      const { access_token, user_id, role, ...rest } = res.data
      localStorage.setItem('admin_token', access_token)
      localStorage.setItem('admin_user', JSON.stringify({ id: user_id, role, ...rest }))
      message.success('登录成功')
      navigate('/', { replace: true })
    } catch {
      // error handled by interceptor
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #ff6b35 0%, #ff8c5a 100%)',
    }}>
      <Card
        style={{ width: 400, borderRadius: 12, boxShadow: '0 8px 32px rgba(255,107,53,0.3)' }}
        styles={{ body: { padding: '40px 32px' } }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🏪</div>
          <Title level={3} style={{ margin: 0, color: '#ff6b35' }}>社区团购管理后台</Title>
          <Text type="secondary">Community Group Buy Admin</Text>
        </div>

        <Form
          name="login"
          onFinish={onFinish}
          layout="vertical"
          requiredMark={false}
          size="large"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: '请输入管理员邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input prefix={<MailOutlined style={{ color: '#bfbfbf' }} />} placeholder="管理员邮箱" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6位' },
            ]}
          >
            <Input.Password prefix={<LockOutlined style={{ color: '#bfbfbf' }} />} placeholder="密码" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{
                background: '#ff6b35',
                borderColor: '#ff6b35',
                height: 44,
                fontSize: 16,
              }}
            >
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}