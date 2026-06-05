import { useState, useEffect } from 'react'
import { View, Text, Image, ScrollView, Navigator, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { api, Product } from '../../api/client'
import './index.css'

const CATEGORIES = [
  { id: 'all', name: '全部' },
  { id: 'fruits', name: '水果' },
  { id: 'vegetables', name: '蔬菜' },
  { id: 'meat', name: '肉禽' },
  { id: 'seafood', name: '海鲜' },
  { id: 'dairy', name: '乳品' },
  { id: 'snacks', name: '零食' },
  { id: 'grain', name: '粮油' },
  { id: 'home', name: '家居' },
]

export default function Category() {
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadProducts()
  }, [activeCategory])

  const loadProducts = async (keyword?: string) => {
    setLoading(true)
    try {
      const res = await api.getProducts({
        category: activeCategory === 'all' ? undefined : activeCategory,
        search: keyword || searchKeyword || undefined,
        page: 1,
        page_size: 50,
      })
      setProducts(res.items || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    loadProducts(searchKeyword)
  }

  return (
    <View className='category-page'>
      {/* Search Bar */}
      <View className='search-bar'>
        <Input
          className='search-input'
          placeholder='搜索商品...'
          value={searchKeyword}
          onConfirm={handleSearch}
          onInput={(e: any) => setSearchKeyword(e.detail.value)}
        />
        <View className='search-btn' onClick={handleSearch}>
          <Text>搜索</Text>
        </View>
      </View>

      <View className='category-body'>
        {/* Left: Category List */}
        <ScrollView scrollY className='category-sidebar'>
          {CATEGORIES.map(cat => (
            <View
              key={cat.id}
              className={`sidebar-item ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              <Text>{cat.name}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Right: Product Grid */}
        <ScrollView scrollY className='product-grid-wrap'>
          {products.length === 0 && !loading && (
            <View className='empty-state'>
              <Text className='empty-text'>暂无商品</Text>
            </View>
          )}

          <View className='product-grid'>
            {products.map(product => (
              <Navigator
                key={product.id}
                url={`/pages/product/product?id=${product.id}`}
                className='product-card'
              >
                <Image
                  src={product.images?.[0] || product.image || `https://picsum.photos/300/300?random=${product.id}`}
                  mode='aspectFill'
                  className='product-img'
                />
                <View className='product-info'>
                  <Text className='product-name' numberOfLines={2}>{product.name}</Text>
                  <View className='product-price'>
                    <Text className='sale-price'>¥{product.price}</Text>
                    {product.original_price > product.price && (
                      <Text className='orig-price'>¥{product.original_price}</Text>
                    )}
                  </View>
                </View>
              </Navigator>
            ))}
          </View>

          {loading && <View className='loading-tip'><Text>加载中...</Text></View>}
        </ScrollView>
      </View>
    </View>
  )
}