import { useState, useEffect } from 'react'
import { View, Text, ScrollView, PullDownRefresh } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { api, StatsOverview } from '../../../api/client'
import './index.css'

export default function DataPage() {
  const [stats, setStats] = useState<StatsOverview | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const data = await api.getStatsOverview()
      setStats(data)
    } catch (e: any) {
      Taro.showToast({ title: e.message, icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const onPullDownRefresh = async () => {
    await load()
    Taro.stopPullDownRefresh()
  }

  const StatCard = ({ label, value, sub, color }: {
    label: string; value: string; sub?: string; color?: string;
  }) => (
    <View className='data-card'>
      <Text className='dc-value' style={{ color: color || '#333' }}>{value}</Text>
      <Text className='dc-label'>{label}</Text>
      {sub && <Text className='dc-sub'>{sub}</Text>}
    </View>
  )

  return (
    <View className='data-page'>
      <PullDownRefresh onRefresh={onPullDownRefresh} />
      <ScrollView scrollY style={{ height: 'calc(100vh - 44px)' }}>

        {/* Summary */}
        <View className='section-title-bar'>
          <Text>数据概览</Text>
        </View>

        <View className='summary-grid'>
          <StatCard
            label='累计销售额'
            value={`¥${stats?.total_revenue || '0.00'}`}
            color='#1890ff'
            sub='总订单金额'
          />
          <StatCard
            label='可提现余额'
            value={`¥${stats?.balance || '0.00'}`}
            color='#52c41a'
            sub='可直接提现'
          />
        </View>

        <View className='summary-grid'>
          <StatCard
            label='累计订单数'
            value={`${stats?.total_orders || 0}`}
            sub='所有状态'
          />
          <StatCard
            label='冻结金额'
            value={`¥${stats?.frozen_balance || '0.00'}`}
            color='#faad14'
            sub='提现处理中'
          />
        </View>

        {/* Today */}
        <View className='section-title-bar'>
          <Text>今日数据</Text>
        </View>

        <View className='today-cards'>
          <View className='today-main'>
            <Text className='today-sales'>¥{stats?.today_sales || '0.00'}</Text>
            <Text className='today-label'>今日销售额</Text>
          </View>
          <View className='today-stats'>
            <View className='ts-item'>
              <Text className='ts-value'>{stats?.today_orders || 0}</Text>
              <Text className='ts-label'>今日订单</Text>
            </View>
            <View className='ts-div' />
            <View className='ts-item'>
              <Text className='ts-value' style={{ color: '#ff4d4f' }}>{stats?.pending_orders || 0}</Text>
              <Text className='ts-label'>待发货</Text>
            </View>
            <View className='ts-div' />
            <View className='ts-item'>
              <Text className='ts-value' style={{ color: '#faad14' }}>{stats?.pending_refunds || 0}</Text>
              <Text className='ts-label'>退款申请</Text>
            </View>
          </View>
        </View>

        {/* Pending */}
        <View className='section-title-bar'>
          <Text>待处理事项</Text>
        </View>

        <View className='pending-list'>
          <View className='pending-item'>
            <View className='pending-icon' style={{ background: '#e6f4ff' }}>
              <Text style={{ color: '#1890ff' }}>📦</Text>
            </View>
            <View className='pending-info'>
              <Text className='pending-title'>待发货订单</Text>
              <Text className='pending-desc'>请及时处理待发货的订单</Text>
            </View>
            <Text className='pending-badge'>{stats?.pending_orders || 0}</Text>
          </View>

          <View className='pending-item'>
            <View className='pending-icon' style={{ background: '#fff7e6' }}>
              <Text style={{ color: '#faad14' }}>💰</Text>
            </View>
            <View className='pending-info'>
              <Text className='pending-title'>退款申请</Text>
              <Text className='pending-desc'>查看和处理中的退款请求</Text>
            </View>
            <Text className='pending-badge warning'>{stats?.pending_refunds || 0}</Text>
          </View>
        </View>

      </ScrollView>
    </View>
  )
}