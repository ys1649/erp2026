import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const customerApi = {
  list: (params) => api.get('/customers', { params }),
  get: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  remove: (id) => api.delete(`/customers/${id}`),
  reportDataUrl: () => `${window.location.origin}/api/customers/report-data`,
}
