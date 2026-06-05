import Taro from '@tarojs/taro'

const STORAGE_TOKEN = 'gb_token'
const STORAGE_USER = 'gb_user'

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthResponse {
  access_token: string
  token_type: string
  user_id: number
  role: string
}

export interface User {
  id: number
  username: string
  email: string
  role: string
}

// ── Product ──────────────────────────────────────────────────────────────────

export interface Product {
  id: number
  name: string
  category: string
  price: number
  original_price: number
  image: string
  images: string[]
  stock: number
  sales_count: number
  description: string
}

// ── Activity ─────────────────────────────────────────────────────────────────

export type ActivityStatus = 'pending' | 'active' | 'closed' | 'completed'

export interface Activity {
  id: number
  name: string
  description: string
  product_id: number
  product: Product
  group_price: number
  original_price: number
  min_people: number
  current_people: number
  max_people: number
  stock: number
  sold_count: number
  start_time: string
  end_time: string
  status: ActivityStatus
  image: string
  banner_images: string[]
  leader?: Leader
  pickup_address?: string
  pickup_hours?: string
  rule_description?: string
  max_per_user?: number
}

// ── Order ─────────────────────────────────────────────────────────────────────

export type OrderStatus = 'pending_payment' | 'paid' | 'shipped' | 'confirmed' | 'completed' | 'cancelled' | 'refund_pending' | 'refunded'

export interface Order {
  id: number
  activity_id: number
  activity?: Activity
  quantity: number
  total_amount: number
  pay_amount: number
  status: OrderStatus
  receiver_name: string
  receiver_phone: string
  address: string
  delivery_type: 'pickup' | 'delivery'
  created_at: string
  updated_at: string
  refund_reason?: string
  tracking_number?: string
}

// ── Leader ────────────────────────────────────────────────────────────────────

export interface Leader {
  id: number
  user_id: number
  nickname: string
  avatar: string
  phone: string
  province: string
  city: string
  district: string
  pickup_address: string
  pickup_hours: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export interface StatsOverview {
  total_orders: number
  total_users: number
  total_leaders: number
  total_revenue: number
  pending_orders: number
}

// ── API Client ────────────────────────────────────────────────────────────────

class ApiClient {
  private baseUrl = 'http://localhost:8000/api'

  private getToken(): string {
    return Taro.getStorageSync(STORAGE_TOKEN) || ''
  }

  setToken(token: string) {
    Taro.setStorageSync(STORAGE_TOKEN, token)
  }

  getUser(): User | null {
    const raw = Taro.getStorageSync(STORAGE_USER)
    if (!raw) return null
    try { return JSON.parse(raw) } catch { return null }
  }

  setUser(user: User) {
    Taro.setStorageSync(STORAGE_USER, JSON.stringify(user))
  }

  clearAuth() {
    Taro.removeStorageSync(STORAGE_TOKEN)
    Taro.removeStorageSync(STORAGE_USER)
  }

  isLoggedIn(): boolean {
    return !!this.getToken()
  }

  private async request<T = any>(options: {
    url: string
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    data?: any
    silent?: boolean
  }): Promise<T> {
    const { url, method = 'GET', data, silent } = options
    const token = this.getToken()
    const header: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (token) header['Authorization'] = `Bearer ${token}`

    try {
      const res = await Taro.request({
        url: `${this.baseUrl}${url}`,
        method,
        data,
        header,
      })

      if (res.statusCode >= 400) {
        if (res.statusCode === 401) {
          this.clearAuth()
          if (!silent) {
            Taro.showModal({
              title: '提示',
              content: '请先登录',
              confirmText: '去登录',
            }).then(({ confirm }) => {
              if (confirm) Taro.navigateTo({ url: '/pages/login/login' })
            })
          }
        }
        const errMsg = (res.data as any)?.detail || `请求失败 (${res.statusCode})`
        if (!silent) Taro.showToast({ title: errMsg, icon: 'none' })
        throw new Error(errMsg)
      }

      return (res.data as any) as T
    } catch (err: any) {
      if (!silent) {
        Taro.showToast({ title: err.message || '网络请求失败', icon: 'none' })
      }
      throw err
    }
  }

  private navigateToLogin() {
    Taro.showModal({
      title: '提示',
      content: '请先登录',
      confirmText: '去登录',
    }).then(({ confirm }) => {
      if (confirm) Taro.navigateTo({ url: '/pages/login/login' })
    })
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  async register(username: string, email: string, password: string): Promise<AuthResponse> {
    return this.request<AuthResponse>({
      url: '/auth/register',
      method: 'POST',
      data: { username, email, password },
    })
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    return this.request<AuthResponse>({
      url: '/auth/login',
      method: 'POST',
      data: { email, password },
    })
  }

  async getMe(): Promise<User> {
    return this.request<User>({ url: '/auth/me', silent: true })
  }

  // ── Products ───────────────────────────────────────────────────────────────

  async getProducts(params?: {
    category?: string
    search?: string
    page?: number
    page_size?: number
  }): Promise<{ items: Product[]; total: number; page: number; page_size: number }> {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== '') query.set(k, String(v))
      })
    }
    const qs = query.toString()
    return this.request({ url: `/products${qs ? '?' + qs : ''}` })
  }

  async getProduct(id: number): Promise<Product> {
    return this.request<Product>({ url: `/products/${id}` })
  }

  // ── Activities ──────────────────────────────────────────────────────────────

  async getActivities(params?: {
    status?: string
    page?: number
    page_size?: number
  }): Promise<{ items: Activity[]; total: number; page: number; page_size: number }> {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== '') query.set(k, String(v))
      })
    }
    const qs = query.toString()
    return this.request({ url: `/activities${qs ? '?' + qs : ''}` })
  }

  async getActivity(id: number): Promise<Activity> {
    return this.request<Activity>({ url: `/activities/${id}` })
  }

  // ── Orders ──────────────────────────────────────────────────────────────────

  async createOrder(data: {
    activity_id: number
    quantity: number
    receiver_name: string
    receiver_phone: string
    address: string
    delivery_type: 'pickup' | 'delivery'
  }): Promise<Order> {
    return this.request<Order>({ url: '/orders', method: 'POST', data })
  }

  async getOrders(params?: {
    page?: number
    page_size?: number
  }): Promise<{ items: Order[]; total: number; page: number; page_size: number }> {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined) query.set(k, String(v))
      })
    }
    const qs = query.toString()
    return this.request({ url: `/orders${qs ? '?' + qs : ''}` })
  }

  async getOrder(id: number): Promise<Order> {
    return this.request<Order>({ url: `/orders/${id}` })
  }

  async updateOrderStatus(
    id: number,
    data: { status: string; refund_reason?: string }
  ): Promise<Order> {
    return this.request<Order>({ url: `/orders/${id}`, method: 'PUT', data })
  }

  // ── Leader ─────────────────────────────────────────────────────────────────

  async registerAsLeader(data: {
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
    return this.request<Leader>({ url: '/leader/profile', silent: true })
  }

  async getLeaderOrders(params?: {
    page?: number
    page_size?: number
  }): Promise<{ items: Order[]; total: number }> {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined) query.set(k, String(v))
      })
    }
    const qs = query.toString()
    return this.request({ url: `/leader/orders${qs ? '?' + qs : ''}` })
  }

  async shipOrder(orderId: number): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>({
      url: `/leader/orders/${orderId}/ship`,
      method: 'POST',
    })
  }

  // ── Stats ──────────────────────────────────────────────────────────────────

  async getStats(): Promise<StatsOverview> {
    return this.request<StatsOverview>({ url: '/stats/overview' })
  }
}

export const api = new ApiClient()