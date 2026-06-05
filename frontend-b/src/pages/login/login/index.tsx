import { useState } from 'react'
import { View, Text, Input, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { api } from '../../../api/client'
import './index.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')

  const handleLogin = async () => {
    if (!email || !password) {
      Taro.showToast({ title: '请填写邮箱和密码', icon: 'none' })
      return
    }
    setLoading(true)
    try {
      const res = await api.login(email, password)
      api.setToken(res.access_token)
      Taro.setStorageSync('user_id', String(res.user_id))
      Taro.setStorageSync('role', res.role)
      Taro.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => Taro.switchTab({ url: '/pages/index/index' }), 1200)
    } catch (e: any) {
      Taro.showToast({ title: e.message || '登录失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    if (!username || !email || !password) {
      Taro.showToast({ title: '请填写所有字段', icon: 'none' })
      return
    }
    setLoading(true)
    try {
      const res = await api.register(username, email, password)
      api.setToken(res.access_token)
      // After register, prompt to complete leader profile
      Taro.showToast({ title: '注册成功，请先完善团长信息', icon: 'none' })
      setTimeout(() => Taro.navigateTo({ url: '/pages/settings/settings' }), 1500)
    } catch (e: any) {
      Taro.showToast({ title: e.message || '注册失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className='login-page'>
      <View className='logo-area'>
        <Text className='logo-text'>🐾</Text>
        <Text className='app-name'>团长工作台</Text>
        <Text className='app-subtitle'>社区团购 B端</Text>
      </View>

      <View className='form-card'>
        <View className='mode-tabs'>
          <View
            className={`mode-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => setMode('login')}
          >
            <Text>登录</Text>
          </View>
          <View
            className={`mode-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => setMode('register')}
          >
            <Text>注册</Text>
          </View>
        </View>

        {mode === 'register' && (
          <View className='input-group'>
            <Text className='input-label'>用户名</Text>
            <Input
              className='input-field'
              placeholder='设置用户名'
              value={username}
              onInput={e => setUsername(e.detail.value)}
            />
          </View>
        )}

        <View className='input-group'>
          <Text className='input-label'>邮箱</Text>
          <Input
            className='input-field'
            type='text'
            placeholder='email@example.com'
            value={email}
            onInput={e => setEmail(e.detail.value)}
          />
        </View>

        <View className='input-group'>
          <Text className='input-label'>密码</Text>
          <Input
            className='input-field'
            password
            placeholder='请输入密码'
            value={password}
            onInput={e => setPassword(e.detail.value)}
          />
        </View>

        <Button
          className='submit-btn'
          loading={loading}
          onClick={mode === 'login' ? handleLogin : handleRegister}
        >
          {loading ? '处理中...' : mode === 'login' ? '登录' : '注册'}
        </Button>
      </View>
    </View>
  )
}