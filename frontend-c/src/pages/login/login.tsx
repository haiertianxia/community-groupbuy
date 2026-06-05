import { useState } from 'react'
import { View, Text, Input, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { api } from '../../api/client'
import { useAuthStore } from '../../store/auth'
import './index.css'

export default function Login() {
  const [isRegister, setIsRegister] = useState(false)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const { setAuth } = useAuthStore()

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Taro.showToast({ title: '请填写完整信息', icon: 'none' })
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Taro.showToast({ title: '请输入正确的邮箱', icon: 'none' })
      return
    }
    if (password.length < 6) {
      Taro.showToast({ title: '密码至少6位', icon: 'none' })
      return
    }
    if (isRegister && !username.trim()) {
      Taro.showToast({ title: '请输入用户名', icon: 'none' })
      return
    }

    setLoading(true)
    try {
      let res
      if (isRegister) {
        res = await api.register(username.trim(), email.trim(), password)
      } else {
        res = await api.login(email.trim(), password)
      }

      const user = await api.getMe()
      setAuth(res.access_token, user)

      Taro.showToast({ title: isRegister ? '注册成功' : '登录成功', icon: 'success' })

      setTimeout(() => {
        const pages = Taro.getCurrentPages()
        if (pages.length > 1) {
          Taro.navigateBack()
        } else {
          Taro.switchTab({ url: '/pages/index/index' })
        }
      }, 1200)
    } catch (e: any) {
      Taro.showToast({ title: e.message || (isRegister ? '注册失败' : '登录失败'), icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className='login-page'>
      <View className='login-header'>
        <Text className='app-name'>社区团购</Text>
        <Text className='app-slogan'>
          {isRegister ? '创建账户，开始团购' : '欢迎回来，开启省钱之旅'}
        </Text>
      </View>

      <View className='login-form'>
        {isRegister && (
          <View className='form-group'>
            <Text className='form-label'>用户名</Text>
            <Input
              className='form-input'
              placeholder='请输入用户名'
              value={username}
              onInput={(e: any) => setUsername(e.detail.value)}
              autoFocus
            />
          </View>
        )}

        <View className='form-group'>
          <Text className='form-label'>邮箱</Text>
          <Input
            className='form-input'
            type='text'
            placeholder='请输入邮箱'
            value={email}
            onInput={(e: any) => setEmail(e.detail.value)}
            autoFocus={!isRegister}
          />
        </View>

        <View className='form-group'>
          <Text className='form-label'>密码</Text>
          <Input
            className='form-input'
            password
            placeholder='请输入密码（至少6位）'
            value={password}
            onInput={(e: any) => setPassword(e.detail.value)}
          />
        </View>

        <Button
          className='submit-btn'
          loading={loading}
          onClick={handleSubmit}
        >
          {isRegister ? '注册' : '登录'}
        </Button>

        <View className='switch-mode'>
          <Text className='switch-text'>
            {isRegister ? '已有账号?' : '没有账号?'}
          </Text>
          <View
            className='switch-btn'
            onClick={() => setIsRegister(!isRegister)}
          >
            <Text>{isRegister ? '立即登录' : '立即注册'}</Text>
          </View>
        </View>
      </View>

      {/* Demo hint */}
      <View className='demo-hint'>
        <Text className='demo-text'>
          {isRegister ? '注册即表示同意用户协议' : '演示账号: test@example.com / password123'}
        </Text>
      </View>
    </View>
  )
}