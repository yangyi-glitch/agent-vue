export type ChatMode = 'stream' | 'normal'

import { apiStream, apiText, apiRequest } from './request'

interface ApiResult<T> {
  data: T
  code: number
  msg?: string
}

export async function reloadFolder() {
  const result = await apiRequest<ApiResult<string>>('/cache/ai/reloadFolder', {
    method: 'GET',
  })

  if (result.code !== 200) {
    throw new Error(result.msg || result.data || '知识库刷新失败')
  }

  return result
}

export async function chat(message: string, conversationId: string) {
  return apiText('/cache/ai/chat', {
    method: 'GET',
    params: { message, conversationId },
  })
}

export async function streamChat(
  message: string,
  conversationId: string,
  onDelta: (delta: string) => void,
  signal?: AbortSignal,
) {
  const response = await apiStream('/cache/ai/chat/stream', {
    method: 'GET',
    params: { message, conversationId },
    signal,
  })

  if (!response.body) {
    throw new Error('当前浏览器不支持流式响应读取')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  const flushEvent = (rawEvent: string) => {
    const lines = rawEvent.split(/\r?\n/)
    const dataLines = lines
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).replace(/^ /, ''))

    if (dataLines.length) {
      const data = dataLines.join('\n')
      if (data !== '[DONE]') {
        onDelta(data)
      }
      return
    }

    const text = rawEvent.trim()
    if (text) {
      onDelta(text)
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split(/\r?\n\r?\n/)
    buffer = events.pop() || ''
    events.forEach(flushEvent)
  }

  buffer += decoder.decode()
  if (buffer.trim()) {
    flushEvent(buffer)
  }
}