import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const dataDictApi = {
  list: (params) => api.get('/datadict', { params }),
  get: (ddmNo) => api.get(`/datadict/${ddmNo}`),
  create: (data) => api.post('/datadict', data),
  update: (ddmNo, data) => api.put(`/datadict/${ddmNo}`, data),
  remove: (ddmNo) => api.delete(`/datadict/${ddmNo}`),

  listFields: (ddmNo) => api.get(`/datadict/${ddmNo}/fields`),
  createField: (ddmNo, data) => api.post(`/datadict/${ddmNo}/fields`, data),
  updateField: (ddmNo, dddId, data) => api.put(`/datadict/${ddmNo}/fields/${dddId}`, data),
  removeField: (ddmNo, dddId) => api.delete(`/datadict/${ddmNo}/fields/${dddId}`),
  autoGenerateFields: (ddmNo) => api.post(`/datadict/${ddmNo}/fields/auto-generate`),

  getMeta: (ddmNo) => api.get(`/datadict/${ddmNo}/meta`),
  getData: (ddmNo, params) => api.get(`/datadict/${ddmNo}/data`, { params }),
}
