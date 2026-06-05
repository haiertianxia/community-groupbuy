import { useState } from 'react'
import { View, Text, Input, Button, Switch } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.css'

export default function AddressEdit() {
  const [consignee, setConsignee] = useState('')
  const [phone, setPhone] = useState('')
  const [province, setProvince] = useState('')
  const [city, setCity] = useState('')
  const [district, setDistrict] = useState('')
  const [detail, setDetail] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!consignee.trim() || !phone.trim() || !province.trim() || !city.trim() || !detail.trim()) {
      Taro.showToast({ title: '请填写完整信息', icon: 'none' })
      return
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      Taro.showToast({ title: '手机号格式错误', icon: 'none' })
      return
    }

    setSaving(true)
    try {
      // In a real app, call the address API
      // For now, just simulate success
      await new Promise(r => setTimeout(r, 500))
      Taro.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => Taro.navigateBack(), 1000)
    } catch (e: any) {
      Taro.showToast({ title: e.message || '保存失败', icon: 'none' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <View className='address-edit-page'>
      <View className='form-section'>
        <View className='form-row'>
          <Text className='row-label'>收货人</Text>
          <Input
            className='row-input'
            placeholder='请输入收货人姓名'
            value={consignee}
            onInput={(e: any) => setConsignee(e.detail.value)}
          />
        </View>
        <View className='form-row'>
          <Text className='row-label'>手机号</Text>
          <Input
            className='row-input'
            type='number'
            placeholder='请输入手机号'
            value={phone}
            onInput={(e: any) => setPhone(e.detail.value)}
            maxLength={11}
          />
        </View>
        <View className='form-row'>
          <Text className='row-label'>省份</Text>
          <Input
            className='row-input'
            placeholder='如：广东省'
            value={province}
            onInput={(e: any) => setProvince(e.detail.value)}
          />
        </View>
        <View className='form-row'>
          <Text className='row-label'>城市</Text>
          <Input
            className='row-input'
            placeholder='如：深圳市'
            value={city}
            onInput={(e: any) => setCity(e.detail.value)}
          />
        </View>
        <View className='form-row'>
          <Text className='row-label'>区县</Text>
          <Input
            className='row-input'
            placeholder='如：南山区'
            value={district}
            onInput={(e: any) => setDistrict(e.detail.value)}
          />
        </View>
        <View className='form-row'>
          <Text className='row-label'>详细地址</Text>
          <Input
            className='row-input'
            placeholder='请输入详细地址'
            value={detail}
            onInput={(e: any) => setDetail(e.detail.value)}
          />
        </View>
        <View className='form-row default-row'>
          <Text className='row-label'>设为默认</Text>
          <Switch
            checked={isDefault}
            onChange={(e: any) => setIsDefault(e.detail.value)}
            color='#ff6b35'
          />
        </View>
      </View>

      <View className='save-section'>
        <Button className='save-btn' loading={saving} onClick={handleSave}>
          保存地址
        </Button>
      </View>
    </View>
  )
}