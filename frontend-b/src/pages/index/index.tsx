import { useState, useEffect } from 'react'
import { View, Text, Image, Navigator, PullDownRefresh } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { api, Leader, Activity, StatsOverview } from '../../api/client'
import './index.css'

const STATUS_LABEL: Record<number, string> = { 0: '待开始', 1: '进行中', 2: '已结束' }
const STATUS_COLOR: Record<number, string> = { 0: '#999', 1: '#1890ff', 2: '#52c41a' }

export default function LeaderDashboard() {
  const [leader, setLeader] = useState<Leader | null>(null)
  const [stats, setStats] = useState<StatsOverview | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const [profile, overview, actsData] = await Promise.all([
        api.getLeaderProfile().catch(() => null),
        api.getStatsOverview().catch(() => null),
        api.getActivities({ status: '1', page: 1, page_size: 5 }).catch(() => ({ items: [] as Activity[] })),
      ])
      setLeader(profile)
      setStats(overview)
      setActivities(actsData.items || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const onPullDownRefresh = async () => {
    await loadData()
    Taro.stopPullDownRefresh()
  }

  return (
    <View className='dashboard'>
      <PullDownRefresh onRefresh={onPullDownRefresh} />

      {/* Header */}
      <View className='header'>
        <View className='header-bg' />
        <View className='header-content'>
          <Image
            src={leader?.nickname ? `https://api.dicebear.com/7.x/initials/svg?seed=${leader.nickname}` : 'https://picsum.photos/80/80'}
            className='avatar'
          />
          <View className='header-info'>
            <Text className='nickname'>{leader?.nickname || '团长'}</Text>
            {leader?.province && (
              <Text className='location'>{leader.province} {leader.city}</Text>
            )}
          </View>
          <Navigator url='/pages/settings/settings' className='edit-btn'>
            <Text>编辑</Text>
          </Navigator>
        </View>
      </View>

      {/* Stats Cards */}
      <View className='stats-grid'>
        <Navigator url='/pages/finance/finance' className='stat-card blue'>
          <Text className='stat-value'>¥{stats?.today_sales || '0.00'}</Text>
          <Text className='stat-label'>今日销售额</Text>
        </Navigator>
        <Navigator url='/pages/order/list' className='stat-card orange'>
          <Text className='stat-value'>{stats?.today_orders || 0}</Text>
          <Text className='stat-label'>今日订单</Text>
        </Navigator>
        <Navigator url='/pages/order/list?tab=1' className='stat-card green'>
          <Text className='stat-value'>{stats?.pending_orders || 0}</Text>
          <Text className='stat-label'>待发货</Text>
        </Navigator>
        <Navigator url='/pages/order/list?tab=2' className='stat-card red'>
          <Text className='stat-value'>{stats?.pending_refunds || 0}</Text>
          <Text className='stat-label'>退款申请</Text>
        </Navigator>
      </View>

      {/* Balance */}
      <View className='balance-card'>
        <View className='balance-info'>
          <Text className='balance-label'>可提现余额</Text>
          <Text className='balance-value'>¥{stats?.balance || '0.00'}</Text>
        </View>
        <Navigator url='/pages/finance/withdraw' className='withdraw-btn'>
          <Text>提现</Text>
        </Navigator>
      </View>

      {/* Quick Actions */}
      <View className='quick-actions'>
        <Navigator url='/pages/activity/create' className='action-btn primary'>
          <Text>+ 创建活动</Text>
        </Navigator>
        <Navigator url='/pages/activity/list' className='action-btn'>
          <Text>活动管理</Text>
        </Navigator>
        <Navigator url='/pages/data/data' className='action-btn'>
          <Text>数据统计</Text>
        </Navigator>
      </View>

      {/* Recent Activities */}
      <View className='section'>
        <View className='section-header'>
          <Text className='section-title'>进行中的活动</Text>
          <Navigator url='/pages/activity/list' className='more'>
            <Text>查看全部 ›</Text>
          </Navigator>
        </View>
        {activities.length === 0 ? (
          <View className='empty'>
            <Text>暂无进行中的活动</Text>
            <Navigator url='/pages/activity/create' className='create-link'>
              <Text>立即创建 ›</Text>
            </Navigator>
          </View>
        ) : (
          <View className='activity-list'>
            {activities.map((act) => (
              <Navigator key={act.id} url={`/pages/activity/list?id=${act.id}`} className='activity-item'>
                <View className='act-left'>
                  <Text className='act-name'>{act.activity_name}</Text>
                  <Text className='act-price'>¥{act.group_price}</Text>
                </View>
                <View className='act-right'>
                  <Text className='act-people'>{act.current_people}/{act.min_people}人</Text>
                  <Text className='act-status' style={{ color: STATUS_COLOR[act.status] || '#1890ff' }}>
                    {STATUS_LABEL[act.status] || '进行中'}
                  </Text>
                </View>
              </Navigator>
            ))}
          </View>
        )}
      </View>

      {loading && <View className='loading'><Text>加载中...</Text></View>}
    </View>
  )
}