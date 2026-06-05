import { useState, useEffect, useCallback } from 'react'
import { View, Text, Navigator, ScrollView, PullDownRefresh } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { api, Activity } from '../../../api/client'
import './index.css'

const STATUS_LABEL: Record<number, string> = { 0: '待开始', 1: '进行中', 2: '已结束' }
const STATUS_TAG_COLOR: Record<number, string> = { 0: '#999', 1: '#1890ff', 2: '#52c41a' }
const STATUS_TAG_BG: Record<number, string> = { 0: '#f5f5f5', 1: '#e6f4ff', 2: '#f6ffed' }

export default function ActivityList() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [currentTab, setCurrentTab] = useState(0)

  const statusOptions = [
    { label: '全部', value: undefined },
    { label: '进行中', value: '1' },
    { label: '待开始', value: '0' },
    { label: '已结束', value: '2' },
  ]

  const fetchActivities = useCallback(async (pageNum: number, reset = false) => {
    const status = statusOptions[currentTab].value
    setLoading(true)
    try {
      const res = await api.getActivities({ status, page: pageNum, page_size: 10 })
      const items = res.items || []
      if (reset || pageNum === 1) {
        setActivities(items)
      } else {
        setActivities(prev => [...prev, ...items])
      }
      setHasMore(items.length === 10)
      setPage(pageNum)
    } catch (e: any) {
      Taro.showToast({ title: e.message, icon: 'none' })
    } finally {
      setLoading(false)
    }
  }, [currentTab])

  useEffect(() => {
    setPage(1)
    setHasMore(true)
    fetchActivities(1, true)
  }, [currentTab])

  const onReachBottom = () => {
    if (!loading && hasMore) fetchActivities(page + 1)
  }

  const onPullDownRefresh = async () => {
    await fetchActivities(1, true)
    Taro.stopPullDownRefresh()
  }

  return (
    <View className='activity-list-page'>
      {/* Tabs */}
      <View className='status-tabs'>
        {statusOptions.map((opt, i) => (
          <View
            key={i}
            className={`status-tab ${currentTab === i ? 'active' : ''}`}
            onClick={() => setCurrentTab(i)}
          >
            <Text>{opt.label}</Text>
          </View>
        ))}
      </View>

      <ScrollView
        scrollY
        className='list-content'
        onScrollToLower={onReachBottom}
        lowerThreshold={80}
      >
        <Navigator url='/pages/activity/create' className='create-banner'>
          <Text className='create-icon'>+</Text>
          <Text className='create-text'>创建新活动</Text>
        </Navigator>

        {activities.length === 0 && !loading && (
          <View className='empty'>
            <Text>暂无活动</Text>
            <Navigator url='/pages/activity/create' className='create-link'>
              <Text>去创建 ›</Text>
            </Navigator>
          </View>
        )}

        {activities.map((act) => (
          <View key={act.id} className='activity-card'>
            <View className='act-cover'>
              <Text className='cover-placeholder'>
                {act.cover_image ? '🖼' : '🎯'}
              </Text>
            </View>
            <View className='act-body'>
              <View className='act-name-row'>
                <Text className='act-name'>{act.activity_name}</Text>
                <View
                  className='status-tag'
                  style={{
                    color: STATUS_TAG_COLOR[act.status],
                    background: STATUS_TAG_BG[act.status],
                  }}
                >
                  <Text>{STATUS_LABEL[act.status] || '未知'}</Text>
                </View>
              </View>
              <View className='act-prices'>
                <Text className='group-price'>¥{act.group_price}</Text>
                <Text className='original-price'>¥{act.original_price}</Text>
              </View>
              <View className='act-meta'>
                <Text className='act-time'>
                  {new Date(act.start_time).toLocaleDateString('zh-CN')} ~ {new Date(act.end_time).toLocaleDateString('zh-CN')}
                </Text>
              </View>
              <View className='act-progress'>
                <View className='progress-bar'>
                  <View
                    className='progress-fill'
                    style={{ width: `${Math.min(100, (act.current_people / act.min_people) * 100)}%` }}
                  />
                </View>
                <Text className='progress-text'>
                  {act.current_people}/{act.min_people}人 (最低)
                </Text>
              </View>
            </View>
          </View>
        ))}

        {loading && <View className='loading-text'><Text>加载中...</Text></View>}
        {!hasMore && activities.length > 0 && (
          <View className='no-more'><Text>— 没有更多了 —</Text></View>
        )}
      </ScrollView>
    </View>
  )
}