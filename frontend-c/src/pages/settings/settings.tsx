import { View, Text, Navigator } from '@tarojs/components'
import './index.css'

export default function Settings() {
  return (
    <View className='settings-page'>
      <View className='menu-section'>
        {[
          { label: '清除缓存', icon: '🗑️', action: 'clearCache' },
          { label: '隐私政策', icon: '🔒', url: '/pages/privacy/privacy' },
          { label: '用户协议', icon: '📄', url: '/pages/agreement/agreement' },
          { label: '关于我们', icon: 'ℹ️', url: '/pages/about/about' },
        ].map((item, idx) => (
          <View key={idx} className='menu-item'>
            <Text className='menu-icon'>{item.icon}</Text>
            <Text className='menu-label'>{item.label}</Text>
            <Text className='menu-arrow'>›</Text>
          </View>
        ))}
      </View>
    </View>
  )
}