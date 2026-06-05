import { useState, useEffect } from 'react'
import { View, Text, Input, Button, Picker } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { api, Product } from '../../../api/client'
import './index.css'

export default function ActivityCreate() {
  const [products, setProducts] = useState<Product[]>([])
  const [leaderId, setLeaderId] = useState<number | null>(null)
  const [form, setForm] = useState({
    product_id: 0,
    group_price: '',
    min_participants: '5',
    max_participants: '100',
    description: '',
    start_date: '',
    end_date: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setErrors(prev => ({ ...prev, [key]: '' }))
  }

  useEffect(() => {
    Promise.all([
      api.getProducts({ page_size: 100 }),
      api.getLeaderProfile().catch(() => null),
    ]).then(([prodRes, leader]) => {
      setProducts(prodRes.items || [])
      if (leader) setLeaderId(leader.id)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.product_id) errs.product_id = '请选择商品'
    if (!form.group_price || isNaN(Number(form.group_price))) errs.group_price = '请填写有效的团购价'
    if (!form.start_date) errs.start_date = '请选择开始日期'
    if (!form.end_date) errs.end_date = '请选择结束日期'
    if (form.start_date && form.end_date && form.start_date >= form.end_date) {
      errs.end_date = '结束日期必须晚于开始日期'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    if (!leaderId) {
      Taro.showToast({ title: '请先申请成为团长', icon: 'none' })
      return
    }
    setSubmitting(true)
    try {
      await api.createActivity({
        product_id: Number(form.product_id),
        leader_id: leaderId,
        group_price: Number(form.group_price),
        min_participants: Number(form.min_participants) || 5,
        max_participants: Number(form.max_participants) || 100,
        description: form.description || undefined,
        start_time: form.start_date,
        end_time: form.end_date,
      })
      Taro.showToast({ title: '活动创建成功', icon: 'success' })
      setTimeout(() => Taro.navigateBack(), 1500)
    } catch (e: any) {
      Taro.showToast({ title: e.message || '创建失败', icon: 'none' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <View className='page'>
        <Text>加载中...</Text>
      </View>
    )
  }

  const todayStr = new Date().toISOString().slice(0, 10)

  return (
    <View className='page'>
      <View className='form-section'>
        <Text className='section-title'>创建团购活动</Text>

        {/* Product Select */}
        <View className='form-row'>
          <Text className='row-label'>选择商品 *</Text>
          <View className='picker-wrap'>
            <Picker
              mode='selector'
              range={products}
              rangeKey='name'
              value={products.findIndex(p => p.id === form.product_id)}
              onChange={(e: any) => set('product_id', String(products[e.detail.value]?.id || ''))}
            >
              <Text className={form.product_id ? 'picker-text' : 'picker-placeholder'}>
                {form.product_id ? products.find(p => p.id === form.product_id)?.name : '请选择团购商品'}
              </Text>
            </Picker>
          </View>
          {errors.product_id && <Text className='err-msg'>{errors.product_id}</Text>}
        </View>

        {/* Group Price */}
        <View className='form-row'>
          <Text className='row-label'>团购价 *</Text>
          <Input
            className='row-input'
            type='number'
            placeholder='例如: 39.9'
            value={form.group_price}
            onInput={(e: any) => set('group_price', e.detail.value)}
          />
          {errors.group_price && <Text className='err-msg'>{errors.group_price}</Text>}
        </View>

        {/* Min Participants */}
        <View className='form-row'>
          <Text className='row-label'>最低成团人数</Text>
          <Input
            className='row-input'
            type='number'
            placeholder='默认: 5'
            value={form.min_participants}
            onInput={(e: any) => set('min_participants', e.detail.value)}
          />
        </View>

        {/* Max Participants */}
        <View className='form-row'>
          <Text className='row-label'>最大参团人数</Text>
          <Input
            className='row-input'
            type='number'
            placeholder='默认: 100'
            value={form.max_participants}
            onInput={(e: any) => set('max_participants', e.detail.value)}
          />
        </View>

        {/* Description */}
        <View className='form-row'>
          <Text className='row-label'>活动描述</Text>
          <Input
            className='row-input'
            placeholder='选填'
            value={form.description}
            onInput={(e: any) => set('description', e.detail.value)}
          />
        </View>

        {/* Start Date */}
        <View className='form-row'>
          <Text className='row-label'>开始日期 *</Text>
          <Picker mode='date' value={form.start_date || todayStr} onChange={(e: any) => set('start_date', e.detail.value)}>
            <Text className={form.start_date ? 'picker-text' : 'picker-placeholder'}>{form.start_date || '请选择'}</Text>
          </Picker>
          {errors.start_date && <Text className='err-msg'>{errors.start_date}</Text>}
        </View>

        {/* End Date */}
        <View className='form-row'>
          <Text className='row-label'>结束日期 *</Text>
          <Picker mode='date' value={form.end_date || todayStr} onChange={(e: any) => set('end_date', e.detail.value)}>
            <Text className={form.end_date ? 'picker-text' : 'picker-placeholder'}>{form.end_date || '请选择'}</Text>
          </Picker>
          {errors.end_date && <Text className='err-msg'>{errors.end_date}</Text>}
        </View>

        {/* Submit */}
        <Button
          className='submit-btn'
          loading={submitting}
          disabled={submitting || !leaderId}
          onClick={handleSubmit}
        >
          {leaderId ? '提交创建' : '请先申请团长'}
        </Button>
      </View>
    </View>
  )
}
