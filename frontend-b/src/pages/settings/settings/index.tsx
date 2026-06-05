import { useState, useEffect } from 'react'
import { View, Text, Input, Button, Navigator } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { api, Leader } from '../../../api/client'
import './index.css'

export default function SettingsPage() {
  const [leader, setLeader] = useState<Leader | null>(null)
  const [form, setForm] = useState({
    community: '',
    district: '',
    address: '',
    pickup_address: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api.getLeaderProfile()
      .then(l => {
        setLeader(l)
        setForm({
          community: l.community || '',
          district: l.district || '',
          address: l.address || '',
          pickup_address: l.pickup_address || '',
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
    if (!form.community.trim()) {
      Taro.showToast({ title: '请填写小区名称', icon: 'none' })
      return
    }
    if (!form.address.trim()) {
      Taro.showToast({ title: '请填写详细地址', icon: 'none' })
      return
    }
    setSaving(true)
    try {
      const updated = await api.registerLeader({
        community: form.community.trim(),
        district: form.district.trim() || '未知',
        address: form.address.trim(),
        pickup_address: form.pickup_address.trim() || undefined,
      })
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
        <Text className='profile-nickname'>{leader?.community || '团长'}</Text>
        {leader?.district && (
          <Text className='profile-location'>{leader.district}</Text>
        )}
      </View>

      {/* Edit Form */}
      <View className='form-section'>
        <View className='form-section-title'>团长信息</View>

        <View className='form-item'>
          <Text className='form-label'>小区 *</Text>
          <Input
            className='form-input'
            placeholder='请输入小区名称'
            value={form.community}
            onInput={e => setField('community', e.detail.value)}
          />
        </View>

        <View className='form-item'>
          <Text className='form-label'>地区</Text>
          <Input
            className='form-input'
            placeholder='如：朝阳区'
            value={form.district}
            onInput={e => setField('district', e.detail.value)}
          />
        </View>

        <View className='form-item'>
          <Text className='form-label'>地址 *</Text>
          <Input
            className='form-input'
            placeholder='详细门牌号'
            value={form.address}
            onInput={e => setField('address', e.detail.value)}
          />
        </View>

        <View className='form-item'>
          <Text className='form-label'>提货点</Text>
          <Input
            className='form-input'
            placeholder='自提点地址（选填）'
            value={form.pickup_address}
            onInput={e => setField('pickup_address', e.detail.value)}
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
