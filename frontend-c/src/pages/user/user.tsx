import { Component, reactive, onMounted } from 'react'
import { View, Text, Image, Navigator } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { api, User } from '../../api/client'
import './index.css'

const MENU_GROUPS = [
  [
    { id: 'orders', label: '我的订单', icon: '📋', url: '/pages/order/order' },
    { id: 'favorites', label: '我的收藏', icon: '❤️', url: '/pages/favorites/favorites' },
    { id: 'coupons', label: '优惠券', icon: '🎫', url: '/pages/coupons/coupons' },
    { id: 'points', label: '我的积分', icon: '⭐', url: '/pages/points/points' },
  ],
  [
    { id: 'addresses', label: '收货地址', icon: '📍', url: '/pages/address/address' },
    { id: 'invoices', label: '发票管理', icon: '🧾', url: '/pages/invoices/invoices' },
    { id: 'help', label: '帮助中心', icon: '❓', url: '/pages/help/help' },
    { id: 'settings', label: '设置', icon: '⚙️', url: '/pages/settings/settings' },
  ],
]

export default function UserProfile() {
  const state = reactive({
    user: null as User | null,
    stats: {
      pendingPay: 0,
      pendingShip: 0,
      pendingReceive: 0,
      completed: 0,
    },
    loading: false,
  })

  const loadProfile = async () => {
    try {
      state.loading = true
      const [user, orders] = await Promise.all([
        api.getProfile(),
        api.getOrders({ page: 1, page_size: 100 }),
      ])
      state.user = user
      state.stats.pendingPay = orders.list.filter((o) => o.status === 0).length
      state.stats.pendingShip = orders.list.filter((o) => o.status === 1).length
      state.stats.pendingReceive = orders.list.filter((o) => o.status === 2).length
      state.stats.completed = orders.list.filter((o) => o.status === 4).length
    } catch (e) {
      console.error(e)
      // Not logged in - show login prompt
    } finally {
      state.loading = false
    }
  }

  onMounted(() => {
    loadProfile()
  })

  const handleLogin = async () => {
    try {
      const loginRes = await Taro.login()
      if (loginRes.code) {
        const result = await api.login(loginRes.code)
        api.setToken(result.token)
        Taro.setStorageSync('refresh_token', result.refresh_token)
        loadProfile()
        Taro.showToast({ title: '登录成功', icon: 'success' })
      }
    } catch (e) {
      Taro.showToast({ title: '登录失败', icon: 'none' })
    }
  }

  return (
    <View className='user-page'>
      {/* Profile Header */}
      <View className='profile-header'>
        <View className='profile-bg' />
        {state.user ? (
          <View className='profile-content'>
            <Image
              src={state.user.avatar || 'https://picsum.photos/120/120?random=avatar'}
              className='avatar'
            />
            <View className='profile-info'>
              <Text className='nickname'>{state.user.nickname || '用户' + state.user.id}</Text>
              <View className='level-tag'>
                <Text>V{state.user.level}</Text>
              </View>
            </View>
          </View>
        ) : (
          <View className='profile-content login-prompt' onClick={handleLogin}>
            <Image src='https://picsum.photos/120/120?random=default' className='avatar' />
            <Text className='login-text'>点击登录</Text>
          </View>
        )}
      </View>

      {/* Stats */}
      {state.user && (
        <View className='stats-section'>
          <Navigator url='/pages/order/order' className='stat-item'>
            <Text className='stat-num'>{state.stats.pendingPay}</Text>
            <Text className='stat-label'>待支付</Text>
          </Navigator>
          <Navigator url='/pages/order/order' className='stat-item'>
            <Text className='stat-num'>{state.stats.pendingShip}</Text>
            <Text className='stat-label'>待发货</Text>
          </Navigator>
          <Navigator url='/pages/order/order' className='stat-item'>
            <Text className='stat-num'>{state.stats.pendingReceive}</Text>
            <Text className='stat-label'>待收货</Text>
          </Navigator>
          <Navigator url='/pages/order/order' className='stat-item'>
            <Text className='stat-num'>{state.stats.completed}</Text>
            <Text className='stat-label'>已完成</Text>
          </Navigator>
        </View>
      )}

      {/* Member Card */}
      {state.user && (
        <View className='member-card'>
          <View className='member-left'>
            <Text className='member-title'>会员积分</Text>
            <Text className='member-points'>{state.user.available_points} 积分</Text>
          </View>
          <View className='member-right'>
            <Text className='growth-label'>成长值</Text>
            <View className='growth-bar'>
              <View className='growth-fill' style={{ width: `${(state.user.growth_value % 1000) / 10}%` }} />
            </View>
            <Text className='growth-value'>{state.user.growth_value}</Text>
          </View>
        </View>
      )}

      {/* Menu Groups */}
      <View className='menu-section'>
        {MENU_GROUPS.map((group, gi) => (
          <View key={gi} className='menu-group'>
            {group.map((item) => (
              <Navigator key={item.id} url={item.url} className='menu-item'>
                <Text className='menu-icon'>{item.icon}</Text>
                <Text className='menu-label'>{item.label}</Text>
                <Text className='menu-arrow'>›</Text>
              </Navigator>
            ))}
          </View>
        ))}
      </View>

      {/* Customer Service */}
      <View className='service-section'>
        <Button className='service-btn' open-type='contact'>
          <Text>在线客服</Text>
        </Button>
        <Button className='service-btn' open-type='feedback'>
          <Text>意见反馈</Text>
        </Button>
      </View>
    </View>
  )
}
