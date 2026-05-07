import { Component, reactive, onLoad } from 'react'
import { View, Text, Image, Button, ScrollView } from '@tarojs/components'
import { useDidShow } from '@tarojs/taro'
import { api, Activity, Address, WechatPayParams } from '../../api/client'
import './index.css'

export default function ActivityDetail() {
  const state = reactive({
    activity: null as Activity | null,
    addresses: [] as Address[],
    selectedAddress: null as Address | null,
    payParams: null as WechatPayParams | null,
    orderId: 0,
    loading: false,
    joining: false,
    showPayModal: false,
  })

  let activityId = 0

  const loadData = async () => {
    try {
      state.loading = true
      const [activity, addresses] = await Promise.all([
        api.getActivity(activityId),
        api.getAddresses(),
      ])
      state.activity = activity
      state.addresses = addresses
      state.selectedAddress = addresses.find((a) => a.is_default) || addresses[0] || null
    } catch (e) {
      console.error(e)
    } finally {
      state.loading = false
    }
  }

  useDidShow(() => {
    const app = getApp<any>()
    activityId = app.$router?.params?.id || 0
    if (activityId) loadData()
  })

  const handleJoin = async () => {
    if (!state.selectedAddress) {
      wx.showToast({ title: '请选择收货地址', icon: 'none' })
      return
    }

    try {
      state.joining = true
      const result = await api.joinActivity(activityId, state.selectedAddress.id)
      state.orderId = result.order_id
      state.payParams = result.payment_params

      if (result.payment_params) {
        // Call WeChat Pay
        wx.requestPayment({
          ...result.payment_params,
          success: async () => {
            wx.showToast({ title: '支付成功', icon: 'success' })
            wx.navigateTo({ url: `/pages/order/order` })
          },
          fail: (err) => {
            wx.showToast({ title: '支付取消', icon: 'none' })
            // Cancel the order
            api.cancelOrder(result.order_id)
          },
        })
      } else {
        // Demo mode - no payment integration
        await api.payOrder(result.order_id, 'DEMO_' + Date.now())
        wx.showToast({ title: '下单成功', icon: 'success' })
        wx.navigateTo({ url: `/pages/order/order` })
      }
    } catch (e: any) {
      wx.showToast({ title: e.message || '参团失败', icon: 'none' })
    } finally {
      state.joining = false
    }
  }

  if (!state.activity) {
    return <View className='loading-page'><Text>加载中...</Text></View>
  }

  const a = state.activity
  const progress = Math.min((a.current_people / a.min_people) * 100, 100)
  const remainDays = Math.max(0, Math.ceil((new Date(a.end_time).getTime() - Date.now()) / 86400000))
  const remainHours = Math.max(0, Math.ceil((new Date(a.end_time).getTime() - Date.now()) / 3600000))
  const discount = a.original_price > 0 ? ((Number(a.original_price) - Number(a.group_price)) / Number(a.original_price) * 100).toFixed(0) : 0

  return (
    <ScrollView scrollY className='activity-page'>
      {/* Cover */}
      <View className='cover-section'>
        <Image
          src={a.banner_images?.[0] || 'https://picsum.photos/750/500'}
          mode='aspectFill'
          className='cover-image'
        />
        <View className='cover-overlay'>
          <View className='price-tag'>
            <Text className='group-price'>¥{a.group_price}</Text>
            <Text className='original-price'>¥{a.original_price}</Text>
          </View>
          {discount > 0 && (
            <View className='discount-tag'>
              <Text>省{Math.round(Number(a.original_price) - Number(a.group_price))}元</Text>
            </View>
          )}
        </View>
      </View>

      {/* Activity Info */}
      <View className='info-section'>
        <Text className='activity-name'>{a.activity_name}</Text>
        <View className='tags'>
          <Text className='tag'>{remainDays > 0 ? `剩余${remainDays}天` : `剩余${remainHours}小时`}</Text>
          <Text className='tag'>满{a.min_people}人成团</Text>
          {a.max_per_user > 0 && <Text className='tag'>限购{a.max_per_user}份</Text>}
        </View>
      </View>

      {/* Leader Info */}
      {a.leader && (
        <View className='leader-section'>
          <Image src={a.leader.avatar || ''} className='leader-avatar' />
          <View className='leader-info'>
            <Text className='leader-name'>{a.leader.nickname}</Text>
            <Text className='leader-area'>{a.leader.province} {a.leader.city}</Text>
          </View>
        </View>
      )}

      {/* Progress */}
      <View className='progress-section'>
        <View className='progress-header'>
          <Text className='progress-label'>成团进度</Text>
          <Text className='progress-count'>{a.current_people}/{a.min_people}人</Text>
        </View>
        <View className='progress-bar'>
          <View className='progress-fill' style={{ width: `${progress}%` }} />
        </View>
        <Text className='progress-tip'>
          {a.current_people >= a.min_people ? '🎉 已成团，等待发货' : `还差${a.min_people - a.current_people}人成团`}
        </Text>
      </View>

      {/* Pickup Info */}
      {a.leader && (
        <View className='pickup-section'>
          <Text className='section-title'>提货信息</Text>
          <View className='pickup-info'>
            <Text className='pickup-name'>{a.leader.pickup_address}</Text>
            <Text className='pickup-hours'>营业时间: {a.leader.pickup_hours}</Text>
          </View>
        </View>
      )}

      {/* Address Selector */}
      <View className='address-section' onClick={() => wx.navigateTo({ url: '/pages/address/address' })}>
        {state.selectedAddress ? (
          <View className='address-info'>
            <Text className='consignee'>{state.selectedAddress.consignee} {state.selectedAddress.phone}</Text>
            <Text className='address-detail'>
              {state.selectedAddress.province}{state.selectedAddress.city}{state.selectedAddress.district}{state.selectedAddress.address}
            </Text>
          </View>
        ) : (
          <Text className='add-address'>+ 添加收货地址</Text>
        )}
        <Text className='arrow'>›</Text>
      </View>

      {/* Rules */}
      {a.rule_description && (
        <View className='rules-section'>
          <Text className='section-title'>活动规则</Text>
          <Text className='rules-text'>{a.rule_description}</Text>
        </View>
      )}

      {/* Bottom Bar */}
      <View className='bottom-bar'>
        <View className='bottom-price'>
          <Text className='price-label'>团购价</Text>
          <Text className='price-value'>¥{a.group_price}</Text>
        </View>
        <Button
          className='join-btn'
          disabled={a.status !== 1 || state.joining}
          onClick={handleJoin}
          loading={state.joining}
        >
          {a.status === 1 ? '立即参团' : a.status === 2 ? '已成团' : '活动未开始'}
        </Button>
      </View>

      <View className='bottom-spacer' />
    </ScrollView>
  )
}
