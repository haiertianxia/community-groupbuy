import Taro from '@tarojs/taro'

const BASE_URL = 'http://localhost:8000/api'

// ═══════════════════════════════════════════════════════════════════════════════
// Types — aligned with FastAPI backend schemas
// ═══════════════════════════════════════════════════════════════════════════════

export interface User {
  id: number
  username: string
  email: string
  phone?: string
  avatar?: string
  role: string
  is_active: boolean
  created_at: string
}

export interface Leader {
  id: number
  user_id: number
  community: string
  district: string
  address: string
  pickup_address?: string
  id_card?: string
  bank_account?: string
  bank_name?: string
  status: 'pending' | 'approved' | 'rejected' | 'disabled'
  commission_rate: number
  total_earnings: number
  total_settled: number
  created_at: string
}

export interface Product {
  id: number
  name: string
  description?: string
  category: string
  images?: string | null
  original_price: number
  cost_price: number
  unit: string
  stock: number
  sales_count: number
  status: string
  rating: number
  created_at: string
  updated_at: string
}

export interface Activity {
  id: number
  product_id: number
  leader_id: number
  group_price: number
  min_participants: number
  max_participants: number
  current_participants: number
  start_time: string
  end_time: string
  status: string // 'pending' | 'active' | 'completed' | 'closed' | 'cancelled'
  description?: string
  created_at: string
  product?: Product
  leader?: Leader | null
}

export interface Order {
  id: number
  order_no: string
  user_id: number
  activity_id: number
  quantity: number
  unit_price: number
  total_amount: number
  commission_amount: number
  status: string // 'pending_payment' | 'paid' | 'shipped' | 'completed' | 'cancelled' | 'refunded'
  paid_at?: string
  refund_reason?: string
  remark?: string
  delivery_type?: string
  receiver_name?: string
  receiver_phone?: string
  address?: string
  created_at: string
  updated_at: string
  activity?: Activity
  product?: Product
}

export interface StatsOverview {
  total_users: number
  total_products: number
  total_activities: number
  total_orders: number
  total_revenue: number
  active_leaders: number
  pending_leaders: number
  pending_activities: number
  today_orders: number
}

// ═══════════════════════════════════════════════════════════════════════════════
// API Client
// ═══════════════════════════════════════════════════════════════════════════════

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
          ...(this.getToken()
            ? { Authorization: `Bearer ${this.getToken()}` }
            : {}),
        },
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const d = res.data
            if (
              d &&
              typeof d === 'object' &&
              'detail' in d &&
              Object.keys(d).length === 1
            ) {
              reject(new Error(d.detail))
            } else {
              resolve(d as T)
            }
          } else if (res.statusCode === 401) {
            this.clearToken()
            Taro.showToast({ title: '请重新登录', icon: 'none' })
            reject(new Error('未授权'))
          } else {
            const msg =
              (res.data as any)?.detail || `请求失败 (${res.statusCode})`
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
    return this.request<{
      access_token: string
      token_type: string
      user_id: number
      role: string
    }>({
      url: '/auth/login',
      method: 'POST',
      data: { email, password },
    })
  }

  async register(username: string, email: string, password: string) {
    return this.request<{
      access_token: string
      token_type: string
      user_id: number
      role: string
    }>({
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
    community: string
    district: string
    address: string
    pickup_address?: string
    id_card?: string
    bank_account?: string
    bank_name?: string
  }): Promise<Leader> {
    return this.request<Leader>({
      url: '/leader/register',
      method: 'POST',
      data,
    })
  }

  async getLeaderProfile(): Promise<Leader> {
    return this.request<Leader>({ url: '/leader/profile' })
  }

  async getLeaderOrders(params?: {
    page?: number
    page_size?: number
  }): Promise<{ items: Order[]; total: number }> {
    const q = new URLSearchParams()
    if (params?.page) q.set('page', String(params.page))
    if (params?.page_size) q.set('page_size', String(params.page_size))
    const qs = q.toString()
    return this.request<{ items: Order[]; total: number }>({
      url: `/leader/orders${qs ? `?${qs}` : ''}`,
    })
  }

  async shipOrder(orderId: number): Promise<Order> {
    return this.request<Order>({
      url: `/leader/orders/${orderId}/ship`,
      method: 'POST',
    })
  }

  // ── Activities ────────────────────────────────────────────────────────────

  async getActivities(params?: {
    status?: string
    page?: number
    page_size?: number
  }): Promise<{
    items: Activity[]
    total: number
    page: number
    page_size: number
  }> {
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

  async createActivity(data: {
    product_id: number
    leader_id: number
    group_price: number
    min_participants?: number
    max_participants?: number
    start_time: string
    end_time: string
    description?: string
  }): Promise<Activity> {
    return this.request<Activity>({
      url: '/activities',
      method: 'POST',
      data,
    })
  }

  // ── Products ──────────────────────────────────────────────────────────────

  async getProducts(params?: {
    category?: string
    search?: string
    page?: number
    page_size?: number
  }): Promise<{
    items: Product[]
    total: number
    page: number
    page_size: number
  }> {
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
  }): Promise<{
    items: Order[]
    total: number
    page: number
    page_size: number
  }> {
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

  async updateOrder(
    id: number,
    data: { status: string; refund_reason?: string }
  ): Promise<Order> {
    return this.request<Order>({
      url: `/orders/${id}`,
      method: 'PUT',
      data,
    })
  }

  // ── Stats ────────────────────────────────────────────────────────────────

  async getStatsOverview(): Promise<StatsOverview> {
    return this.request<StatsOverview>({ url: '/stats/overview' })
  }
}

export const api = new ApiClient()
