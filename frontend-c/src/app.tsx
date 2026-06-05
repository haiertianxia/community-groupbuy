import { ComponentType } from 'react'
import { useEffect } from 'react'
import Taro from '@tarojs/taro'
import { useAuthStore } from './store/auth'
import './app.css'

interface AppProps {
  children?: React.ReactNode
}

function App({ children }: AppProps) {
  const { checkAuth } = useAuthStore()

  useEffect(() => {
    // Check auth on app launch
    checkAuth()
  }, [])

  // Sync tabBar badge on launch
  useEffect(() => {
    const updateBadge = async () => {
      // Could check pending order count and set badge
    }
    updateBadge()
  }, [])

  return children as ComponentType<AppProps>
}

export default App