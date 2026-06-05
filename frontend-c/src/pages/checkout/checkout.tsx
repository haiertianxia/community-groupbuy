import { useState, useEffect } from 'react'
import { View, Text, Image, Button, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { api, Order, Activity } from '../../api/client'
import { useAuthStore } from '../../store/auth'
import './index.css'

export default function Checkout() {
  const { isLoggedIn } = useAuthStore()
  const [activity, setActivity] = useState<Activity | null>(null)
  const [orderId, setOrderId] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [paying, setPaying] = useState(false)

  // Form fields
  const [receiverName, setReceiverName] = useState('')
  const [receiverPhone, setReceiverPhone] = useState('')
  const [address, setAddress] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'delivery'>('pickup')
  const [remark, setRemark] = useState('')

  useEffect(() => {
    if (!isLoggedIn) {
      Taro.navigateTo({ url: '/pages/login/login' })
      return
    }
    const pages = Taro.getCurrentPages()
    const current = pages[pages.length - 1]
    const activityId = Number((current as any).options?.activityId)
    const orderIdParam = Number((current as any).options?.orderId)

    if (orderIdParam) {
      setOrderId(orderIdParam)
      loadOrder(orderIdParam)
    } else if (activityId) {
      loadActivity(activityId)
    }
  }, [])

  const loadActivity = async (id: number) => {
    setLoading(true)
    try {
      const data = await api.getActivity(id)
      setActivity(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const loadOrder = async (id: number) => {
    try {
      const order = await api.getOrder(id)
      setOrderId(order.id)
      setReceiverName(order.receiver_name)
      setReceiverPhone(order.receiver_phone)
      setAddress(order.address)
      setDeliveryType(order.delivery_type)
      if (order.activity_id) {
        loadActivity(order.activity_id)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleSubmit = async () => {
    if (!receiverName.trim() || !receiverPhone.trim() || !address.trim()) {
      Taro.showToast({ title: '请填写完整信息', icon: 'none' })
      return
    }
    if (!/^1[3-9]\d{9}$/.test(receiverPhone)) {
      Taro.showToast({ title: '手机号格式错误', icon: 'none' })
      return
    }

    if (!activity) return
    setPaying(true)
    try {
      const order = await api.createOrder({
        activity_id: activity.id,
        quantity,
        receiver_name: receiverName.trim(),
        receiver_phone: receiverPhone.trim(),
        address: address.trim(),
        delivery_type: deliveryType,
      })
      Taro.showToast({ title: '下单成功', icon: 'success' })
      Taro.redirectTo({ url: `/pages/order/order?id=${order.id}` })
    } catch (e: any) {
      Taro.showToast({ title: e.message || '下单失败', icon: 'none' })
    } finally {
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <View className='loading-page'>
        <Text>加载中...</Text>
      </View>
    )
  }

  const totalAmount = activity ? activity.group_price * quantity : 0

  return (
    <View className='checkout-page'>
      {/* Activity Summary */}
      {activity && (
        <View className='activity-summary'>
          <Image
            src={`https://picsum.photos/200/200?random=${activity.id}`}
            mode='aspectFill'
            className='summary-img'
          />
          <View className='summary-info'>
            <Text className='summary-name' numberOfLines={2}>{activity.product?.name || '团购商品'}</Text>
            <Text className='summary-price'>¥{activity.group_price}</Text>
          </View>
        </View>
      )}

      {/* Delivery Type */}
      <View className='section'>
        <Text className='section-title'>配送方式</Text>
        <View className='delivery-type'>
          {(['pickup', 'delivery'] as const).map(type => (
            <View
              key={type}
              className={`type-btn ${deliveryType === type ? 'active' : ''}`}
              onClick={() => setDeliveryType(type)}
            >
              <Text>{type === 'pickup' ? '🏪 自提' : '📦 送货上门'}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Form Fields */}
      <View className='form-section'>
        <View className='form-group'>
          <Text className='form-label'>收货人姓名</Text>
          <Input
            className='form-input'
            placeholder='请输入收货人姓名'
            value={receiverName}
            onInput={(e: any) => setReceiverName(e.detail.value)}
          />
        </View>
        <View className='form-group'>
          <Text className='form-label'>手机号</Text>
          <Input
            className='form-input'
            type='number'
            placeholder='请输入手机号'
            value={receiverPhone}
            onInput={(e: any) => setReceiverPhone(e.detail.value)}
            maxLength={11}
          />
        </View>
        <View className='form-group'>
          <Text className='form-label'>
            {deliveryType === 'pickup' ? '自提地址' : '收货地址'}
          </Text>
          <Input
            className='form-input'
            placeholder={
              deliveryType === 'pickup'
                ? (activity?.pickup_address || '请填写自提地址')
                : '请填写详细收货地址'
            }
            value={address}
            onInput={(e: any) => setAddress(e.detail.value)}
          />
        </View>
        <View className='form-group'>
          <Text className='form-label'>购买数量</Text>
          <View className='quantity-wrap'>
            <View className='qty-btn' onClick={() => setQuantity(q => Math.max(1, q - 1))}>
              <Text>−</Text>
            </View>
            <Text className='qty-value'>{quantity}</Text>
            <View className='qty-btn' onClick={() => setQuantity(q => Math.min(activity?.stock || 99, q + 1))}>
              <Text>+</Text>
            </View>
          </View>
        </View>
        <View className='form-group'>
          <Text className='form-label'>备注</Text>
          <Input
            className='form-input'
            placeholder='选填，可备注特殊需求'
            value={remark}
            onInput={(e: any) => setRemark(e.detail.value)}
          />
        </View>
      </View>

      {/* Bottom Bar */}
      <View className='bottom-bar'>
        <View className='price-info'>
          <Text className='total-label'>合计</Text>
          <Text className='total-price'>¥{totalAmount.toFixed(2)}</Text>
        </View>
        <Button
          className='pay-btn'
          loading={paying}
          disabled={paying}
          onClick={handleSubmit}
        >
          提交订单
        </Button>
      </View>
    </View>
  )
}