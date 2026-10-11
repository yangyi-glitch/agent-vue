import { clearSession, getToken } from './session'

const API_PREFIX = import.meta.env.VITE_API_PREFIX ?? '/api'

type ResponseType = 'json' | 'text' | 'raw'

interface RequestOptions extends Omit<RequestInit, 'body'> {
  auth?: boolean
  params?: Record<string, string | number | boolean | undefined | null>
  responseType?: ResponseType
  body?: BodyInit | Record<string, unknown> | null
}

function buildUrl(path: string, params?: RequestOptions['params']) {
  const search = new URLSearchParams()

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      search.set(key, String(value))
    }
  })

  const suffix = search.size ? `?${search.toString()}` : ''
  return `${API_PREFIX}${path}${suffix}`
}

function buildHeaders(options: RequestOptions) {
  const headers = new Headers(options.headers)

  if (options.auth !== false) {
    const token = getToken()
    if (!token) {
      throw new Error('请先登录')
    }
    headers.set('Token', token)
  }

  return headers
}

function buildBody(options: RequestOptions, headers: Headers) {
  const body = options.body
  if (!body || body instanceof FormData || body instanceof URLSearchParams || typeof body === 'string') {
    return body
  }

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  return JSON.stringify(body)
}

async function handleUnauthorized(response: Response) {
  if (response.status === 401) {
    clearSession()
    throw new Error('AUTH_EXPIRED')
  }
}

async function parseResponse<T>(response: Response, responseType: ResponseType) {
  if (responseType === 'raw') {
    return response as T
  }

  if (responseType === 'text') {
    return response.text() as Promise<T>
  }

  return response.json() as Promise<T>
}

export async function apiRequest<T = unknown>(path: string, options: RequestOptions = {}) {
  const responseType = options.responseType ?? 'json'
  const headers = buildHeaders(options)
  const requestOptions: RequestInit = {
    ...options,
    headers,
    body: buildBody(options, headers),
  }

  const response = await fetch(buildUrl(path, options.params), requestOptions)

  await handleUnauthorized(response)
  if (!response.ok) {
    throw new Error(`请求失败：${response.status}`)
  }

  return parseResponse<T>(response, responseType)
}

export function apiText(path: string, options: RequestOptions = {}) {
  return apiRequest<string>(path, {
    ...options,
    responseType: 'text',
  })
}

export function apiStream(path: string, options: RequestOptions = {}) {
  const headers = new Headers(options.headers)
  headers.set('Accept', 'text/event-stream')

  return apiRequest<Response>(path, {
    ...options,
    responseType: 'raw',
    headers,
  })
}