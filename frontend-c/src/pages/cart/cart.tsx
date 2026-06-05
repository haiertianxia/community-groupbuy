import { useState } from 'react'
import { View, Text, Image, Navigator, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.css'

// Cart is a placeholder — real cart would use localStorage + zustand
export default function Cart() {
  const [cartItems] = useState<any[]>([])

  return (
    <View className='cart-page'>
      {cartItems.length === 0 ? (
        <View className='empty-state'>
          <Text className='empty-icon'>🛒</Text>
          <Text className='empty-text'>购物车是空的</Text>
          <Navigator url='/pages/index/index' className='go-shop-btn'>
            <Text>去逛逛</Text>
          </Navigator>
        </View>
      ) : (
        <View className='cart-list'>
          {cartItems.map((item) => (
            <View key={item.id} className='cart-item'>
              <Image src={item.image} mode='aspectFill' className='item-img' />
              <View className='item-info'>
                <Text className='item-name'>{item.name}</Text>
                <Text className='item-price'>¥{item.price}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Bottom Bar */}
      {cartItems.length > 0 && (
        <View className='bottom-bar'>
          <Text className='total-price'>合计: ¥0</Text>
          <Button className='checkout-btn'>
            <Text>结算 (0)</Text>
          </Button>
        </View>
      )}
    </View>
  )
}