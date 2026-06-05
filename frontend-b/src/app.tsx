import { ComponentType } from 'react'
import { useEffect } from 'react'
import Taro from '@tarojs/taro'
import './app.css'

interface AppProps {
  children?: React.ReactNode
}

function App({ children }: AppProps) {
  useEffect(() => {
    // Auto-login from stored token
    const token = Taro.getStorageSync('token')
    if (token) {
      // Token will be picked up by api client
    }
  }, [])

  return children as ComponentType<AppProps>
}

export default App