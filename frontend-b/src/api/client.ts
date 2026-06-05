import Taro from '@tarojs/taro'

const BASE_URL = 'http://localhost:8000/api'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: number
  username: string
  email: string
  role: string
}

export interface Leader {
  id: number
  user_id: number
  nickname: string
  phone: string
  province: string
  city: string
  district: string
  pickup_address: string
  pickup_hours: string
  level?: number
  total_sales?: number
  rating?: number
  balance?: number
  frozen_balance?: number
  created_at?: string
}

export interface Activity {
  id: number
  activity_name: string
  group_price: string
  original_price: string
  min_people: number
  current_people: number
  max_people: number
  status: number
  start_time: string
  end_time: string
  cover_image?: string
  description?: string
  products?: Product[]
}

export interface Product {
  id: number
  name: string
  category: string
  price: string
  image?: string
  description?: string
}

export interface Order {
  id: number
  order_no: string
  user_id: number
  activity_id: number
  quantity: number
  pay_amount: string
  status: number
  receiver_name: string
  receiver_phone: string
  address: string
  delivery_type: number
  express_company?: string
  express_no?: string
  created_at: string
  updated_at?: string
  refund_reason?: string
  activity?: Activity
  product?: Product
}

export interface StatsOverview {
  today_orders: number
  today_sales: string
  total_orders: number
  total_sales: string
  pending_orders: number
  pending_refunds: number
  balance: string
  frozen_balance: string
}

// ─── API Client ───────────────────────────────────────────────────────────────

class ApiClient {
  private token: string = ''

  setToken(token: string) {
    this.token = token
    try {
      Taro.setStorageSync('token', token)
    } catch {}
  }

  getToken(): string {
    if (!this.token) {
      try {
        this.token = Taro.getStorageSync('token') || ''
      } catch {
        this.token = ''
      }
    }
    return this.token
  }

  clearToken() {
    this.token = ''
    try {
      Taro.removeStorageSync('token')
    } catch {}
  }

  private async request<T = any>(options: {
    url: string
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    data?: any
  }): Promise<T> {
    const { url, method = 'GET', data } = options
    const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`

    return new Promise((resolve, reject) => {
      Taro.request({
        url: fullUrl,
        method,
        data,
        header: {
          'Content-Type': 'application/json',
          ...(this.getToken() ? { Authorization: `Bearer ${this.getToken()}` } : {}),
        },
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            // FastAPI returns data directly or {detail: string} on error
            const d = res.data
            if (d && typeof d === 'object' && 'detail' in d && Object.keys(d).length === 1) {
              reject(new Error(d.detail))
            } else {
              resolve(d as T)
            }
          } else if (res.statusCode === 401) {
            this.clearToken()
            Taro.showToast({ title: '请重新登录', icon: 'none' })
            reject(new Error('未授权'))
          } else {
            const msg = (res.data as any)?.detail || `请求失败 (${res.statusCode})`
            Taro.showToast({ title: msg, icon: 'none' })
            reject(new Error(msg))
          }
        },
        fail: (err) => {
          Taro.showToast({ title: '网络错误', icon: 'none' })
          reject(new Error(err.errMsg || '网络错误'))
        },
      })
    })
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  async login(email: string, password: string) {
    return this.request<{ access_token: string; token_type: string; user_id: number; role: string }>({
      url: '/auth/login',
      method: 'POST',
      data: { email, password },
    })
  }

  async register(username: string, email: string, password: string) {
    return this.request<{ access_token: string; token_type: string; user_id: number; role: string }>({
      url: '/auth/register',
      method: 'POST',
      data: { username, email, password },
    })
  }

  async getMe(): Promise<User> {
    return this.request<User>({ url: '/auth/me' })
  }

  // ── Leader ────────────────────────────────────────────────────────────────

  async registerLeader(data: {
    nickname: string
    phone: string
    province: string
    city: string
    district: string
    pickup_address: string
    pickup_hours: string
  }): Promise<Leader> {
    return this.request<Leader>({ url: '/leader/register', method: 'POST', data })
  }

  async getLeaderProfile(): Promise<Leader> {
    return this.request<Leader>({ url: '/leader/profile' })
  }

  async getLeaderOrders(params?: { page?: number; page_size?: number }): Promise<{ items: Order[]; total: number }> {
    const q = new URLSearchParams()
    if (params?.page) q.set('page', String(params.page))
    if (params?.page_size) q.set('page_size', String(params.page_size))
    const qs = q.toString()
    return this.request<{ items: Order[]; total: number }>({
      url: `/leader/orders${qs ? `?${qs}` : ''}`,
    })
  }

  async shipOrder(orderId: number): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>({
      url: `/leader/orders/${orderId}/ship`,
      method: 'POST',
    })
  }

  // ── Activities ────────────────────────────────────────────────────────────

  async getActivities(params?: {
    status?: string
    page?: number
    page_size?: number
  }): Promise<{ items: Activity[]; total: number; page: number; page_size: number }> {
    const q = new URLSearchParams()
    if (params?.status) q.set('status', params.status)
    if (params?.page) q.set('page', String(params.page))
    if (params?.page_size) q.set('page_size', String(params.page_size))
    const qs = q.toString()
    return this.request({
      url: `/activities${qs ? `?${qs}` : ''}`,
    })
  }

  async getActivity(id: number): Promise<Activity> {
    return this.request<Activity>({ url: `/activities/${id}` })
  }

  async createActivity(data: any): Promise<Activity> {
    return this.request<Activity>({ url: '/activities', method: 'POST', data })
  }

  // ── Products ──────────────────────────────────────────────────────────────

  async getProducts(params?: {
    category?: string
    search?: string
    page?: number
    page_size?: number
  }): Promise<{ items: Product[]; total: number; page: number; page_size: number }> {
    const q = new URLSearchParams()
    if (params?.category) q.set('category', params.category)
    if (params?.search) q.set('search', params.search)
    if (params?.page) q.set('page', String(params.page))
    if (params?.page_size) q.set('page_size', String(params.page_size))
    const qs = q.toString()
    return this.request({
      url: `/products${qs ? `?${qs}` : ''}`,
    })
  }

  async getProduct(id: number): Promise<Product> {
    return this.request<Product>({ url: `/products/${id}` })
  }

  // ── Orders ────────────────────────────────────────────────────────────────

  async getOrders(params?: {
    page?: number
    page_size?: number
  }): Promise<{ items: Order[]; total: number; page: number; page_size: number }> {
    const q = new URLSearchParams()
    if (params?.page) q.set('page', String(params.page))
    if (params?.page_size) q.set('page_size', String(params.page_size))
    const qs = q.toString()
    return this.request({
      url: `/orders${qs ? `?${qs}` : ''}`,
    })
  }

  async getOrder(id: number): Promise<Order> {
    return this.request<Order>({ url: `/orders/${id}` })
  }

  async updateOrder(id: number, data: { status?: number; refund_reason?: string }): Promise<Order> {
    return this.request<Order>({ url: `/orders/${id}`, method: 'PUT', data })
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  async getStatsOverview(): Promise<StatsOverview> {
    return this.request<StatsOverview>({ url: '/stats/overview' })
  }
}

export const api = new ApiClient()