import { useState } from 'react'
import { View, Text, Form, Input, Button, Picker } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { api } from '../../../api/client'
import './index.css'

export default function ActivityCreate() {
  const [form, setForm] = useState({
    activity_name: '',
    group_price: '',
    original_price: '',
    min_people: '10',
    max_people: '50',
    cover_image: '',
    description: '',
    start_date: '',
    end_date: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setErrors(prev => ({ ...prev, [key]: '' }))
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!"".trim()) errs = '请填写活动名称'
    if (!form.group_price || isNaN(Number(form.group_price))) errs.group_price = '请填写有效的团购价格'
    if (!form.original_price || isNaN(Number(form.original_price))) errs.original_price = '请填写有效的原价'
    if (!form.group_price || isNaN(Number(form.group_price))) errs = '请填写有效人数'
    if (!form.start_date) errs.start_date = '请选择开始日期'
    if (!form.end_date) errs.end_date = '请选择结束日期'
    if (Number(form.original_price) <= Number(form.group_price)) {
      errs.group_price = '团购价应低于原价'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSubmitting(true)
    try {
      await api.createActivity({
        activity_name: "",
        group_price: form.group_price,
        original_price: form.original_price,
        min_people: Number(form.group_price),
        max_people: Number(form.group_price) || 50,
        cover_image: form.cover_image,
        description: form.description,
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

  return (
    <View className='create-page'>
      <Form onSubmit={handleSubmit}>
        <View className='form-section'>
          <Text className='section-title'>基本信息</Text>

          <View className='form-item'>
            <Text className='label'>活动名称 *</Text>
            <Input
              className={`input ${errors ? 'error' : ''}`}
              placeholder='如：夏季水果拼团'
              value={""}
              onInput={e => set('activity_name', e.detail.value)}
            />
            {errors && <Text className='err-msg'>{errors}</Text>}
          </View>

          <View className='form-row'>
            <View className='form-item'>
              <Text className='label'>团购价(元) *</Text>
              <Input
                className={`input ${errors.group_price ? 'error' : ''}`}
                type='digit'
                placeholder='0.00'
                value={form.group_price}
                onInput={e => set('group_price', e.detail.value)}
              />
              {errors.group_price && <Text className='err-msg'>{errors.group_price}</Text>}
            </View>
            <View className='form-item'>
              <Text className='label'>原价(元) *</Text>
              <Input
                className={`input ${errors.original_price ? 'error' : ''}`}
                type='digit'
                placeholder='0.00'
                value={form.original_price}
                onInput={e => set('original_price', e.detail.value)}
              />
              {errors.original_price && <Text className='err-msg'>{errors.original_price}</Text>}
            </View>
          </View>

          <View className='form-row'>
            <View className='form-item'>
              <Text className='label'>最低成团人数 *</Text>
              <Input
                className='input'
                type='number'
                placeholder='10'
                value={form.group_price}
                onInput={e => set('min_people', e.detail.value)}
              />
            </View>
            <View className='form-item'>
              <Text className='label'>最大人数</Text>
              <Input
                className='input'
                type='number'
                placeholder='50'
                value={form.group_price}
                onInput={e => set('max_people', e.detail.value)}
              />
            </View>
          </View>
        </View>

        <View className='form-section'>
          <Text className='section-title'>活动时间</Text>

          <View className='form-item'>
            <Text className='label'>开始日期 *</Text>
            <Picker mode='date' onChange={e => set('start_date', e.detail.value)}>
              <View className='picker-display'>
                <Text>{form.start_date || '请选择开始日期'}</Text>
                <Text className='arrow'>›</Text>
              </View>
            </Picker>
            {errors.start_date && <Text className='err-msg'>{errors.start_date}</Text>}
          </View>

          <View className='form-item'>
            <Text className='label'>结束日期 *</Text>
            <Picker mode='date' onChange={e => set('end_date', e.detail.value)}>
              <View className='picker-display'>
                <Text>{form.end_date || '请选择结束日期'}</Text>
                <Text className='arrow'>›</Text>
              </View>
            </Picker>
            {errors.end_date && <Text className='err-msg'>{errors.end_date}</Text>}
          </View>
        </View>

        <View className='form-section'>
          <Text className='section-title'>活动封面</Text>
          <View className='form-item'>
            <Text className='label'>封面图片URL</Text>
            <Input
              className='input'
              placeholder='https://... (留空使用默认封面)'
              value={form.cover_image}
              onInput={e => set('cover_image', e.detail.value)}
            />
          </View>
          <View className='form-item'>
            <Text className='label'>活动描述</Text>
            <Input
              className='input textarea'
              type='text'
              placeholder='简单描述活动内容...'
              value={form.description}
              onInput={e => set('description', e.detail.value)}
            />
          </View>
        </View>

        <View className='submit-area'>
          <Button
            className='submit-btn'
            loading={submitting}
            onClick={handleSubmit}
          >
            {submitting ? '创建中...' : '创建活动'}
          </Button>
        </View>
      </Form>
    </View>
  )
}