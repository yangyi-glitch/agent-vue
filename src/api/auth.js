import request from '@/utils/request'
import { saveSession } from '@/utils/session'

export async function loginCheck(account, password) {
  const result = await request.get('/login/loginCheck', {
    withToken: false,
    params: { account, password },
  })

  if (result.code !== 200 || !result.data) {
    throw new Error(result.msg || String(result.data || '账号或密码不正确'))
  }

  saveSession(result.data, account)
  return result.data
}
