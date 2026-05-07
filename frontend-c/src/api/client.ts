// API client for community group buy
const BASE_URL = 'http://localhost:8080/api/v1'

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  header?: Record<string, string>
}

interface Response<T = any> {
  code: number
  message: string
  data: T
}

class ApiClient {
  private token: string = ''

  setToken(token: string) {
    this.token = token
    wx.setStorageSync('token', token)
  }

  getToken(): string {
    if (!this.token) {
      this.token = wx.getStorageSync('token') || ''
    }
    return this.token
  }

  private async request<T = any>(options: RequestOptions): Promise<T> {
    const { url, method = 'GET', data, header = {} } = options

    if (this.getToken()) {
      header['Authorization'] = `Bearer ${this.getToken()}`
    }
    header['Content-Type'] = 'application/json'

    return new Promise((resolve, reject) => {
      wx.request({
        url: `${BASE_URL}${url}`,
        method,
        data,
        header,
        success: (res: any) => {
          const resp = res.data as Response<T>
          if (resp.code === 0) {
            resolve(resp.data)
          } else if (resp.code === 2001) {
            // Not logged in
            this.redirectToLogin()
            reject(new Error(resp.message))
          } else {
            wx.showToast({ title: resp.message, icon: 'none' })
            reject(new Error(resp.message))
          }
        },
        fail: (err) => {
          wx.showToast({ title: '网络请求失败', icon: 'none' })
          reject(err)
        }
      })
    })
  }

  private redirectToLogin() {
    wx.showModal({
      title: '提示',
      content: '请先登录',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({ url: '/pages/login/login' })
        }
      }
    })
  }

  // Auth
  async login(code: string) {
    return this.request<{
      user_id: number
      token: string
      refresh_token: string
      is_new_user: boolean
      phone_bound: boolean
    }>({ url: '/auth/login', method: 'POST', data: { code } })
  }

  async refreshToken(refreshToken: string) {
    return this.request<{ token: string; refresh_token: string }>(
      { url: '/auth/refresh', method: 'POST', data: { refresh_token: refreshToken } }
    )
  }

  // Products
  async getProducts(params: {
    page?: number
    page_size?: number
    category_id?: number
    leader_id?: number
    keyword?: string
    sort?: string
  }) {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) query.set(k, String(v))
    })
    return this.request<{
      list: Product[]
      total: number
      page: number
      page_size: number
    }>({ url: `/products?${query.toString()}` })
  }

  async getProduct(id: number) {
    return this.request<Product>({ url: `/products/${id}` })
  }

  // Activities
  async getActivities(params: { page?: number; page_size?: number; status?: number }) {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) query.set(k, String(v))
    })
    return this.request<{
      list: Activity[]
      total: number
      page: number
      page_size: number
    }>({ url: `/activities?${query.toString()}` })
  }

  async getActivity(id: number) {
    return this.request<Activity>({ url: `/activities/${id}` })
  }

  async joinActivity(activityId: number, addressId: number) {
    return this.request<{
      order_id: number
      order_no: string
      group_id: number
      group_no: string
      is_new_group: boolean
      group_people: number
      min_people: number
      pay_amount: string
      payment_params?: WechatPayParams
    }>({ url: `/activities/${activityId}/join`, method: 'POST', data: { address_id: addressId } })
  }

  // Orders
  async getOrders(params: { page?: number; page_size?: number; status?: number }) {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) query.set(k, String(v))
    })
    return this.request<{
      list: Order[]
      total: number
      page: number
      page_size: number
    }>({ url: `/orders?${query.toString()}` })
  }

  async getOrder(id: number) {
    return this.request<Order>({ url: `/orders/${id}` })
  }

  async payOrder(orderId: number, transactionId: string) {
    return this.request<{ success: boolean }>(
      { url: `/orders/${orderId}/pay`, method: 'POST', data: { transaction_id: transactionId } }
    )
  }

  async cancelOrder(orderId: number) {
    return this.request<{ success: boolean }>(
      { url: `/orders/${orderId}/cancel`, method: 'POST' }
    )
  }

  async confirmOrder(orderId: number) {
    return this.request<{ success: boolean }>(
      { url: `/orders/${orderId}/confirm`, method: 'POST' }
    )
  }

  async refundOrder(orderId: number, reason: string) {
    return this.request<{ success: boolean }>(
      { url: `/orders/${orderId}/refund`, method: 'POST', data: { reason } }
    )
  }

  // Addresses
  async getAddresses() {
    return this.request<Address[]>({ url: '/users/addresses' })
  }

  async createAddress(data: Partial<Address>) {
    return this.request<Address>({ url: '/users/addresses', method: 'POST', data })
  }

  async updateAddress(id: number, data: Partial<Address>) {
    return this.request<Address>({ url: `/users/addresses/${id}`, method: 'PUT', data })
  }

  async deleteAddress(id: number) {
    return this.request<{ success: boolean }>(
      { url: `/users/addresses/${id}`, method: 'DELETE' }
    )
  }

  // User
  async getProfile() {
    return this.request<User>({ url: '/users/me' })
  }

  async updateProfile(data: { nickname?: string; avatar?: string; phone?: string }) {
    return this.request<User>({ url: '/users/me', method: 'PUT', data })
  }

  // Leaders
  async getLeaders(params: { page?: number; province?: string; city?: string }) {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) query.set(k, String(v))
    })
    return this.request<{
      list: Leader[]
      total: number
      page: number
      page_size: number
    }>({ url: `/leaders?${query.toString()}` })
  }

  async getLeader(id: number) {
    return this.request<Leader>({ url: `/leaders/${id}` })
  }
}

export interface Product {
  id: number
  name: string
  sub_name: string
  images: string[]
  group_price: string
  original_price: string
  sales_count: number
  comment_count: number
  skus?: SKU[]
}

export interface SKU {
  id: number
  name: string
  price: number
  group_price: number
  stock: number
  specs: string[]
}

export interface Activity {
  id: number
  activity_name: string
  leader_id: number
  product_id: number
  sku_hash: string
  group_price: string
  original_price: string
  stock: number
  sold_count: number
  min_people: number
  current_people: number
  start_time: string
  end_time: string
  status: number
  banner_images: string[]
  leader?: Leader
  product?: Product
}

export interface Order {
  id: number
  order_no: string
  pay_amount: string
  total_amount: string
  status: number
  pay_status: number
  created_at: string
  items?: OrderItem[]
  leader?: Leader
}

export interface OrderItem {
  id: number
  product_id: number
  product_name: string
  sku_name: string
  image: string
  price: number
  quantity: number
  sub_total: number
}

export interface Address {
  id: number
  consignee: string
  phone: string
  province: string
  city: string
  district: string
  address: string
  is_default: boolean
  label: string
}

export interface User {
  id: number
  uid: string
  nickname: string
  avatar: string
  phone: string
  level: number
  growth_value: number
  available_points: number
}

export interface Leader {
  id: number
  nickname: string
  avatar: string
  province: string
  city: string
  district: string
  pickup_address: string
  pickup_hours: string
  level: number
  total_sales: number
  rating: number
}

export interface WechatPayParams {
  appId: string
  timeStamp: string
  nonceStr: string
  package: string
  signType: string
  paySign: string
}

export const api = new ApiClient()
