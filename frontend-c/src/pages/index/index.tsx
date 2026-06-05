import { useState, useEffect, useCallback } from 'react'
import { View, Text, Image, ScrollView, Navigator, Swiper, SwiperItem } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { api, Activity, Leader } from '../../api/client'
import './index.css'

const CATEGORIES = [
  { id: 'fruits', name: '水果', icon: '🍎' },
  { id: 'vegetables', name: '蔬菜', icon: '🥬' },
  { id: 'meat', name: '肉禽', icon: '🥩' },
  { id: 'seafood', name: '海鲜', icon: '🦐' },
  { id: 'dairy', name: '乳品', icon: '🥛' },
  { id: 'snacks', name: '零食', icon: '🍪' },
  { id: 'grain', name: '粮油', icon: '🍚' },
  { id: 'home', name: '家居', icon: '🏠' },
]

function getStatusInfo(status: string) {
  const map: Record<string, { text: string; color: string }> = {
    pending: { text: '预热中', color: '#999' },
    active: { text: '进行中', color: '#ff6b35' },
    completed: { text: '已成团', color: '#52c41a' },
    closed: { text: '已截团', color: '#1890ff' },
  }
  return map[status] || { text: '未知', color: '#999' }
}

export default function Index() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [leaders, setLeaders] = useState<Leader[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadActivities = useCallback(async (reset = false) => {
    const currentPage = reset ? 1 : page
    const res = await api.getActivities({ page: currentPage, page_size: 10, status: 'active' })
    const items = res.items || []
    setActivities(prev => (reset ? items : [...prev, ...items]))
    setHasMore(items.length === 10)
    setPage(currentPage + 1)
  }, [page])

  const loadLeaders = useCallback(async () => {
    try {
      // leaders are embedded in activities, not a separate API
      // show demo data for the "nearby leaders" section
      setLeaders([])
    } catch (e) {
      setLeaders([])
    }
  }, [])

  useEffect(() => {
    Promise.all([
      loadActivities(true).catch(console.error),
      loadLeaders().catch(console.error),
    ]).finally(() => setLoading(false))
  }, [])

  // Pull down refresh & scroll to bottom handled via ScrollView props

  const handleRefresh = async () => {
    setRefreshing(true)
    setPage(1)
    setHasMore(true)
    await Promise.all([
      loadActivities(true).catch(console.error),
      loadLeaders().catch(console.error),
    ])
    setRefreshing(false)
    Taro.stopPullDownRefresh()
  }

  const handleLoadMore = async () => {
    if (loading || !hasMore) return
    setLoading(true)
    await loadActivities(false)
    setLoading(false)
  }

  return (
    <ScrollView
      className='index-page'
      scrollY
      onScrollToLower={handleLoadMore}
      refresherEnabled
      onRefresherRefresh={handleRefresh}
      refresherTriggered={refreshing}
    >
      {/* Banner */}
      <View className='banner'>
        <Swiper indicatorDots autoplay interval={3000} circular className='banner-swiper'>
          <SwiperItem>
            <Image src='https://picsum.photos/750/400?random=1' mode='widthFix' className='banner-img' />
          </SwiperItem>
          <SwiperItem>
            <Image src='https://picsum.photos/750/400?random=2' mode='widthFix' className='banner-img' />
          </SwiperItem>
          <SwiperItem>
            <Image src='https://picsum.photos/750/400?random=3' mode='widthFix' className='banner-img' />
          </SwiperItem>
        </Swiper>
      </View>

      {/* Categories */}
      <View className='categories'>
        <ScrollView scrollX className='categories-scroll'>
          {CATEGORIES.map((cat) => (
            <Navigator
              key={cat.id}
              url={`/pages/category/category?name=${cat.name}`}
              className='category-item'
            >
              <View className='category-icon'>{cat.icon}</View>
              <Text className='category-name'>{cat.name}</Text>
            </Navigator>
          ))}
        </ScrollView>
      </View>

      {/* Activities */}
      <View className='section'>
        <View className='section-header'>
          <Text className='section-title'>🔥 正在进行</Text>
          <Navigator url='/pages/activity/activity' className='section-more'>查看更多 ›</Navigator>
        </View>

        {activities.length === 0 && !loading && (
          <View className='empty-state'>
            <Text className='empty-text'>暂无进行中的团购活动</Text>
          </View>
        )}

        <View className='activity-list'>
          {activities.map((activity) => {
            const { text: statusText, color: statusColor } = getStatusInfo(activity.status)
            const progress = activity.min_participants > 0
              ? Math.min((activity.current_participants / activity.min_participants) * 100, 100)
              : 0
            const remainTime = getRemainTime(activity.end_time)
            const coverImage = activity.product?.images?.[0] || activity.image || `https://picsum.photos/300/300?random=${activity.id}`

            return (
              <Navigator
                key={activity.id}
                url={`/pages/activity/activity?id=${activity.id}`}
                className='activity-card'
              >
                <View className='activity-cover'>
                  <Image src={coverImage} mode='aspectFill' className='cover-img' />
                  <View className='activity-status' style={{ background: statusColor }}>
                    {statusText}
                  </View>
                </View>
                <View className='activity-info'>
                  <Text className='activity-name' numberOfLines={2}>{activity.product?.name || '团购商品'}</Text>
                  <View className='activity-price'>
                    <Text className='group-price'>¥{activity.group_price}</Text>
                    <Text className='original-price'>¥{activity.product?.original_price || activity.group_price}</Text>
                  </View>
                  <View className='activity-progress'>
                    <View className='progress-bar'>
                      <View className='progress-fill' style={{ width: `${progress}%` }} />
                    </View>
                    <Text className='progress-text'>
                      {activity.current_participants}/{activity.min_participants}人
                    </Text>
                  </View>
                  <Text className='activity-time'>{remainTime}</Text>
                </View>
              </Navigator>
            )
          })}
        </View>

        {loading && (
          <View className='loading-tip'><Text>加载中...</Text></View>
        )}
        {!hasMore && activities.length > 0 && (
          <View className='loading-tip'><Text>— 没有更多了 —</Text></View>
        )}
      </View>
    </ScrollView>
  )
}

function getRemainTime(endTime: string): string {
  if (!endTime) return ''
  const diff = new Date(endTime).getTime() - Date.now()
  if (diff <= 0) return '已结束'
  const days = Math.floor(diff / 86400000)
  if (days > 0) return `剩余 ${days} 天`
  const hours = Math.floor(diff / 3600000)
  return `剩余 ${hours} 小时`
}