const TOKEN_STORAGE_KEY = 'agent_study_token'
const ACCOUNT_STORAGE_KEY = 'agent_study_account'

export function getToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY) || ''
}

export function getStoredAccount() {
  return localStorage.getItem(ACCOUNT_STORAGE_KEY) || ''
}

export function saveSession(token: string, account: string) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token)
  localStorage.setItem(ACCOUNT_STORAGE_KEY, account)
}

export function clearSession() {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
  localStorage.removeItem(ACCOUNT_STORAGE_KEY)
}