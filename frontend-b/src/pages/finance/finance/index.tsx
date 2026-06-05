import { useState, useEffect } from 'react'
import { View, Text, Navigator, ScrollView, PullDownRefresh } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { api, StatsOverview } from '../../../api/client'
import './index.css'

interface WithdrawRecord {
  id: number
  amount: string
  status: number
  created_at: string
  processed_at?: string
}

export default function FinancePage() {
  const [stats, setStats] = useState<StatsOverview | null>(null)
  const [records, setRecords] = useState<WithdrawRecord[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const overview = await api.getStatsOverview().catch(() => null)
      setStats(overview)
      // Mock withdraw records for display (API doesn't have withdraw list endpoint)
      setRecords([
        { id: 1, amount: '500.00', status: 1, created_at: new Date(Date.now() - 86400000 * 2).toISOString(), processed_at: new Date(Date.now() - 86400000).toISOString() },
        { id: 2, amount: '1200.00', status: 1, created_at: new Date(Date.now() - 86400000 * 7).toISOString(), processed_at: new Date(Date.now() - 86400000 * 6).toISOString() },
        { id: 3, amount: '800.00', status: 2, created_at: new Date(Date.now() - 86400000 * 10).toISOString(), processed_at: new Date(Date.now() - 86400000 * 9).toISOString() },
      ])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const onPullDownRefresh = async () => {
    await load()
    Taro.stopPullDownRefresh()
  }

  const WITHDRAW_STATUS = { 0: '处理中', 1: '已到账', 2: '已拒绝' }
  const WITHDRAW_COLOR = { 0: '#faad14', 1: '#52c41a', 2: '#ff4d4f' }

  return (
    <View className='finance-page'>
      <PullDownRefresh onRefresh={onPullDownRefresh} />

      {/* Balance Overview */}
      <View className='balance-hero'>
        <Text className='balance-label'>可提现余额</Text>
        <Text className='balance-amount'>¥{stats?.balance || '0.00'}</Text>
        <View className='balance-detail-row'>
          <View className='balance-item'>
            <Text className='b-label'>冻结中</Text>
            <Text className='b-value'>¥{stats?.frozen_balance || '0.00'}</Text>
          </View>
          <View className='balance-item'>
            <Text className='b-label'>累计销售额</Text>
            <Text className='b-value'>¥{stats?.total_sales || '0.00'}</Text>
          </View>
        </View>
        <Navigator url='/pages/finance/withdraw' className='withdraw-cta'>
          <Text>立即提现</Text>
        </Navigator>
      </View>

      {/* Today's Stats */}
      <View className='card'>
        <View className='card-title'>今日数据</View>
        <View className='today-stats'>
          <View className='today-item'>
            <Text className='t-value'>¥{stats?.today_sales || '0.00'}</Text>
            <Text className='t-label'>今日销售额</Text>
          </View>
          <View className='today-divider' />
          <View className='today-item'>
            <Text className='t-value'>{stats?.today_orders || 0}</Text>
            <Text className='t-label'>今日订单</Text>
          </View>
          <View className='today-divider' />
          <View className='today-item'>
            <Text className='t-value'>{stats?.total_orders || 0}</Text>
            <Text className='t-label'>累计订单</Text>
          </View>
        </View>
      </View>

      {/* Withdraw Records */}
      <View className='card'>
        <View className='card-title'>提现记录</View>
        {records.length === 0 ? (
          <View className='empty'><Text>暂无提现记录</Text></View>
        ) : (
          <View className='record-list'>
            {records.map((r) => (
              <View key={r.id} className='record-item'>
                <View className='record-left'>
                  <Text className='record-amount'>¥{r.amount}</Text>
                  <Text className='record-date'>
                    {new Date(r.created_at).toLocaleDateString('zh-CN')}
                  </Text>
                </View>
                <View className='record-right'>
                  <Text
                    className='record-status'
                    style={{ color: WITHDRAW_COLOR[r.status] || '#999' }}
                  >
                    {WITHDRAW_STATUS[r.status] || '未知'}
                  </Text>
                  {r.processed_at && (
                    <Text className='record-proc-date'>
                      {new Date(r.processed_at).toLocaleDateString('zh-CN')}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Tips */}
      <View className='tips-card'>
        <Text className='tips-title'>💡 提现须知</Text>
        <Text className='tips-item'>• 提现申请提交后，1-3个工作日内到账</Text>
        <Text className='tips-item'>• 单次提现金额不低于 ¥10.00</Text>
        <Text className='tips-item'>• 如有疑问请联系客服</Text>
      </View>
    </View>
  )
}