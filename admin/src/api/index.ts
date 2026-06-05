import axios from 'axios'
import { message } from 'antd'

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_user')
      window.location.href = '/login'
      return Promise.reject(new Error('未登录或登录已过期'))
    }
    const detail =
      error.response?.data?.detail || error.message || '请求失败'
    if (
      error.config?.method !== 'get' ||
      error.response?.status >= 500
    ) {
      message.error(detail)
    }
    return Promise.reject(error)
  }
)

// ═══════════════════════════════════════════════════════════════════════════════
// Types — aligned with FastAPI backend
// ═══════════════════════════════════════════════════════════════════════════════

// ── Auth ────────────────────────────────────────────────────────────────────

export interface LoginForm {
  email: string
  password: string
}

export interface AuthUser {
  id: number
  username: string
  email: string
  phone?: string
  role: string
  is_active: boolean
  created_at: string
}

export interface LoginRes {
  access_token: string
  token_type: string
  user_id: number
  role: string
}

export const authApi = {
  login: (data: LoginForm) => api.post<LoginRes>('/auth/login', data),
  me: () => api.get<AuthUser>('/auth/me'),
}

// ── Stats ───────────────────────────────────────────────────────────────────

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

export const statsApi = {
  overview: () => api.get<StatsOverview>('/stats/overview'),
}

// ── Products ─────────────────────────────────────────────────────────────────

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
  status: string // 'active' | 'disabled' | 'deleted'
  rating: number
  created_at: string
  updated_at: string
}

export interface PaginatedRes<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export const productsApi = {
  list: (params?: {
    status?: string
    page?: number
    page_size?: number
  }) => api.get<PaginatedRes<Product>>('/products', { params }),
  create: (data: {
    name: string
    category: string
    original_price: number
    cost_price?: number
    unit?: string
    stock?: number
    description?: string
  }) => api.post<Product>('/products', data),
  update: (id: number, data: Partial<Product>) =>
    api.put<Product>(`/products/${id}`, data),
}

// ── Activities ───────────────────────────────────────────────────────────────

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
  status: string
  description?: string
  created_at: string
  product?: Product
  leader?: Leader | null
}

export const activitiesApi = {
  list: (params?: {
    status?: string
    page?: number
    page_size?: number
  }) => api.get<PaginatedRes<Activity>>('/activities', { params }),
  create: (data: {
    product_id: number
    leader_id: number
    group_price: number
    min_participants?: number
    max_participants?: number
    start_time: string
    end_time: string
    description?: string
  }) => api.post<Activity>('/activities', data),
  close: (id: number) =>
    api.post<Activity>(`/activities/${id}/close`),
}

// ── Orders ───────────────────────────────────────────────────────────────────

export interface Order {
  id: number
  order_no: string
  user_id: number
  activity_id: number
  quantity: number
  unit_price: number
  total_amount: number
  commission_amount: number
  status: string
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

export const ordersApi = {
  list: (params?: {
    status?: string
    page?: number
    page_size?: number
  }) =>
    api.get<PaginatedRes<Order>>('/orders', { params }),
  detail: (id: number) => api.get<Order>(`/orders/${id}`),
}

// ── Leader ───────────────────────────────────────────────────────────────────

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
  status: string
  commission_rate: number
  total_earnings: number
  total_settled: number
  created_at: string
}

export const leaderApi = {
  profile: () => api.get<Leader>('/leader/profile'),
  updateStatus: (id: number, status: string) =>
    api.put(`/leader/${id}/status`, { status }),
}

export default api
