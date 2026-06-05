import { useState, useEffect } from 'react'
import { View, Text, Image, Navigator, Button } from '@tarojs/components'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import { api, User, Order } from '../../api/client'
import { useAuthStore } from '../../store/auth'
import './index.css'

const MENU_GROUP_1 = [
  { id: 'pending_payment', label: '待支付', icon: '⏰', count: 0 },
  { id: 'paid', label: '待发货', icon: '📦', count: 0 },
  { id: 'shipped', label: '待收货', icon: '🚚', count: 0 },
  { id: 'completed', label: '已完成', icon: '✅', count: 0 },
]

const MENU_GROUP_2 = [
  { id: 'addresses', label: '收货地址', icon: '📍', url: '/pages/address/address' },
  { id: 'leader', label: '申请团长', icon: '👑', url: '/pages/leader/leader' },
  { id: 'help', label: '帮助中心', icon: '❓', url: '/pages/help/help' },
  { id: 'settings', label: '设置', icon: '⚙️', url: '/pages/settings/settings' },
]

export default function UserProfile() {
  const { user, isLoggedIn, logout, checkAuth } = useAuthStore()
  const [stats, setStats] = useState({
    pending_payment: 0,
    paid: 0,
    shipped: 0,
    completed: 0,
  })
  const [loading, setLoading] = useState(false)
  const [isLeader, setIsLeader] = useState(false)

  useEffect(() => {
    if (isLoggedIn) {
      loadProfile()
    }
  }, [isLoggedIn])

  usePullDownRefresh(() => {
    if (isLoggedIn) {
      loadProfile().finally(() => Taro.stopPullDownRefresh())
    } else {
      Taro.stopPullDownRefresh()
    }
  })

  const loadProfile = async () => {
    setLoading(true)
    try {
      const [me, ordersData] = await Promise.all([
        api.getMe(),
        api.getOrders({ page: 1, page_size: 100 }).catch(() => ({ items: [] as Order[] })),
        api.getLeaderProfile().catch(() => null),
      ])

      const orders = ordersData.items || []
      setStats({
        pending_payment: orders.filter(o => o.status === 'pending_payment').length,
        paid: orders.filter(o => o.status === 'paid').length,
        shipped: orders.filter(o => o.status === 'shipped').length,
        completed: orders.filter(o => o.status === 'completed').length,
      })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    const { confirm } = await Taro.showModal({
      title: '确认退出登录?',
      content: '',
    })
    if (confirm) logout()
  }

  const menuWithStats = MENU_GROUP_1.map(item => ({
    ...item,
    count: stats[item.id as keyof typeof stats] || 0,
  }))

  return (
    <View className='user-page'>
      {/* Profile Header */}
      <View className='profile-header'>
        <View className='profile-bg' />
        {isLoggedIn && user ? (
          <View className='profile-content'>
            <Image
              src='https://picsum.photos/120/120?random=avatar'
              className='avatar'
            />
            <View className='profile-info'>
              <Text className='nickname'>{user.username || '用户' + user.id}</Text>
              <Text className='user-email'>{user.email}</Text>
            </View>
            <View className='logout-btn' onClick={handleLogout}>
              <Text>退出</Text>
            </View>
          </View>
        ) : (
          <View
            className='profile-content login-prompt'
            onClick={() => Taro.navigateTo({ url: '/pages/login/login' })}
          >
            <Image src='https://picsum.photos/120/120?random=default' className='avatar' />
            <Text className='login-text'>点击登录 / 注册</Text>
          </View>
        )}
      </View>

      {/* Order Stats */}
      {isLoggedIn && (
        <View className='stats-section'>
          {menuWithStats.map(item => (
            <Navigator
              key={item.id}
              url={`/pages/order/order?status=${item.id}`}
              className='stat-item'
            >
              <Text className='stat-num'>{item.count}</Text>
              <Text className='stat-label'>{item.label}</Text>
            </Navigator>
          ))}
        </View>
      )}

      {/* Member Banner */}
      {isLoggedIn && (
        <View className='member-banner'>
          <View className='member-left'>
            <Text className='member-title'>成为团长</Text>
            <Text className='member-subtitle'>分享赚佣金，轻松副业</Text>
          </View>
          <Navigator url='/pages/leader/leader' className='member-apply-btn'>
            <Text>立即申请</Text>
          </Navigator>
        </View>
      )}

      {/* Menu */}
      <View className='menu-section'>
        {MENU_GROUP_2.map(item => (
          <Navigator
            key={item.id}
            url={item.url}
            className='menu-item'
          >
            <Text className='menu-icon'>{item.icon}</Text>
            <Text className='menu-label'>{item.label}</Text>
            <Text className='menu-arrow'>›</Text>
          </Navigator>
        ))}
      </View>

      {/* Actions */}
      <View className='service-section'>
        <Button className='service-btn' open-type='contact'>
          <Text>在线客服</Text>
        </Button>
        <Button className='service-btn' open-type='feedback'>
          <Text>意见反馈</Text>
        </Button>
      </View>

      <View className='version-info'>
        <Text>社区团购 v1.0.0</Text>
      </View>
    </View>
  )
}