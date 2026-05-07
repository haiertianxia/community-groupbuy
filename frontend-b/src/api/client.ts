const BASE_URL = 'http://localhost:8080/api/v1'

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
}

class LeaderApiClient {
  private token: string = ''

  setToken(token: string) { this.token = token }
  getToken() { return this.token }

  private async request<T = any>(options: RequestOptions): Promise<T> {
    const { url, method = 'GET', data } = options
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${BASE_URL}${url}`,
        method,
        data,
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getToken()}`,
        },
        success: (res: any) => {
          const resp = res.data
          if (resp.code === 0) resolve(resp.data)
          else { wx.showToast({ title: resp.message, icon: 'none' }); reject(new Error(resp.message)) }
        },
        fail: (err) => { wx.showToast({ title: '网络错误', icon: 'none' }); reject(err) },
      })
    })
  }

  // Dashboard
  async getLeaderDashboard() {
    return this.request<{
      leader: Leader
      todayOrders: number
      todaySales: number
      pendingOrders: number
      pendingRefunds: number
    }>({ url: '/leader/dashboard' })
  }

  // Activities
  async createActivity(data: any) {
    return this.request({ url: '/leader/activities', method: 'POST', data })
  }
  async getActivities(params: { page?: number; status?: number }) {
    const q = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined) q.set(k, String(v)) })
    return this.request<{ list: Activity[]; total: number }>({ url: `/leader/activities?${q.toString()}` })
  }
  async updateActivity(id: number, data: any) {
    return this.request({ url: `/leader/activities/${id}`, method: 'PUT', data })
  }

  // Products
  async createProduct(data: any) {
    return this.request({ url: '/leader/products', method: 'POST', data })
  }
  async getProducts(params: { page?: number }) {
    return this.request({ url: '/leader/products' })
  }

  // Orders
  async getLeaderOrders(params: { page?: number; page_size?: number; status?: number }) {
    const q = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined) q.set(k, String(v)) })
    return this.request<{ list: Order[]; total: number }>({ url: `/leader/orders?${q.toString()}` })
  }
  async shipOrder(orderId: number, expressCompany: string, expressNo: string) {
    return this.request({ url: `/leader/orders/${orderId}/ship`, method: 'POST', data: { express_company: expressCompany, express_no: expressNo } })
  }
  async processRefund(orderId: number, approved: boolean, reason: string) {
    return this.request({ url: `/leader/orders/${orderId}/process-refund`, method: 'POST', data: { approved, reason } })
  }

  // Settlements
  async getSettlements() {
    return this.request<{ list: Settlement[] }>({ url: '/leader/dashboard/settlements' })
  }
  async confirmSettlement(id: number) {
    return this.request({ url: `/leader/dashboard/settlements/${id}/confirm`, method: 'POST' })
  }
  async withdraw(amount: number) {
    return this.request({ url: '/leader/dashboard/withdraw', method: 'POST', data: { amount } })
  }

  // Profile
  async getProfile() { return this.request<Leader>({ url: '/users/me' }) }
  async updateProfile(data: any) { return this.request({ url: '/users/me', method: 'PUT', data }) }
}

export interface Leader {
  id: number; nickname: string; avatar: string; phone: string
  province: string; city: string; district: string; pickup_address: string
  level: number; total_sales: number; rating: number; balance: number; frozen_balance: number
}
export interface Activity { id: number; activity_name: string; group_price: string; status: number; current_people: number; min_people: number; end_time: string }
export interface Order { id: number; order_no: string; user_id: number; pay_amount: string; status: number; created_at: string }
export interface Settlement { id: number; settlement_no: string; period_start: string; period_end: string; order_count: number; gross_amount: string; commission_amount: string; net_amount: string; status: number }

export const leaderApi = new LeaderApiClient()
