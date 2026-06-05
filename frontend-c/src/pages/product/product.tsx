import { useState, useEffect } from 'react'
import { View, Text, Image, Button, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { api, Product } from '../../api/client'
import './index.css'

export default function ProductDetail() {
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const pages = Taro.getCurrentPages()
    const current = pages[pages.length - 1]
    const id = Number((current as any).options?.id)
    if (!id) {
      Taro.showToast({ title: '商品不存在', icon: 'none' })
      return
    }
    loadProduct(id)
  }, [])

  const loadProduct = async (id: number) => {
    setLoading(true)
    try {
      const data = await api.getProduct(id)
      setProduct(data)
    } catch (e) {
      console.error(e)
      Taro.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <View className='loading-page'>
        <Text>加载中...</Text>
      </View>
    )
  }

  if (!product) {
    return (
      <View className='loading-page'>
        <Text>商品不存在</Text>
      </View>
    )
  }

  const images = product.images?.length ? product.images : [product.image || `https://picsum.photos/750/750?random=${product.id}`]

  return (
    <View className='product-page'>
      <ScrollView scrollY className='product-scroll'>
        {/* Images */}
        <View className='image-section'>
          {images.map((img, idx) => (
            <Image key={idx} src={img} mode='widthFix' className='product-image' />
          ))}
        </View>

        {/* Info */}
        <View className='info-section'>
          <View className='price-row'>
            <Text className='sale-price'>¥{product.price}</Text>
            {product.original_price > product.price && (
              <Text className='orig-price'>¥{product.original_price}</Text>
            )}
          </View>
          <Text className='product-name'>{product.name}</Text>
          <View className='product-meta'>
            <Text className='meta-text'>库存: {product.stock}</Text>
            <Text className='meta-text'>销量: {product.sales_count}</Text>
            <Text className='meta-text'>分类: {product.category}</Text>
          </View>
        </View>

        {/* Description */}
        {product.description && (
          <View className='desc-section'>
            <Text className='section-title'>商品详情</Text>
            <Text className='desc-text'>{product.description}</Text>
          </View>
        )}

        <View className='bottom-spacer' />
      </ScrollView>

      {/* Bottom Bar */}
      <View className='bottom-bar'>
        <View className='action-btns'>
          <View className='action-btn' onClick={() => Taro.switchTab({ url: '/pages/index/index' })}>
            <Text className='action-icon'>🏠</Text>
            <Text className='action-label'>首页</Text>
          </View>
          <View className='action-btn' onClick={() => Taro.switchTab({ url: '/pages/cart/cart' })}>
            <Text className='action-icon'>🛒</Text>
            <Text className='action-label'>购物车</Text>
          </View>
        </View>
        <Button
          className='buy-btn'
          onClick={() => {
            // Navigate to an active activity for this product
            Taro.navigateTo({ url: '/pages/index/index' })
          }}
        >
          <Text>参与团购</Text>
        </Button>
      </View>
    </View>
  )
}