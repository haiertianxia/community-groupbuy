import { Component, reactive, onMounted } from 'react'
import { View, Text, Image, ScrollView, Navigator } from '@tarojs/components'
import { api, Activity, Leader } from '../../api/client'
import './index.css'

export default function Index() {
  const state = reactive({
    activities: [] as Activity[],
    leaders: [] as Leader[],
    categories: [
      { id: 1, name: '水果', icon: '🍎' },
      { id: 2, name: '蔬菜', icon: '🥬' },
      { id: 3, name: '肉禽', icon: '🥩' },
      { id: 4, name: '海鲜', icon: '🦐' },
      { id: 5, name: '乳品', icon: '🥛' },
      { id: 6, name: '零食', icon: '🍪' },
      { id: 7, name: '粮油', icon: '🍚' },
      { id: 8, name: '家居', icon: '🏠' },
    ],
    loading: false,
    page: 1,
    hasMore: true,
  })

  const loadActivities = async () => {
    if (state.loading || !state.hasMore) return
    state.loading = true
    try {
      const res = await api.getActivities({ page: state.page, page_size: 10, status: 1 })
      if (state.page === 1) {
        state.activities = res.list
      } else {
        state.activities = [...state.activities, ...res.list]
      }
      state.hasMore = res.list.length === 10
      state.page++
    } catch (e) {
      console.error(e)
    } finally {
      state.loading = false
    }
  }

  const loadLeaders = async () => {
    try {
      const res = await api.getLeaders({ page: 1 })
      state.leaders = res.list.slice(0, 5)
    } catch (e) {
      console.error(e)
    }
  }

  onMounted(() => {
    loadActivities()
    loadLeaders()
  })

  const getStatusText = (status: number) => {
    const map: Record<number, string> = { 0: '预热中', 1: '进行中', 2: '已成团', 3: '已截团', 4: '已取消' }
    return map[status] || '未知'
  }

  const getStatusColor = (status: number) => {
    const map: Record<number, string> = { 0: '#999', 1: '#ff6b35', 2: '#52c41a', 3: '#1890ff', 4: '#999' }
    return map[status] || '#999'
  }

  return (
    <ScrollView
      className='index-page'
      scrollY
      onScrollToLower={loadActivities}
    >
      {/* Banner */}
      <View className='banner'>
        <Swiper indicatorDots autoplay interval={3000}>
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
        <ScrollView scrollX>
          {state.categories.map((cat) => (
            <Navigator key={cat.id} url={`/pages/category/category?id=${cat.id}`} className='category-item'>
              <View className='category-icon'>{cat.icon}</View>
              <Text className='category-name'>{cat.name}</Text>
            </Navigator>
          ))}
        </ScrollView>
      </View>

      {/* Nearby Leaders */}
      {state.leaders.length > 0 && (
        <View className='section'>
          <View className='section-header'>
            <Text className='section-title'>附近团长</Text>
            <Navigator url='/pages/leaders/leaders' className='section-more'>查看更多</Navigator>
          </View>
          <ScrollView scrollX>
            <View className='leaders-row'>
              {state.leaders.map((leader) => (
                <Navigator key={leader.id} url={`/pages/leader/leader?id=${leader.id}`} className='leader-card'>
                  <Image src={leader.avatar || 'https://picsum.photos/100/100?random=avatar'} className='leader-avatar' />
                  <Text className='leader-name'>{leader.nickname}</Text>
                  <Text className='leader-area'>{leader.district}</Text>
                </Navigator>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Hot Activities */}
      <View className='section'>
        <View className='section-header'>
          <Text className='section-title'>🔥 正在进行</Text>
          <Navigator url='/pages/activities/activities' className='section-more'>查看更多</Navigator>
        </View>

        {state.activities.length === 0 && !state.loading && (
          <View className='empty'>
            <Text>暂无进行中的团购活动</Text>
          </View>
        )}

        <View className='activity-list'>
          {state.activities.map((activity) => (
            <Navigator key={activity.id} url={`/pages/activity/activity?id=${activity.id}`} className='activity-card'>
              <View className='activity-cover'>
                <Image
                  src={activity.banner_images?.[0] || 'https://picsum.photos/300/300?random=' + activity.id}
                  mode='aspectFill'
                  className='cover-img'
                />
                <View className='activity-status' style={{ background: getStatusColor(activity.status) }}>
                  {getStatusText(activity.status)}
                </View>
              </View>
              <View className='activity-info'>
                <Text className='activity-name'>{activity.activity_name}</Text>
                <View className='activity-price'>
                  <Text className='group-price'>¥{activity.group_price}</Text>
                  <Text className='original-price'>¥{activity.original_price}</Text>
                </View>
                <View className='activity-progress'>
                  <View className='progress-bar'>
                    <View
                      className='progress-fill'
                      style={{ width: `${Math.min((activity.current_people / activity.min_people) * 100, 100)}%` }}
                    />
                  </View>
                  <Text className='progress-text'>
                    {activity.current_people}/{activity.min_people}人
                  </Text>
                </View>
                <Text className='activity-time'>
                  剩余 {Math.max(0, Math.ceil((new Date(activity.end_time).getTime() - Date.now()) / 86400000))} 天
                </Text>
              </View>
            </Navigator>
          ))}
        </View>

        {state.loading && (
          <View className='loading'>
            <Text>加载中...</Text>
          </View>
        )}
      </View>
    </ScrollView>
  )
}
