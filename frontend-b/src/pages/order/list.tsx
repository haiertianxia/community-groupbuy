import { Component, reactive, onMounted } from 'react'
import { View, Text, Image, Button, Navigator } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { api, Order } from '../../api/client'
import './index.css'

const STATUS_TEXT: Record<number, string> = {
  0: '待支付', 1: '待发货', 2: '待收货', 3: '已确认', 4: '已完成',
  5: '已取消', 6: '退款中', 7: '已退款',
}
const STATUS_COLOR: Record<number, string> = {
  0: '#ff6b35', 1: '#1890ff', 2: '#1890ff', 3: '#faad14', 4: '#52c41a',
  5: '#999', 6: '#faad14', 7: '#999',
}

export default function LeaderOrders() {
  const state = reactive({
    orders: [] as Order[],
    loading: false,
    page: 1,
    hasMore: true,
    currentTab: 0,
    tabs: ['全部', '待发货', '退款中'],
    shipping: false,
    shippingId: 0,
  })

  const loadOrders = async () => {
    if (state.loading || !state.hasMore) return
    state.loading = true
    try {
      const statusFilter = state.currentTab === 0 ? undefined :
        state.currentTab === 1 ? 1 : 6
      const res = await api.getLeaderOrders({ page: state.page, page_size: 10, status: statusFilter })
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

  const handleShip = async (orderId: number) => {
    const expressMap: Record<string, { id: string; name: string }[]> = {
      '顺丰': [{ id: 'SF', name: '顺丰速运' }],
      '圆通': [{ id: 'YTO', name: '圆通速递' }],
      '中通': [{ id: 'ZTO', name: '中通快递' }],
      '韵达': [{ id: 'YD', name: '韵达快递' }],
    }

    const res = await Taro.showActionSheet({
      itemList: ['顺丰速运', '圆通速递', '中通快递', '韵达快递'],
    })

    if (res.cancel) return

    const express = ['顺丰速运', '圆通速递', '中通快递', '韵达快递'][res.tapIndex]
    const expressNo = await Taro.showModal({
      title: '请输入快递单号',
      editable: true,
      placeholderText: '请输入快递单号',
    })

    if (!expressNo.confirm || !expressNo.content) return

    try {
      state.shipping = true
      state.shippingId = orderId
      await api.shipOrder(orderId, express, expressNo.content)
      Taro.showToast({ title: '发货成功', icon: 'success' })
      loadOrders()
    } catch (e: any) {
      Taro.showToast({ title: e.message, icon: 'none' })
    } finally {
      state.shipping = false
      state.shippingId = 0
    }
  }

  const handleRefund = async (orderId: number, approved: boolean) => {
    try {
      await api.processRefund(orderId, approved, '')
      Taro.showToast({ title: approved ? '已同意退款' : '已拒绝退款', icon: 'success' })
      loadOrders()
    } catch (e: any) {
      Taro.showToast({ title: e.message, icon: 'none' })
    }
  }

  return (
    <View className='orders-page'>
      {/* Tabs */}
      <View className='tabs'>
        {state.tabs.map((tab, i) => (
          <View key={i} className={`tab ${state.currentTab === i ? 'active' : ''}`} onClick={() => switchTab(i)}>
            {tab}
          </View>
        ))}
      </View>

      {/* Orders */}
      <View className='order-list'>
        {state.orders.length === 0 && !state.loading && (
          <View className='empty'><Text>暂无订单</Text></View>
        )}

        {state.orders.map((order) => (
          <View key={order.id} className='order-card'>
            <View className='order-header'>
              <Text className='order-no'>{order.order_no}</Text>
              <Text className='order-status' style={{ color: STATUS_COLOR[order.status] }}>
                {STATUS_TEXT[order.status]}
              </Text>
            </View>

            <View className='order-body'>
              <Image src='https://picsum.photos/80/80' mode='aspectFill' className='item-img' />
              <View className='item-info'>
                <Text className='item-name'>团购商品</Text>
                <Text className='item-price'>¥{order.pay_amount}</Text>
                <Text className='item-time'>{new Date(order.created_at).toLocaleString()}</Text>
              </View>
            </View>

            <View className='order-actions'>
              {order.status === 1 && (
                <Button
                  size='mini'
                  className='btn-ship'
                  loading={state.shipping && state.shippingId === order.id}
                  onClick={() => handleShip(order.id)}
                >
                  发货
                </Button>
              )}
              {order.status === 6 && (
                <>
                  <Button size='mini' className='btn-reject' onClick={() => handleRefund(order.id, false)}>
                    拒绝
                  </Button>
                  <Button size='mini' className='btn-approve' onClick={() => handleRefund(order.id, true)}>
                    同意退款
                  </Button>
                </>
              )}
            </View>
          </View>
        ))}

        {state.loading && <View className='loading'><Text>加载中...</Text></View>}
      </View>
    </View>
  )
}
