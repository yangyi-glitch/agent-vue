import request from '@/utils/request'

export async function reloadFolder() {
  const result = await request.get('/cache/ai/reloadFolder')

  if (result.code !== 200) {
    throw new Error(result.msg || result.data || '知识库刷新失败')
  }

  return result
}

export async function chat(message, conversationId) {
  return request.get('/cache/ai/chat', {
    params: { message, conversationId },
    responseType: 'text',
  })
}

// axios 取消请求抛的是 CanceledError，调用方（页面）按 AbortError 判断「停止生成」
const isCanceled = (err) =>
  err?.code === 'ERR_CANCELED' || err?.name === 'AbortError' || err?.name === 'CanceledError'

const toAbortError = () => new DOMException('请求已取消', 'AbortError')

export async function streamChat(message, conversationId, onDelta, signal) {
  // 流式接口必须走 axios 的 fetch 适配器，XHR 拿不到可读流
  let stream
  try {
    stream = await request.get('/cache/ai/chat/stream', {
      params: { message, conversationId },
      responseType: 'stream',
      adapter: 'fetch',
      headers: { Accept: 'text/event-stream' },
      signal,
    })
  } catch (err) {
    throw isCanceled(err) ? toAbortError() : err
  }

  if (!stream || typeof stream.getReader !== 'function') {
    throw new Error('当前浏览器不支持流式响应读取')
  }

  const reader = stream.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  const flushEvent = (rawEvent) => {
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

  try {
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
  } catch (err) {
    throw isCanceled(err) ? toAbortError() : err
  }
}
