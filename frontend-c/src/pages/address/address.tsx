import { useState, useEffect } from 'react'
import { View, Text, Navigator } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.css'

interface Address {
  id: number
  consignee: string
  phone: string
  province: string
  city: string
  district: string
  address: string
  is_default: boolean
  label: string
}

// Mock addresses for demo
const MOCK_ADDRESSES: Address[] = [
  {
    id: 1,
    consignee: '张三',
    phone: '13800138000',
    province: '广东省',
    city: '深圳市',
    district: '南山区',
    address: '科技园南路XX号',
    is_default: true,
    label: '家',
  },
]

export default function AddressList() {
  const [addresses, setAddresses] = useState<Address[]>(MOCK_ADDRESSES)

  const handleSelect = (addr: Address) => {
    const pages = Taro.getCurrentPages()
    const prev = pages[pages.length - 2]
    if (prev && (prev as any).route?.includes('checkout')) {
      // Set selected address
      Taro.navigateBack()
    }
  }

  return (
    <View className='address-page'>
      {addresses.length === 0 ? (
        <View className='empty-state'>
          <Text className='empty-text'>暂无收货地址</Text>
        </View>
      ) : (
        addresses.map(addr => (
          <View key={addr.id} className='address-card' onClick={() => handleSelect(addr)}>
            <View className='addr-main'>
              <Text className='consignee'>{addr.consignee} {addr.phone}</Text>
              <Text className='addr-detail'>
                {addr.province} {addr.city} {addr.district} {addr.address}
              </Text>
            </View>
            <View className='addr-actions'>
              {addr.is_default && <Text className='default-tag'>默认</Text>}
              <Navigator
                url={`/pages/address/edit/edit?id=${addr.id}`}
                className='edit-btn'
                onClick={(e: any) => e.stopPropagation()}
              >
                <Text>编辑</Text>
              </Navigator>
            </View>
          </View>
        ))
      )}

      {/* Add Button */}
      <View className='bottom-bar'>
        <Navigator url='/pages/address/edit/edit' className='add-btn'>
          <Text>+ 添加收货地址</Text>
        </Navigator>
      </View>
    </View>
  )
}