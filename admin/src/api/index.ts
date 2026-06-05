import axios from 'axios'
import { message } from 'antd'
import { useNavigate } from 'react-router-dom'

// Create axios instance
const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor — attach JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor — handle 401 / errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_user')
      window.location.href = '/login'
      return Promise.reject(new Error('未登录或登录已过期'))
    }
    const detail = error.response?.data?.detail || error.message || '请求失败'
    if (error.config?.method !== 'get' || error.response?.status >= 500) {
      message.error(detail)
    }
    return Promise.reject(error)
  }
)

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface LoginForm {
  email: string
  password: string
}

export interface AuthUser {
  id: number
  username: string
  email: string
  role: string
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

// ─── Stats ───────────────────────────────────────────────────────────────────

export interface StatsOverview {
  total_users: number
  total_leaders: number
  total_orders: number
  total_revenue: number
  pending_orders: number
  pending_products: number
  pending_activities: number
}

export const statsApi = {
  overview: () => api.get<StatsOverview>('/stats/overview'),
}

// ─── Products ─────────────────────────────────────────────────────────────────

export interface Product {
  id: number
  name: string
  category: string
  price: number
  leader?: string
  status: number
  image?: string
  description?: string
  stock?: number
  created_at?: string
}

export interface PaginatedRes<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export const productsApi = {
  list: (params?: { status?: string; page?: number; page_size?: number }) =>
    api.get<PaginatedRes<Product>>('/products', { params }),
  update: (id: number, data: Partial<Product>) =>
    api.put<Product>(`/products/${id}`, data),
  audit: (id: number, approved: boolean, remark = '') =>
    api.put(`/products/${id}/audit`, { approved, remark }),
}

// ─── Activities ───────────────────────────────────────────────────────────────

export interface Activity {
  id: number
  title: string
  type: string
  leader?: string
  status: number
  start_date?: string
  end_date?: string
  participants?: number
  created_at?: string
}

export const activitiesApi = {
  list: (params?: { status?: string; page?: number; page_size?: number }) =>
    api.get<PaginatedRes<Activity>>('/activities', { params }),
  audit: (id: number, approved: boolean, remark = '') =>
    api.put(`/activities/${id}/audit`, { approved, remark }),
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export interface Order {
  id: number
  order_no: string
  user_id: number
  leader_id: number
  total_amount: number
  status: number
  created_at: string
  items?: OrderItem[]
  user_nickname?: string
  leader_nickname?: string
}

export interface OrderItem {
  product_name: string
  quantity: number
  price: number
}

export interface PaginatedOrderRes {
  items: Order[]
  total: number
  page: number
  page_size: number
}

export const ordersApi = {
  list: (params?: { status?: string; page?: number; page_size?: number }) =>
    api.get<PaginatedOrderRes>('/orders', { params }),
  detail: (id: number) => api.get<Order>(`/orders/${id}`),
}

// ─── Leader ───────────────────────────────────────────────────────────────────

export interface Leader {
  id: number
  nickname: string
  real_name: string
  phone: string
  province: string
  city: string
  level: number
  total_sales: number
  status: number
  created_at?: string
}

export const leaderApi = {
  profile: () => api.get<Leader>('/leader/profile'),
  updateStatus: (id: number, status: number) =>
    api.put(`/leader/${id}/status`, { status }),
}

// ─── Report / Analytics ───────────────────────────────────────────────────────

export interface ChartDataPoint {
  date: string
  value: number
}

export interface ReportData {
  daily_active_users: ChartDataPoint[]
  order_trend: ChartDataPoint[]
  revenue_trend: ChartDataPoint[]
}

export const reportApi = {
  overview: () => api.get<ReportData>('/reports/overview'),
}

export default api