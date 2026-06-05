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
  const [community, setCommunity] = useState('')
  const [district, setDistrict] = useState('')
  const [address, setAddress] = useState('')
  const [pickupAddress, setPickupAddress] = useState('')
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
    if (!community.trim() || !address.trim()) {
      Taro.showToast({ title: '请填写小区和详细地址', icon: 'none' })
      return
    }
    setApplying(true)
    try {
      await api.registerAsLeader({
        community: community.trim(),
        district: district.trim() || '未知',
        address: address.trim(),
        pickup_address: pickupAddress.trim() || undefined,
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
              <Text className='info-label'>小区</Text>
              <Text className='info-value'>{leader.community}</Text>
            </View>
            <View className='leader-info-row'>
              <Text className='info-label'>区域</Text>
              <Text className='info-value'>{leader.district}</Text>
            </View>
            <View className='leader-info-row'>
              <Text className='info-label'>地址</Text>
              <Text className='info-value'>{leader.address}</Text>
            </View>
            {leader.pickup_address && (
              <View className='leader-info-row'>
                <Text className='info-label'>提货点</Text>
                <Text className='info-value'>{leader.pickup_address}</Text>
              </View>
            )}
            {leader.commission_rate > 0 && (
              <View className='leader-info-row'>
                <Text className='info-label'>佣金比例</Text>
                <Text className='info-value'>{leader.commission_rate}%</Text>
              </View>
            )}
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
              <Text className='row-label'>所在小区 *</Text>
              <Input
                className='row-input'
                placeholder='小区名称'
                value={community}
                onInput={(e: any) => setCommunity(e.detail.value)}
              />
            </View>
            <View className='form-row'>
              <Text className='row-label'>地区</Text>
              <Input
                className='row-input'
                placeholder='所在区县'
                value={district}
                onInput={(e: any) => setDistrict(e.detail.value)}
              />
            </View>
            <View className='form-row'>
              <Text className='row-label'>详细地址 *</Text>
              <Input
                className='row-input'
                placeholder='街道/门牌号'
                value={address}
                onInput={(e: any) => setAddress(e.detail.value)}
              />
            </View>
            <View className='form-row'>
              <Text className='row-label'>提货地址</Text>
              <Input
                className='row-input'
                placeholder='自提点（选填）'
                value={pickupAddress}
                onInput={(e: any) => setPickupAddress(e.detail.value)}
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
