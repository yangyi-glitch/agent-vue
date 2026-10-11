import axios from 'axios'
import { clearSession, getToken } from '@/utils/session'

const API_PREFIX = import.meta.env.VITE_API_PREFIX ?? '/api'

const request = axios.create({
  baseURL: API_PREFIX,
})

// 请求拦截器：统一给接口带上后端签发的 Token
// withToken: false 的接口（如登录）不带 Token
request.interceptors.request.use(
  (config) => {
    if (config.withToken === false) {
      return config
    }

    const token = getToken()
    if (!token) {
      return Promise.reject(new Error('请先登录'))
    }

    config.headers.set('Token', token)
    return config
  },
  (error) => Promise.reject(error),
)

// 响应拦截器：成功时直接返回接口数据；401 视为登录失效
request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status

    if (status === 401) {
      clearSession()
      return Promise.reject(new Error('AUTH_EXPIRED'))
    }

    if (status) {
      return Promise.reject(new Error(`请求失败：${status}`))
    }

    return Promise.reject(new Error('网络连接失败，请确认后端服务已启动'))
  },
)

export default request
