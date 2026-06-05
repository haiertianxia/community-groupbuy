import { useState, useEffect } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { api, Order } from '../../../api/client'
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

export default function OrderDetail() {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [shipping, setShipping] = useState(false)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    const id = (Taro.getCurrentInstance() as any).router?.params?.id
    if (!id) {
      Taro.showToast({ title: '参数错误', icon: 'none' })
      return
    }
    api.getOrder(Number(id))
      .then(setOrder)
      .catch((e: any) => Taro.showToast({ title: e.message, icon: 'none' }))
      .finally(() => setLoading(false))
  }, [])

  const handleShip = async () => {
    const companies = ['顺丰速运', '圆通速递', '中通快递', '韵达快递', '极兔速递', '京东物流']
    try {
      const idx = await Taro.showActionSheet({ itemList: companies })
      const express = companies[idx.tapIndex]
      const input = await Taro.showModal({
        title: '填写快递单号',
        editable: true,
        placeholderText: '请输入快递单号',
      })
      if (!input.confirm || !input.content?.trim()) return

      setShipping(true)
      await api.shipOrder(order!.id)
      Taro.showToast({ title: '发货成功', icon: 'success' })
      const updated = await api.getOrder(order!.id)
      setOrder(updated)
    } catch (e: any) {
      Taro.showToast({ title: e.message, icon: 'none' })
    } finally {
      setShipping(false)
    }
  }

  const handleRefundAction = async (approved: boolean) => {
    const action = approved ? '同意' : '拒绝'
    const confirm = await Taro.showModal({ title: `确认${action}退款？` })
    if (!confirm.confirm) return

    setProcessing(true)
    try {
      await api.updateOrder(order!.id, {
        status: approved ? 7 : 3,
        refund_reason: approved ? '团长同意退款' : '团长拒绝退款',
      })
      Taro.showToast({ title: `已${action}退款`, icon: 'success' })
      const updated = await api.getOrder(order!.id)
      setOrder(updated)
    } catch (e: any) {
      Taro.showToast({ title: e.message, icon: 'none' })
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <View className='detail-page loading-state'>
        <Text>加载中...</Text>
      </View>
    )
  }

  if (!order) {
    return (
      <View className='detail-page loading-state'>
        <Text>订单不存在</Text>
      </View>
    )
  }

  return (
    <View className='detail-page'>
      {/* Status Banner */}
      <View className='status-banner' style={{ background: STATUS_COLOR[order.status] }}>
        <Text className='status-text'>{STATUS_TEXT[order.status]}</Text>
      </View>

      {/* Receiver Info */}
      <View className='card'>
        <View className='card-title'>收件信息</View>
        <View className='receiver-row'>
          <Text className='receiver-name'>{order.receiver_name}</Text>
          <Text className='receiver-phone'>{order.receiver_phone}</Text>
        </View>
        <Text className='receiver-addr'>{order.address}</Text>
        <View className='delivery-tag'>
          <Text>{DELIVERY_TEXT[order.delivery_type] || '自提'}</Text>
        </View>
      </View>

      {/* Order Info */}
      <View className='card'>
        <View className='card-title'>订单信息</View>
        <View className='info-row'>
          <Text className='info-label'>订单编号</Text>
          <Text className='info-value'>{order.order_no}</Text>
        </View>
        <View className='info-row'>
          <Text className='info-label'>活动</Text>
          <Text className='info-value'>
            {order.activity?.activity_name || `#${order.activity_id}`}
          </Text>
        </View>
        <View className='info-row'>
          <Text className='info-label'>购买数量</Text>
          <Text className='info-value'>x{order.quantity}</Text>
        </View>
        <View className='info-row'>
          <Text className='info-label'>订单金额</Text>
          <Text className='info-value price'>¥{order.pay_amount}</Text>
        </View>
        <View className='info-row'>
          <Text className='info-label'>下单时间</Text>
          <Text className='info-value'>{new Date(order.created_at).toLocaleString('zh-CN')}</Text>
        </View>
        {order.express_company && (
          <View className='info-row'>
            <Text className='info-label'>快递信息</Text>
            <Text className='info-value'>
              {order.express_company} {order.express_no}
            </Text>
          </View>
        )}
        {order.refund_reason && (
          <View className='info-row'>
            <Text className='info-label'>退款原因</Text>
            <Text className='info-value refund-reason'>{order.refund_reason}</Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View className='actions'>
        {order.status === 1 && (
          <Button
            className='action-btn primary'
            loading={shipping}
            onClick={handleShip}
          >
            发货
          </Button>
        )}
        {order.status === 6 && (
          <>
            <Button
              className='action-btn reject'
              loading={processing}
              onClick={() => handleRefundAction(false)}
            >
              拒绝退款
            </Button>
            <Button
              className='action-btn approve'
              loading={processing}
              onClick={() => handleRefundAction(true)}
            >
              同意退款
            </Button>
          </>
        )}
      </View>
    </View>
  )
}