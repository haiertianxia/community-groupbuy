import { useState, useEffect } from 'react'
import { View, Text, Input, Button, Navigator } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { api, Leader } from '../../api/client'
import { useAuthStore } from '../../store/auth'
import './index.css'

export default function LeaderPage() {
  const { isLoggedIn } = useAuthStore()
  const [leader, setLeader] = useState<Leader | null>(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)

  // Form
  const [nickname, setNickname] = useState('')
  const [phone, setPhone] = useState('')
  const [province, setProvince] = useState('')
  const [city, setCity] = useState('')
  const [district, setDistrict] = useState('')
  const [pickupAddress, setPickupAddress] = useState('')
  const [pickupHours, setPickupHours] = useState('')
  const [step, setStep] = useState<'loading' | 'registered' | 'apply' | 'pending'>('loading')

  useEffect(() => {
    if (!isLoggedIn) {
      Taro.navigateTo({ url: '/pages/login/login' })
      return
    }
    loadProfile()
  }, [])

  const loadProfile = async () => {
    setLoading(true)
    try {
      const data = await api.getLeaderProfile()
      setLeader(data)
      setStep(data.status === 'approved' ? 'registered' : 'pending')
    } catch {
      setStep('apply')
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async () => {
    if (!nickname.trim() || !phone.trim() || !pickupAddress.trim()) {
      Taro.showToast({ title: '请填写完整信息', icon: 'none' })
      return
    }
    setApplying(true)
    try {
      await api.registerAsLeader({
        nickname: nickname.trim(),
        phone: phone.trim(),
        province: province.trim() || '未知',
        city: city.trim() || '未知',
        district: district.trim() || '未知',
        pickup_address: pickupAddress.trim(),
        pickup_hours: pickupHours.trim() || '9:00-21:00',
      })
      Taro.showToast({ title: '申请已提交', icon: 'success' })
      setStep('pending')
    } catch (e: any) {
      Taro.showToast({ title: e.message || '申请失败', icon: 'none' })
    } finally {
      setApplying(false)
    }
  }

  if (loading) {
    return (
      <View className='loading-page'>
        <Text>加载中...</Text>
      </View>
    )
  }

  return (
    <View className='leader-page'>
      {step === 'registered' && leader && (
        <View className='registered-section'>
          <View className='success-header'>
            <Text className='success-icon'>🎉</Text>
            <Text className='success-title'>您已成为团长</Text>
          </View>
          <View className='leader-card'>
            <View className='leader-info-row'>
              <Text className='info-label'>昵称</Text>
              <Text className='info-value'>{leader.nickname}</Text>
            </View>
            <View className='leader-info-row'>
              <Text className='info-label'>提货点</Text>
              <Text className='info-value'>{leader.pickup_address}</Text>
            </View>
            <View className='leader-info-row'>
              <Text className='info-label'>营业时间</Text>
              <Text className='info-value'>{leader.pickup_hours}</Text>
            </View>
            <View className='leader-info-row'>
              <Text className='info-label'>服务区域</Text>
              <Text className='info-value'>{leader.province} {leader.city} {leader.district}</Text>
            </View>
          </View>

          <Navigator url='/pages/leader/orders' className='orders-btn'>
            <Text>查看我的订单</Text>
          </Navigator>
        </View>
      )}

      {step === 'pending' && (
        <View className='pending-section'>
          <Text className='pending-icon'>⏰</Text>
          <Text className='pending-title'>申请已提交</Text>
          <Text className='pending-desc'>我们将在1-3个工作日内审核您的申请，请耐心等待</Text>
          <Button className='check-btn' onClick={loadProfile}>刷新状态</Button>
        </View>
      )}

      {step === 'apply' && (
        <View className='apply-section'>
          <View className='apply-header'>
            <Text className='apply-title'>申请成为团长</Text>
            <Text className='apply-desc'>成为团长后可发起团购活动，享受佣金返利</Text>
          </View>

          <View className='form-section'>
            <View className='form-row'>
              <Text className='row-label'>团长昵称</Text>
              <Input
                className='row-input'
                placeholder='设置您的昵称'
                value={nickname}
                onInput={(e: any) => setNickname(e.detail.value)}
              />
            </View>
            <View className='form-row'>
              <Text className='row-label'>手机号</Text>
              <Input
                className='row-input'
                type='number'
                placeholder='您的联系电话'
                value={phone}
                onInput={(e: any) => setPhone(e.detail.value)}
                maxLength={11}
              />
            </View>
            <View className='form-row'>
              <Text className='row-label'>省份</Text>
              <Input
                className='row-input'
                placeholder='所在省份'
                value={province}
                onInput={(e: any) => setProvince(e.detail.value)}
              />
            </View>
            <View className='form-row'>
              <Text className='row-label'>城市</Text>
              <Input
                className='row-input'
                placeholder='所在城市'
                value={city}
                onInput={(e: any) => setCity(e.detail.value)}
              />
            </View>
            <View className='form-row'>
              <Text className='row-label'>区县</Text>
              <Input
                className='row-input'
                placeholder='所在区县'
                value={district}
                onInput={(e: any) => setDistrict(e.detail.value)}
              />
            </View>
            <View className='form-row'>
              <Text className='row-label'>提货地址</Text>
              <Input
                className='row-input'
                placeholder='小区/写字楼名称'
                value={pickupAddress}
                onInput={(e: any) => setPickupAddress(e.detail.value)}
              />
            </View>
            <View className='form-row'>
              <Text className='row-label'>营业时间</Text>
              <Input
                className='row-input'
                placeholder='如：9:00-21:00'
                value={pickupHours}
                onInput={(e: any) => setPickupHours(e.detail.value)}
              />
            </View>
          </View>

          <View className='submit-section'>
            <Button className='submit-btn' loading={applying} onClick={handleApply}>
              提交申请
            </Button>
          </View>
        </View>
      )}
    </View>
  )
}
