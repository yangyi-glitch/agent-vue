import { apiRequest } from './request'
import { clearSession, getStoredAccount, getToken, saveSession } from './session'

interface ApiResult<T> {
  data: T
  code: number
  total?: number
  msg?: string
}

export { clearSession, getStoredAccount, getToken, saveSession }

export async function loginCheck(account: string, password: string) {
  const result = await apiRequest<ApiResult<string>>('/login/loginCheck', {
    method: 'GET',
    auth: false,
    params: { account, password },
  })

  if (result.code !== 200 || !result.data) {
    throw new Error(result.msg || String(result.data || '账号或密码不正确'))
  }

  saveSession(result.data, account)
  return result.data
}