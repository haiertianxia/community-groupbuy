import { Component, reactive, onMounted } from 'react'
import { View, Text, Image, ScrollView, Navigator } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { api, Order } from '../../api/client'
import './index.css'

const STATUS_MAP: Record<number, { text: string; color: string }> = {
  0: { text: '待支付', color: '#ff6b35' },
  1: { text: '待发货', color: '#1890ff' },
  2: { text: '待收货', color: '#1890ff' },
  3: { text: '待确认', color: '#faad14' },
  4: { text: '已完成', color: '#52c41a' },
  5: { text: '已取消', color: '#999' },
  6: { text: '退款中', color: '#faad14' },
  7: { text: '已退款', color: '#999' },
}

const TABS = ['全部', '待支付', '待发货', '待收货', '已完成']

export default function OrderList() {
  const state = reactive({
    orders: [] as Order[],
    loading: false,
    page: 1,
    hasMore: true,
    currentTab: 0,
  })

  const statusMap: Record<number, number> = { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: -1 }

  const loadOrders = async () => {
    if (state.loading || !state.hasMore) return
    state.loading = true
    try {
      const res = await api.getOrders({
        page: state.page,
        page_size: 10,
        status: state.currentTab === 0 ? undefined : TABS[state.currentTab] === '待支付' ? 0 :
          TABS[state.currentTab] === '待发货' ? 1 :
          TABS[state.currentTab] === '待收货' ? 2 :
          TABS[state.currentTab] === '已完成' ? 4 : undefined,
      })
      if (state.page === 1) {
        state.orders = res.list
      } else {
        state.orders = [...state.orders, ...res.list]
      }
      state.hasMore = res.list.length === 10
      state.page++
    } catch (e) {
      console.error(e)
    } finally {
      state.loading = false
    }
  }

  onMounted(() => {
    loadOrders()
  })

  const switchTab = (index: number) => {
    state.currentTab = index
    state.orders = []
    state.page = 1
    state.hasMore = true
    loadOrders()
  }

  const handleCancel = async (orderId: number) => {
    const res = await Taro.showModal({ title: '确认取消订单?', content: '' })
    if (res.confirm) {
      try {
        await api.cancelOrder(orderId)
        Taro.showToast({ title: '已取消', icon: 'success' })
        loadOrders()
      } catch (e: any) {
        Taro.showToast({ title: e.message, icon: 'none' })
      }
    }
  }

  const handleRefund = async (orderId: number) => {
    try {
      await api.refundOrder(orderId, '不想要了')
      Taro.showToast({ title: '退款申请已提交', icon: 'success' })
      loadOrders()
    } catch (e: any) {
      Taro.showToast({ title: e.message, icon: 'none' })
    }
  }

  const handleConfirm = async (orderId: number) => {
    try {
      await api.confirmOrder(orderId)
      Taro.showToast({ title: '已确认收货', icon: 'success' })
      loadOrders()
    } catch (e: any) {
      Taro.showToast({ title: e.message, icon: 'none' })
    }
  }

  return (
    <View className='order-page'>
      {/* Tabs */}
      <ScrollView scrollX className='tabs'>
        {TABS.map((tab, index) => (
          <View
            key={index}
            className={`tab ${state.currentTab === index ? 'active' : ''}`}
            onClick={() => switchTab(index)}
          >
            {tab}
          </View>
        ))}
      </ScrollView>

      {/* Order List */}
      <ScrollView scrollY className='order-list' onScrollToLower={loadOrders}>
        {state.orders.length === 0 && !state.loading && (
          <View className='empty'>
            <Text>暂无订单</Text>
            <Navigator url='/pages/index/index' className='go-shop'>去逛逛</Navigator>
          </View>
        )}

        {state.orders.map((order) => {
          const statusInfo = STATUS_MAP[order.status] || { text: '未知', color: '#999' }
          return (
            <Navigator key={order.id} url={`/pages/order/order?id=${order.id}`} className='order-card'>
              <View className='order-header'>
                <Text className='order-no'>订单号: {order.order_no}</Text>
                <Text className='order-status' style={{ color: statusInfo.color }}>{statusInfo.text}</Text>
              </View>

              <View className='order-items'>
                <View className='item'>
                  <Image src='https://picsum.photos/120/120' mode='aspectFill' className='item-img' />
                  <View className='item-info'>
                    <Text className='item-name'>团购商品</Text>
                    <Text className='item-price'>¥{order.pay_amount}</Text>
                    <Text className='item-time'>{new Date(order.created_at).toLocaleDateString()}</Text>
                  </View>
                </View>
              </View>

              <View className='order-footer'>
                {order.status === 0 && (
                  <View className='action-row'>
                    <View className='btn btn-cancel' onClick={(e) => { e.stopPropagation(); handleCancel(order.id) }}>
                      取消订单
                    </View>
                    <View className='btn btn-primary'>去支付</View>
                  </View>
                )}
                {order.status === 2 && (
                  <View className='action-row'>
                    <View className='btn btn-default' onClick={(e) => { e.stopPropagation(); handleRefund(order.id) }}>
                      申请退款
                    </View>
                    <View className='btn btn-primary' onClick={(e) => { e.stopPropagation(); handleConfirm(order.id) }}>
                      确认收货
                    </View>
                  </View>
                )}
                {order.status === 4 && (
                  <View className='action-row'>
                    <View className='btn btn-default'>删除订单</View>
                    <View className='btn btn-primary'>再次购买</View>
                  </View>
                )}
              </View>
            </Navigator>
          )
        })}

        {state.loading && (
          <View className='loading'><Text>加载中...</Text></View>
        )}
      </ScrollView>
    </View>
  )
}
