import { useState, useEffect } from 'react'
import { View, Text, Image, Button, ScrollView, Navigator } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { api, Activity, Order } from '../../api/client'
import { useAuthStore } from '../../store/auth'
import './index.css'

function getStatusText(status: string): string {
  const map: Record<string, string> = {
    pending: '预热中',
    active: '进行中',
    completed: '已成团',
    closed: '已截团',
  }
  return map[status] || status
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

export default function ActivityDetail() {
  const [activity, setActivity] = useState<Activity | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)

  // Form state
  const [receiverName, setReceiverName] = useState('')
  const [receiverPhone, setReceiverPhone] = useState('')
  const [address, setAddress] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'delivery'>('pickup')

  const { isLoggedIn } = useAuthStore()

  let activityId = 0

  useEffect(() => {
    const pages = Taro.getCurrentPages()
    const current = pages[pages.length - 1]
    const id = (current as any)?.options?.id
    activityId = Number(id)
    if (activityId) loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await api.getActivity(activityId)
      setActivity(data)
    } catch (e) {
      console.error(e)
      Taro.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    if (!isLoggedIn) {
      Taro.navigateTo({ url: '/pages/login/login' })
      return
    }
    if (!receiverName.trim()) {
      Taro.showToast({ title: '请填写收货人姓名', icon: 'none' })
      return
    }
    if (!receiverPhone.trim() || !/^1[3-9]\d{9}$/.test(receiverPhone)) {
      Taro.showToast({ title: '请填写正确的手机号', icon: 'none' })
      return
    }
    if (!address.trim()) {
      Taro.showToast({ title: '请填写收货地址', icon: 'none' })
      return
    }

    setJoining(true)
    try {
      const order: Order = await api.createOrder({
        activity_id: activityId,
        quantity,
        receiver_name: receiverName.trim(),
        receiver_phone: receiverPhone.trim(),
        address: address.trim(),
        delivery_type: deliveryType,
      })

      Taro.showToast({ title: '参团成功', icon: 'success' })
      // Navigate to order detail
      Taro.redirectTo({ url: `/pages/order/order?id=${order.id}` })
    } catch (e: any) {
      Taro.showToast({ title: e.message || '参团失败', icon: 'none' })
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <View className='loading-page'>
        <Text>加载中...</Text>
      </View>
    )
  }

  if (!activity) {
    return (
      <View className='loading-page'>
        <Text>活动不存在</Text>
      </View>
    )
  }

  const a = activity
  const progress = a.min_participants > 0
    ? Math.min((a.current_participants / a.min_participants) * 100, 100)
    : 0
  const origPrice = a.product?.original_price || a.group_price
  const discount = origPrice > 0 && a.group_price > 0
    ? ((origPrice - a.group_price) / origPrice * 100).toFixed(0)
    : '0'
  const coverImage = `https://picsum.photos/750/500?random=${a.id}`

  return (
    <View className='activity-page'>
      <ScrollView scrollY className='activity-scroll'>

        {/* Cover */}
        <View className='cover-section'>
          <Image src={coverImage} mode='aspectFill' className='cover-image' />
          <View className='cover-overlay'>
            <View className='price-tag'>
              <Text className='group-price'>¥{a.group_price}</Text>
              <Text className='original-price'>¥{origPrice}</Text>
            </View>
            {Number(discount) > 0 && (
              <View className='discount-tag'>
                <Text>省{Math.round(origPrice - a.group_price)}元</Text>
              </View>
            )}
          </View>
        </View>

        {/* Activity Info */}
        <View className='info-section'>
          <Text className='activity-name'>{a.product?.name || "团购活动"}</Text>
          {a.description && (
            <Text className='activity-desc'>{a.description}</Text>
          )}
          <View className='tags'>
            <Text className='tag'>{getRemainTime(a.end_time)}</Text>
            <Text className='tag'>满{a.min_participants}人成团</Text>

            <Text className='tag status-tag' style={{ background: a.status === 'active' ? '#fff0e6' : '#f0f0f0', color: a.status === 'active' ? '#ff6b35' : '#999' }}>
              {getStatusText(a.status)}
            </Text>
          </View>
        </View>



        {/* Leader Info */}
        {a.leader && (
          <View className='leader-section'>
            <Text className='section-title'>团长信息</Text>
            <View className='leader-card'>
              <Image
                src='https://picsum.photos/100/100?random=avatar'
                className='leader-avatar'
              />
              <View className='leader-info'>
                <Text className='leader-name'>{a.leader?.community || "待定"}</Text>
                <Text className='leader-area'>
                  {a.leader?.district || ""}
                </Text>
              </View>
            </View>
            {a.leader?.pickup_address && (
              <View className='pickup-info'>
                <Text className='pickup-label'>提货地址</Text>
                <Text className='pickup-address'>{a.leader?.pickup_address}</Text>
              </View>
            )}
          </View>
        )}

        {/* Progress */}
        <View className='progress-section'>
          <Text className='section-title'>成团进度</Text>
          <View className='progress-header'>
            <View className='progress-bar-wrap'>
              <View className='progress-bar'>
                <View className='progress-fill' style={{ width: `${progress}%` }} />
              </View>
            </View>
            <Text className='progress-count'>{a.current_participants}/{a.min_participants}人</Text>
          </View>
          <Text className='progress-tip'>
            {a.current_participants >= a.min_participants
              ? '🎉 已成团，等待发货'
              : `还差 ${a.min_participants - a.current_participants} 人成团`}
          </Text>
        </View>

        {/* Description */}
        {a.description && (
          <View className='rules-section'>
            <Text className='section-title'>活动说明</Text>
            <Text className='rules-text'>{a.description}</Text>
          </View>
        )}

        {/* Order Form */}
        <View className='form-section'>
          <Text className='section-title'>填写订单</Text>

          {deliveryType === 'pickup' && (
            <View className='pickup-notice'>
              <Text className='pickup-notice-text'>
                📍 自提点：{a.leader?.pickup_address || '请前往提货'}
              </Text>
            </View>
          )}

          <View className='form-group'>
            <Text className='form-label'>配送方式</Text>
            <View className='delivery-type'>
              {['pickup', 'delivery'].map(type => (
                <View
                  key={type}
                  className={`type-btn ${deliveryType === type ? 'active' : ''}`}
                  onClick={() => setDeliveryType(type as 'pickup' | 'delivery')}
                >
                  <Text>{type === 'pickup' ? '🏪 自提' : '📦 送货上门'}</Text>
                </View>
              ))}
            </View>
          </View>

          <View className='form-group'>
            <Text className='form-label'>收货人姓名</Text>
            <View className='form-input-wrap'>
              <input
                className='form-input'
                placeholder='请输入收货人姓名'
                value={receiverName}
                onInput={(e: any) => setReceiverName(e.detail.value)}
              />
            </View>
          </View>

          <View className='form-group'>
            <Text className='form-label'>手机号</Text>
            <View className='form-input-wrap'>
              <input
                className='form-input'
                type='number'
                placeholder='请输入手机号'
                value={receiverPhone}
                onInput={(e: any) => setReceiverPhone(e.detail.value)}
                maxLength={11}
              />
            </View>
          </View>

          <View className='form-group'>
            <Text className='form-label'>
              {deliveryType === 'pickup' ? '自提地址' : '收货地址'}
            </Text>
            <View className='form-input-wrap'>
              <input
                className='form-input'
                placeholder={
                  deliveryType === 'pickup'
                    ? (a.leader?.pickup_address || '请填写自提地址')
                    : '请填写详细收货地址'
                }
                value={address}
                onInput={(e: any) => setAddress(e.detail.value)}
              />
            </View>
          </View>

          <View className='form-group'>
            <Text className='form-label'>购买数量</Text>
            <View className='quantity-wrap'>
              <View
                className='qty-btn'
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
              >
                <Text>−</Text>
              </View>
              <Text className='qty-value'>{quantity}</Text>
              <View
                className='qty-btn'
                onClick={() => setQuantity(q => Math.min((a.product?.stock || 99) || 99, q + 1))}
              >
                <Text>+</Text>
              </View>
            </View>
          </View>
        </View>

        <View className='bottom-spacer' />
      </ScrollView>

      {/* Bottom Bar */}
      <View className='bottom-bar'>
        <View className='bottom-price'>
          <Text className='price-label'>团购价</Text>
          <Text className='price-value'>¥{a.group_price}</Text>
          {quantity > 1 && (
            <Text className='price-total'>共 ¥{(a.group_price * quantity).toFixed(2)}</Text>
          )}
        </View>
        <Button
          className={`join-btn ${a.status !== 'active' ? 'disabled' : ''}`}
          disabled={a.status !== 'active' || joining}
          loading={joining}
          onClick={handleJoin}
        >
          {a.status === 'active' ? '立即参团' : getStatusText(a.status)}
        </Button>
      </View>
    </View>
  )
}