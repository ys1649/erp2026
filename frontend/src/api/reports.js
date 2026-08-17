import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const reportApi = {
  listCustomer: () => api.get('/reports/customer'),
  customerReportUrl: (name) => `/api/reports/customer/${encodeURIComponent(name)}?_=${Date.now()}`,
}
