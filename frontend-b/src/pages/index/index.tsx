import { Component, reactive, onMounted } from 'react'
import { View, Text, Image, Navigator } from '@tarojs/components'
import { api, Leader, Activity } from '../../api/client'
import './index.css'

export default function LeaderDashboard() {
  const state = reactive({
    leader: null as Leader | null,
    todayOrders: 0,
    todaySales: 0,
    pendingOrders: 0,
    pendingRefunds: 0,
    recentActivities: [] as Activity[],
    loading: false,
  })

  const loadDashboard = async () => {
    try {
      state.loading = true
      const [dashboard, activities] = await Promise.all([
        api.getLeaderDashboard(),
        api.getActivities({ page: 1, page_size: 5 }),
      ])
      state.leader = dashboard.leader
      state.todayOrders = dashboard.todayOrders
      state.todaySales = dashboard.todaySales
      state.pendingOrders = dashboard.pendingOrders
      state.pendingRefunds = dashboard.pendingRefunds
      state.recentActivities = activities.list
    } catch (e) {
      console.error(e)
    } finally {
      state.loading = false
    }
  }

  onMounted(() => {
    loadDashboard()
  })

  return (
    <View className='dashboard'>
      {/* Header */}
      <View className='header'>
        <View className='header-bg' />
        <View className='header-content'>
          <Image src={state.leader?.avatar || ''} className='avatar' />
          <View className='header-info'>
            <Text className='nickname'>{state.leader?.nickname || '团长'}</Text>
            <View className='level-badge'>
              <Text>Lv.{state.leader?.level || 1}</Text>
            </View>
          </View>
          <Navigator url='/pages/settings/profile' className='edit-btn'>编辑</Navigator>
        </View>
      </View>

      {/* Stats Cards */}
      <View className='stats-grid'>
        <Navigator url='/pages/finance/finance' className='stat-card blue'>
          <Text className='stat-value'>¥{state.todaySales.toFixed(2)}</Text>
          <Text className='stat-label'>今日销售额</Text>
        </Navigator>
        <Navigator url='/pages/order/list' className='stat-card orange'>
          <Text className='stat-value'>{state.todayOrders}</Text>
          <Text className='stat-label'>今日订单</Text>
        </Navigator>
        <Navigator url='/pages/order/list' className='stat-card green'>
          <Text className='stat-value'>{state.pendingOrders}</Text>
          <Text className='stat-label'>待发货</Text>
        </Navigator>
        <Navigator url='/pages/order/refund' className='stat-card red'>
          <Text className='stat-value'>{state.pendingRefunds}</Text>
          <Text className='stat-label'>退款申请</Text>
        </Navigator>
      </View>

      {/* Balance */}
      <View className='balance-card'>
        <View className='balance-info'>
          <Text className='balance-label'>可提现余额</Text>
          <Text className='balance-value'>¥{state.leader?.balance?.toFixed(2) || '0.00'}</Text>
        </View>
        <Navigator url='/pages/finance/withdraw' className='withdraw-btn'>提现</Navigator>
      </View>

      {/* Quick Actions */}
      <View className='quick-actions'>
        <Navigator url='/pages/activity/create' className='action-btn primary'>
          <Text>+ 创建活动</Text>
        </Navigator>
        <Navigator url='/pages/product/list' className='action-btn'>
          <Text>商品管理</Text>
        </Navigator>
        <Navigator url='/pages/activity/list' className='action-btn'>
          <Text>活动管理</Text>
        </Navigator>
      </View>

      {/* Recent Activities */}
      <View className='section'>
        <View className='section-header'>
          <Text className='section-title'>进行中的活动</Text>
          <Navigator url='/pages/activity/list' className='more'>查看全部 ›</Navigator>
        </View>
        {state.recentActivities.length === 0 ? (
          <View className='empty'>
            <Text>暂无进行中的活动</Text>
            <Navigator url='/pages/activity/create' className='create-link'>立即创建</Navigator>
          </View>
        ) : (
          <View className='activity-list'>
            {state.recentActivities.map((act) => (
              <Navigator key={act.id} url={`/pages/activity/detail?id=${act.id}`} className='activity-item'>
                <View className='act-left'>
                  <Text className='act-name'>{act.activity_name}</Text>
                  <Text className='act-price'>¥{act.group_price}</Text>
                </View>
                <View className='act-right'>
                  <Text className='act-people'>{act.current_people}/{act.min_people}人</Text>
                  <Text className='act-status'>进行中</Text>
                </View>
              </Navigator>
            ))}
          </View>
        )}
      </View>
    </View>
  )
}
