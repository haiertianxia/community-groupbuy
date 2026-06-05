import { useState, useEffect } from 'react'
import { View, Text, Input, Button, Navigator } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { api, Leader } from '../../../api/client'
import './index.css'

export default function SettingsPage() {
  const [leader, setLeader] = useState<Leader | null>(null)
  const [form, setForm] = useState({
    nickname: '',
    phone: '',
    province: '',
    city: '',
    district: '',
    pickup_address: '',
    pickup_hours: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api.getLeaderProfile()
      .then(l => {
        setLeader(l)
        setForm({
          nickname: l.nickname || '',
          phone: l.phone || '',
          province: l.province || '',
          city: l.city || '',
          district: l.district || '',
          pickup_address: l.pickup_address || '',
          pickup_hours: l.pickup_hours || '',
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const setField = (key: string, val: string) => {
    setForm(prev => ({ ...prev, [key]: val }))
    setSaved(false)
  }

  const handleSave = async () => {
    if (!form.nickname.trim()) {
      Taro.showToast({ title: '请填写昵称', icon: 'none' })
      return
    }
    if (!form.phone.trim()) {
      Taro.showToast({ title: '请填写手机号', icon: 'none' })
      return
    }
    setSaving(true)
    try {
      const updated = await api.registerLeader(form)
      setLeader(updated)
      Taro.showToast({ title: '保存成功', icon: 'success' })
      setSaved(true)
    } catch (e: any) {
      Taro.showToast({ title: e.message || '保存失败', icon: 'none' })
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    const confirm = await Taro.showModal({
      title: '退出登录',
      content: '确定要退出当前账号吗？',
    })
    if (!confirm.confirm) return
    api.clearToken()
    Taro.clearStorageSync()
    Taro.reLaunch({ url: '/pages/login/login' }).catch(() => {
      Taro.showToast({ title: '已退出', icon: 'none' })
    })
  }

  if (loading) {
    return (
      <View className='settings-page loading-state'>
        <Text>加载中...</Text>
      </View>
    )
  }

  return (
    <View className='settings-page'>
      {/* Profile Header */}
      <View className='profile-header'>
        <View className='profile-avatar'>
          <Text className='avatar-emoji'>👤</Text>
        </View>
        <Text className='profile-nickname'>{leader?.nickname || '团长'}</Text>
        {leader?.province && (
          <Text className='profile-location'>{leader.province} {leader.city}</Text>
        )}
      </View>

      {/* Edit Form */}
      <View className='form-section'>
        <View className='form-section-title'>个人信息</View>

        <View className='form-item'>
          <Text className='form-label'>昵称 *</Text>
          <Input
            className='form-input'
            placeholder='请输入昵称'
            value={form.nickname}
            onInput={e => setField('nickname', e.detail.value)}
          />
        </View>

        <View className='form-item'>
          <Text className='form-label'>手机号 *</Text>
          <Input
            className='form-input'
            type='phone'
            placeholder='请输入手机号'
            value={form.phone}
            onInput={e => setField('phone', e.detail.value)}
          />
        </View>

        <View className='form-item'>
          <Text className='form-label'>省份</Text>
          <Input
            className='form-input'
            placeholder='如：广东省'
            value={form.province}
            onInput={e => setField('province', e.detail.value)}
          />
        </View>

        <View className='form-row'>
          <View className='form-item'>
            <Text className='form-label'>城市</Text>
            <Input
              className='form-input'
              placeholder='如：深圳市'
              value={form.city}
              onInput={e => setField('city', e.detail.value)}
            />
          </View>
          <View className='form-item'>
            <Text className='form-label'>区县</Text>
            <Input
              className='form-input'
              placeholder='如：南山区'
              value={form.district}
              onInput={e => setField('district', e.detail.value)}
            />
          </View>
        </View>
      </View>

      <View className='form-section'>
        <View className='form-section-title'>提货点信息</View>

        <View className='form-item'>
          <Text className='form-label'>提货地址</Text>
          <Input
            className='form-input'
            placeholder='详细地址'
            value={form.pickup_address}
            onInput={e => setField('pickup_address', e.detail.value)}
          />
        </View>

        <View className='form-item'>
          <Text className='form-label'>营业时间</Text>
          <Input
            className='form-input'
            placeholder='如：09:00-21:00'
            value={form.pickup_hours}
            onInput={e => setField('pickup_hours', e.detail.value)}
          />
        </View>
      </View>

      <View className='save-area'>
        <Button
          className={`save-btn ${saved ? 'saved' : ''}`}
          loading={saving}
          onClick={handleSave}
        >
          {saved ? '✓ 已保存' : '保存修改'}
        </Button>
      </View>

      {/* Danger Zone */}
      <View className='danger-zone'>
        <Button className='logout-btn' onClick={handleLogout}>
          退出登录
        </Button>
      </View>

      <View className='version-info'>
        <Text>团长工作台 v1.0.0</Text>
      </View>
    </View>
  )
}