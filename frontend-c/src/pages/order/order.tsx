import { useState, useEffect, useCallback } from 'react'
import { View, Text, Image, ScrollView, Navigator } from '@tarojs/components'
import Taro, { useReachBottom, usePullDownRefresh } from '@tarojs/taro'
import { api, Order } from '../../api/client'
import './index.css'

const TABS = [
  { key: 'all', label: '全部' },
  { key: 'pending_payment', label: '待支付' },
  { key: 'paid', label: '待发货' },
  { key: 'shipped', label: '待收货' },
  { key: 'completed', label: '已完成' },
]

const STATUS_INFO: Record<string, { text: string; color: string }> = {
  pending_payment: { text: '待支付', color: '#ff6b35' },
  paid: { text: '待发货', color: '#1890ff' },
  shipped: { text: '待收货', color: '#1890ff' },
  confirmed: { text: '待确认', color: '#faad14' },
  completed: { text: '已完成', color: '#52c41a' },
  cancelled: { text: '已取消', color: '#999' },
  refund_pending: { text: '退款中', color: '#faad14' },
  refunded: { text: '已退款', color: '#999' },
}

export default function OrderList() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [currentTab, setCurrentTab] = useState('all')

  const loadOrders = useCallback(async (reset = false) => {
    if (loading) return
    const currentPage = reset ? 1 : page
    setLoading(true)
    try {
      const res = await api.getOrders({ page: currentPage, page_size: 10 })
      const items = res.items || []
      setOrders(prev => reset ? items : [...prev, ...items])
      setHasMore(items.length === 10)
      setPage(currentPage + 1)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [loading, page])

  const resetAndLoad = () => {
    setOrders([])
    setPage(1)
    setHasMore(true)
    loadOrders(true)
  }

  useEffect(() => {
    resetAndLoad()
  }, [currentTab])

  usePullDownRefresh(() => {
    resetAndLoad().finally(() => Taro.stopPullDownRefresh())
  })

  useReachBottom(() => {
    if (!loading && hasMore) loadOrders(false)
  })

  const switchTab = (key: string) => {
    if (key === currentTab) return
    setCurrentTab(key)
  }

  const getFilteredOrders = () => {
    if (currentTab === 'all') return orders
    return orders.filter(o => o.status === currentTab)
  }

  const handleCancel = async (orderId: number, e: any) => {
    e.stopPropagation()
    const { confirm } = await Taro.showModal({
      title: '确认取消订单?',
      content: '',
    })
    if (!confirm) return
    try {
      await api.updateOrderStatus(orderId, { status: 'cancelled' })
      Taro.showToast({ title: '已取消', icon: 'success' })
      resetAndLoad()
    } catch (err: any) {
      Taro.showToast({ title: err.message || '操作失败', icon: 'none' })
    }
  }

  const handleConfirm = async (orderId: number, e: any) => {
    e.stopPropagation()
    const { confirm } = await Taro.showModal({
      title: '确认收货?',
      content: '请确认已收到商品',
    })
    if (!confirm) return
    try {
      await api.updateOrderStatus(orderId, { status: 'completed' })
      Taro.showToast({ title: '已确认收货', icon: 'success' })
      resetAndLoad()
    } catch (err: any) {
      Taro.showToast({ title: err.message || '操作失败', icon: 'none' })
    }
  }

  const filteredOrders = getFilteredOrders()

  return (
    <View className='order-page'>
      {/* Tabs */}
      <View className='tabs'>
        {TABS.map(tab => (
          <View
            key={tab.key}
            className={`tab ${currentTab === tab.key ? 'active' : ''}`}
            onClick={() => switchTab(tab.key)}
          >
            <Text>{tab.label}</Text>
          </View>
        ))}
      </View>

      {/* Order List */}
      <ScrollView scrollY className='order-list'>
        {filteredOrders.length === 0 && !loading && (
          <View className='empty-state'>
            <Text className='empty-text'>暂无订单</Text>
            <Navigator url='/pages/index/index' className='go-shop-btn'>
              <Text>去逛逛</Text>
            </Navigator>
          </View>
        )}

        {filteredOrders.map(order => {
          const info = STATUS_INFO[order.status] || { text: order.status, color: '#999' }
          const activity = order.activity
          const coverImage = activity?.product?.images?.[0] || activity?.product?.image || `https://picsum.photos/120/120?random=${order.id}`

          return (
            <Navigator
              key={order.id}
              url={`/pages/order/order?id=${order.id}`}
              className='order-card'
            >
              <View className='order-header'>
                <Text className='order-no'>订单号: {order.id}</Text>
                <Text className='order-status' style={{ color: info.color }}>{info.text}</Text>
              </View>

              <View className='order-items'>
                <Image src={coverImage} mode='aspectFill' className='item-img' />
                <View className='item-info'>
                  <Text className='item-name' numberOfLines={2}>
                    {activity?.name || '团购商品'}
                  </Text>
                  <Text className='item-price'>¥{order.total_amount}</Text>
                  <Text className='item-time'>
                    {new Date(order.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <View className='item-qty'>
                  <Text className='qty-label'>x{order.quantity}</Text>
                </View>
              </View>

              {/* Actions */}
              <View className='order-footer'>
                {order.status === 'pending_payment' && (
                  <View className='action-row'>
                    <View
                      className='btn btn-outline'
                      onClick={(e: any) => { e.stopPropagation(); handleCancel(order.id, e) }}
                    >
                      取消订单
                    </View>
                    <Navigator
                      url={`/pages/checkout/checkout?orderId=${order.id}`}
                      className='btn btn-primary'
                      onClick={(e: any) => e.stopPropagation()}
                    >
                      去支付
                    </Navigator>
                  </View>
                )}
                {order.status === 'shipped' && (
                  <View className='action-row'>
                    {order.tracking_number && (
                      <Text className='tracking-info'>运单号: {order.tracking_number}</Text>
                    )}
                    <View
                      className='btn btn-primary'
                      onClick={(e: any) => { e.stopPropagation(); handleConfirm(order.id, e) }}
                    >
                      确认收货
                    </View>
                  </View>
                )}
                {order.status === 'completed' && (
                  <View className='action-row'>
                    <View className='btn btn-outline'>再次购买</View>
                    <Navigator
                      url={`/pages/activity/activity?id=${order.activity_id}`}
                      className='btn btn-primary'
                      onClick={(e: any) => e.stopPropagation()}
                    >
                      再来一单
                    </Navigator>
                  </View>
                )}
              </View>
            </Navigator>
          )
        })}

        {loading && <View className='loading-tip'><Text>加载中...</Text></View>}
        {!hasMore && filteredOrders.length > 0 && (
          <View className='loading-tip'><Text>— 没有更多了 —</Text></View>
        )}
      </ScrollView>
    </View>
  )
}