import Taro from '@tarojs/taro'

const STORAGE_TOKEN = 'gb_token'
const STORAGE_USER = 'gb_user'

// ═══════════════════════════════════════════════════════════════════════════════
// Types — aligned with FastAPI backend schemas
// ═══════════════════════════════════════════════════════════════════════════════

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
  phone?: string
  avatar?: string
  is_active: boolean
  created_at: string
}

export interface Product {
  id: number
  name: string
  description?: string
  category: string
  images?: string | null // JSON array string or null
  original_price: number
  cost_price: number
  unit: string
  stock: number
  sales_count: number
  status: string // 'active' | 'disabled' | 'deleted'
  rating: number
  created_at: string
  updated_at: string
}

export type ActivityStatus = 'pending' | 'active' | 'completed' | 'closed' | 'cancelled'

export interface Activity {
  id: number
  product_id: number
  leader_id: number
  product?: Product
  leader?: Leader | null
  group_price: number
  min_participants: number
  max_participants: number
  current_participants: number
  start_time: string
  end_time: string
  status: ActivityStatus
  description?: string
  created_at: string
}

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'shipped'
  | 'completed'
  | 'cancelled'
  | 'refunded'

export interface Order {
  id: number
  order_no: string
  user_id: number
  activity_id: number
  quantity: number
  unit_price: number
  total_amount: number
  commission_amount: number
  status: OrderStatus
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
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
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
              content: '登录已过期，请重新登录',
              confirmText: '去登录',
            }).then(({ confirm }) => {
              if (confirm)
                Taro.navigateTo({ url: '/pages/login/login' })
            })
          }
        }
        const errMsg =
          (res.data as any)?.detail || `请求失败 (${res.statusCode})`
        if (!silent) Taro.showToast({ title: errMsg, icon: 'none' })
        throw new Error(errMsg)
      }

      return res.data as T
    } catch (err: any) {
      if (!silent) {
        Taro.showToast({
          title: err.message || '网络请求失败',
          icon: 'none',
        })
      }
      throw err
    }
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  async register(
    username: string,
    email: string,
    password: string
  ): Promise<AuthResponse> {
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

  // ── Products ─────────────────────────────────────────────────────────────

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
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== '') query.set(k, String(v))
      })
    }
    const qs = query.toString()
    return this.request({
      url: `/products${qs ? '?' + qs : ''}`,
    })
  }

  async getProduct(id: number): Promise<Product> {
    return this.request<Product>({ url: `/products/${id}` })
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
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== '') query.set(k, String(v))
      })
    }
    const qs = query.toString()
    return this.request({
      url: `/activities${qs ? '?' + qs : ''}`,
    })
  }

  async getActivity(id: number): Promise<Activity> {
    return this.request<Activity>({ url: `/activities/${id}` })
  }

  // ── Orders ────────────────────────────────────────────────────────────────

  async createOrder(data: {
    activity_id: number
    quantity: number
    receiver_name: string
    receiver_phone: string
    remark?: string
    address?: string
    delivery_type?: string
  }): Promise<Order> {
    return this.request<Order>({ url: '/orders', method: 'POST', data })
  }

  async getOrders(params?: {
    status?: string
    page?: number
    page_size?: number
  }): Promise<{
    items: Order[]
    total: number
    page: number
    page_size: number
  }> {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined) query.set(k, String(v))
      })
    }
    const qs = query.toString()
    return this.request({
      url: `/orders${qs ? '?' + qs : ''}`,
    })
  }

  async getOrder(id: number): Promise<Order> {
    return this.request<Order>({ url: `/orders/${id}` })
  }

  async updateOrderStatus(
    id: number,
    data: { status: string; refund_reason?: string }
  ): Promise<Order> {
    return this.request<Order>({
      url: `/orders/${id}`,
      method: 'PUT',
      data,
    })
  }

  // ── Leader ───────────────────────────────────────────────────────────────

  async registerAsLeader(data: {
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
    return this.request({
      url: `/leader/orders${qs ? '?' + qs : ''}`,
    })
  }

  async shipOrder(orderId: number): Promise<Order> {
    return this.request<Order>({
      url: `/leader/orders/${orderId}/ship`,
      method: 'POST',
    })
  }

  // ── Stats ────────────────────────────────────────────────────────────────

  async getStats(): Promise<StatsOverview> {
    return this.request<StatsOverview>({ url: '/stats/overview' })
  }
}

export const api = new ApiClient()
