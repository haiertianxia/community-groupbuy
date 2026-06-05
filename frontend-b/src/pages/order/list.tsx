import { useState, useEffect, useCallback } from 'react'
import { View, Text, Image, Button, Navigator, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { api, Order } from '../../api/client'
import './index.css'

const STATUS_TEXT: Record<number, string> = {
  0: '待支付', 1: '待发货', 2: '待收货', 3: '已确认',
  4: '已完成', 5: '已取消', 6: '退款中', 7: '已退款',
}
const STATUS_COLOR: Record<number, string> = {
  0: '#fa8c16', 1: '#1890ff', 2: '#1890ff', 3: '#faad14',
  4: '#52c41a', 5: '#999', 6: '#faad14', 7: '#999',
}
const DELIVERY_TEXT: Record<number, string> = { 0: '自提', 1: '快递' }

export default function OrderList() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [currentTab, setCurrentTab] = useState(0)
  const [shipping, setShipping] = useState<number | null>(null)

  const tabs = [
    { label: '全部', status: undefined },
    { label: '待发货', status: 1 },
    { label: '退款中', status: 6 },
  ]

  const fetchOrders = useCallback(async (pageNum: number, reset = false) => {
    const statusFilter = tabs[currentTab].status
    const params: { page: number; page_size: number; status?: number } = {
      page: pageNum,
      page_size: 10,
    }
    if (statusFilter !== undefined) params.status = statusFilter

    setLoading(true)
    try {
      const res = await api.getLeaderOrders(params)
      const items = res.items || []
      if (reset || pageNum === 1) {
        setOrders(items)
      } else {
        setOrders(prev => [...prev, ...items])
      }
      setHasMore(items.length === 10)
      setPage(pageNum)
    } catch (e: any) {
      Taro.showToast({ title: e.message || '加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }, [currentTab])

  useEffect(() => {
    setPage(1)
    setHasMore(true)
    fetchOrders(1, true)
  }, [currentTab])

  const onReachBottom = () => {
    if (!loading && hasMore) {
      fetchOrders(page + 1)
    }
  }

  const onPullDownRefresh = async () => {
    await fetchOrders(1, true)
    Taro.stopPullDownRefresh()
  }

  const switchTab = (index: number) => {
    setCurrentTab(index)
  }

  const handleShip = async (orderId: number) => {
    const companies = ['顺丰速运', '圆通速递', '中通快递', '韵达快递', '极兔速递', '京东物流']
    try {
      const res = await Taro.showActionSheet({ itemList: companies })
      const express = companies[res.tapIndex]

      const inputRes = await Taro.showModal({
        title: '填写快递单号',
        editable: true,
        placeholderText: '请输入快递单号',
      })
      if (!inputRes.confirm || !inputRes.content?.trim()) return

      setShipping(orderId)
      await api.shipOrder(orderId)
      Taro.showToast({ title: '发货成功', icon: 'success' })
      await fetchOrders(1, true)
    } catch (e: any) {
      Taro.showToast({ title: e.message, icon: 'none' })
    } finally {
      setShipping(null)
    }
  }

  const handleRefund = async (orderId: number, approved: boolean) => {
    const action = approved ? '同意' : '拒绝'
    const confirm = await Taro.showModal({
      title: `确认${action}退款？`,
      content: approved ? '款项将原路退回给用户' : '订单将恢复正常状态',
    })
    if (!confirm.confirm) return

    try {
      const newStatus = approved ? 7 : 3 // refunded or confirmed
      await api.updateOrder(orderId, { status: newStatus, refund_reason: approved ? '团长同意退款' : '团长拒绝退款' })
      Taro.showToast({ title: `已${action}退款`, icon: 'success' })
      await fetchOrders(1, true)
    } catch (e: any) {
      Taro.showToast({ title: e.message, icon: 'none' })
    }
  }

  return (
    <View className='orders-page'>
      {/* Tabs */}
      <View className='tabs'>
        {tabs.map((tab, i) => (
          <View
            key={i}
            className={`tab ${currentTab === i ? 'active' : ''}`}
            onClick={() => switchTab(i)}
          >
            <Text>{tab.label}</Text>
          </View>
        ))}
      </View>

      <ScrollView
        scrollY
        className='order-list'
        onScrollToLower={onReachBottom}
        lowerThreshold={80}
      >
        {orders.length === 0 && !loading && (
          <View className='empty'>
            <Text>暂无订单</Text>
          </View>
        )}

        {orders.map((order) => (
          <Navigator
            key={order.id}
            url={`/pages/order/detail?id=${order.id}`}
            className='order-card'
          >
            <View className='order-header'>
              <Text className='order-no'>订单号: {order.order_no}</Text>
              <Text className='order-status' style={{ color: STATUS_COLOR[order.status] }}>
                {STATUS_TEXT[order.status]}
              </Text>
            </View>

            <View className='order-body'>
              <View className='item-img-placeholder'>
                <Text>📦</Text>
              </View>
              <View className='item-info'>
                <Text className='item-name'>
                  {order.activity?.activity_name || `活动 #${order.activity_id}`}
                </Text>
                <Text className='item-price'>¥{order.pay_amount}</Text>
                <Text className='item-count'>x{order.quantity}</Text>
                <Text className='item-time'>
                  {new Date(order.created_at).toLocaleString('zh-CN')}
                </Text>
              </View>
            </View>

            <View className='order-receiver'>
              <Text className='receiver-label'>收件人:</Text>
              <Text className='receiver-name'>{order.receiver_name}</Text>
              <Text className='receiver-phone'>{order.receiver_phone}</Text>
              <Text className='delivery-type'>
                [{DELIVERY_TEXT[order.delivery_type] || '自提'}]
              </Text>
            </View>

            <View className='order-actions' onClick={e => e.stopPropagation()}>
              {order.status === 1 && (
                <Button
                  size='mini'
                  className='btn-ship'
                  loading={shipping === order.id}
                  onClick={() => handleShip(order.id)}
                >
                  发货
                </Button>
              )}
              {order.status === 6 && (
                <>
                  <Button
                    size='mini'
                    className='btn-reject'
                    onClick={() => handleRefund(order.id, false)}
                  >
                    拒绝
                  </Button>
                  <Button
                    size='mini'
                    className='btn-approve'
                    onClick={() => handleRefund(order.id, true)}
                  >
                    同意退款
                  </Button>
                </>
              )}
            </View>
          </Navigator>
        ))}

        {loading && <View className='loading-text'><Text>加载中...</Text></View>}
        {!hasMore && orders.length > 0 && (
          <View className='no-more'><Text>— 没有更多了 —</Text></View>
        )}
      </ScrollView>
    </View>
  )
}