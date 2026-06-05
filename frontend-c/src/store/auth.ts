import { create } from 'zustand'
import Taro from '@tarojs/taro'
import { api, User } from '../api/client'

interface AuthState {
  user: User | null
  token: string
  isLoggedIn: boolean
  setAuth: (token: string, user: User) => void
  logout: () => void
  checkAuth: () => Promise<boolean>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: api.getUser(),
  token: Taro.getStorageSync('gb_token') || '',
  isLoggedIn: !!Taro.getStorageSync('gb_token'),

  setAuth: (token: string, user: User) => {
    api.setToken(token)
    api.setUser(user)
    set({ user, token, isLoggedIn: true })
  },

  logout: () => {
    api.clearAuth()
    set({ user: null, token: '', isLoggedIn: false })
    Taro.navigateTo({ url: '/pages/login/login' })
  },

  checkAuth: async () => {
    if (!get().token) return false
    try {
      const user = await api.getMe()
      api.setUser(user)
      set({ user })
      return true
    } catch {
      api.clearAuth()
      set({ user: null, token: '', isLoggedIn: false })
      return false
    }
  },
}))