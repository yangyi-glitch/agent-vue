<script setup>
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { chat, reloadFolder, streamChat } from '@/api/ai'
import { getOrCreateConversationId, resetConversationId } from '@/utils/conversation'
import { clearSession, getStoredAccount } from '@/utils/session'

const props = defineProps({
  account: {
    type: String,
    default: '',
  },
})

const router = useRouter()

const draft = ref('')
const mode = ref('stream')
const isSending = ref(false)
const isReloading = ref(false)
const error = ref('')
const conversationId = ref(getOrCreateConversationId())
const messages = ref([
  {
    id: Date.now(),
    role: 'assistant',
    content:
      '你好，我可以基于项目知识库回答问题，也可以处理普通对话。需要更新本地文档时，先点右上角刷新知识库。',
    time: formatTime(),
    status: 'done',
  },
])

const scrollPanel = ref(null)
let activeController = null

const suggestions = [
  '帮我概括一下当前项目结构',
  '知识库里有哪些业务规则？',
  '当前机器信息是什么？',
  '现在是什么时间？',
]

const account = computed(() => props.account || getStoredAccount() || '未知用户')
const canSend = computed(() => draft.value.trim().length > 0 && !isSending.value)
const shortConversationId = computed(() => conversationId.value.slice(0, 8))
const currentStatus = computed(() => {
  if (isSending.value) return '模型响应中'
  if (isReloading.value) return '知识库刷新中'
  return '就绪'
})

function formatTime() {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date())
}

function pushMessage(role, content, status = 'done') {
  const message = {
    id: Date.now() + Math.random(),
    role,
    content,
    time: formatTime(),
    status,
  }
  messages.value.push(message)
  void scrollToBottom()
  return message
}

async function scrollToBottom() {
  await nextTick()
  if (scrollPanel.value) {
    scrollPanel.value.scrollTop = scrollPanel.value.scrollHeight
  }
}

function useSuggestion(text) {
  if (isSending.value) return
  draft.value = text
}

async function sendMessage() {
  const message = draft.value.trim()
  if (!message || isSending.value) return

  error.value = ''
  draft.value = ''
  pushMessage('user', message)
  const assistantMessage = pushMessage('assistant', '', 'streaming')

  isSending.value = true
  activeController = new AbortController()

  try {
    if (mode.value === 'stream') {
      await streamChat(
        message,
        conversationId.value,
        (delta) => {
          assistantMessage.content += delta
          void scrollToBottom()
        },
        activeController.signal,
      )
    } else {
      assistantMessage.content = await chat(message, conversationId.value)
    }

    assistantMessage.status = 'done'
    if (!assistantMessage.content.trim()) {
      assistantMessage.content = '接口已返回，但没有收到文本内容。'
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      assistantMessage.status = 'done'
      assistantMessage.content += assistantMessage.content ? '\n\n已停止生成。' : '已停止生成。'
    } else {
      if (err instanceof Error && err.message === 'AUTH_EXPIRED') {
        redirectToLogin('登录已失效，请重新登录')
        return
      }
      assistantMessage.status = 'error'
      assistantMessage.content = '请求失败，请确认后端服务已启动并且接口可访问。'
      error.value = err instanceof Error ? err.message : '未知错误'
    }
  } finally {
    isSending.value = false
    activeController = null
    void scrollToBottom()
  }
}

function stopStream() {
  activeController?.abort()
}

async function refreshKnowledge() {
  if (isReloading.value) return
  error.value = ''
  isReloading.value = true

  try {
    await reloadFolder()
    pushMessage('system', '知识库已刷新，后续回答会基于最新文件。')
  } catch (err) {
    if (err instanceof Error && err.message === 'AUTH_EXPIRED') {
      redirectToLogin('登录已失效，请重新登录')
      return
    }
    error.value = err instanceof Error ? err.message : '知识库刷新失败'
    pushMessage('system', '知识库刷新失败，请确认后端服务和 RAG 文件目录。', 'error')
  } finally {
    isReloading.value = false
  }
}

function clearChat() {
  if (isSending.value) return
  conversationId.value = resetConversationId()
  messages.value = [
    {
      id: Date.now(),
      role: 'assistant',
      content: '上下文已清空。你可以重新开始提问。',
      time: formatTime(),
      status: 'done',
    },
  ]
  error.value = ''
}

async function copyText(text) {
  await navigator.clipboard?.writeText(text)
}

function handleKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    void sendMessage()
  }
}

function redirectToLogin(reason) {
  clearSession()
  router.push(reason ? { name: 'LoginPage', query: { notice: reason } } : { name: 'LoginPage' })
}

function logout() {
  activeController?.abort()
  redirectToLogin()
}

onBeforeUnmount(() => {
  activeController?.abort()
})
</script>

<template>
  <section class="chat-shell">
    <aside class="chat-sidebar">
      <div class="brand-block">
        <div class="brand-mark">AI</div>
        <div>
          <p class="eyebrow">Project Agent</p>
          <h1>智能项目助手</h1>
        </div>
      </div>

      <div class="status-panel">
        <div>
          <span class="status-dot" :class="{ active: isSending || isReloading }"></span>
          <span>{{ currentStatus }}</span>
        </div>
        <strong>{{ mode === 'stream' ? '流式输出' : '普通响应' }}</strong>
      </div>

      <div class="control-group">
        <label>响应模式</label>
        <div class="segmented-control" aria-label="响应模式">
          <button :class="{ selected: mode === 'stream' }" type="button" @click="mode = 'stream'">
            Stream
          </button>
          <button :class="{ selected: mode === 'normal' }" type="button" @click="mode = 'normal'">
            Chat
          </button>
        </div>
      </div>

      <div class="control-group">
        <label>快捷提问</label>
        <button
          v-for="item in suggestions"
          :key="item"
          class="prompt-button"
          type="button"
          @click="useSuggestion(item)"
        >
          {{ item }}
        </button>
      </div>

      <div class="account-panel">
        <span>当前账号</span>
        <strong>{{ account }}</strong>
      </div>

      <div class="account-panel">
        <span>Conversation</span>
        <strong>{{ shortConversationId }}</strong>
      </div>

      <div class="side-actions">
        <button class="secondary-action" :disabled="isReloading" type="button" @click="refreshKnowledge">
          {{ isReloading ? '刷新中...' : '刷新知识库' }}
        </button>
        <button class="ghost-action" :disabled="isSending" type="button" @click="clearChat">清空对话</button>
        <button class="ghost-action" type="button" @click="logout">退出登录</button>
      </div>
    </aside>

    <main class="chat-main">
      <header class="chat-header">
        <div>
          <p class="eyebrow">RAG Chat Console</p>
          <h2>流式对话框</h2>
        </div>
        <div class="endpoint-pill">/api/cache/ai/chat/stream</div>
      </header>

      <div ref="scrollPanel" class="message-list">
        <article
          v-for="message in messages"
          :key="message.id"
          class="message-row"
          :class="[`role-${message.role}`, { streaming: message.status === 'streaming' }]"
        >
          <div class="avatar">{{ message.role === 'user' ? 'U' : message.role === 'system' ? 'S' : 'AI' }}</div>
          <div class="message-bubble">
            <div class="message-meta">
              <span>{{ message.role === 'user' ? '你' : message.role === 'system' ? '系统' : '助手' }}</span>
              <time>{{ message.time }}</time>
              <button
                v-if="message.content"
                class="copy-button"
                type="button"
                title="复制"
                @click="copyText(message.content)"
              >
                Copy
              </button>
            </div>
            <p v-if="message.content" class="message-content">{{ message.content }}</p>
            <div v-else class="typing-indicator" aria-label="正在生成">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </article>
      </div>

      <p v-if="error" class="error-banner">{{ error }}</p>

      <footer class="composer">
        <textarea
          v-model="draft"
          :disabled="isSending"
          rows="3"
          placeholder="输入问题，Enter 发送，Shift + Enter 换行"
          @keydown="handleKeydown"
        ></textarea>
        <div class="composer-actions">
          <span>{{ draft.length }} 字</span>
          <button v-if="isSending" class="stop-button" type="button" @click="stopStream">停止</button>
          <button v-else class="send-button" :disabled="!canSend" type="button" @click="sendMessage">
            发送
          </button>
        </div>
      </footer>
    </main>
  </section>
</template>

<style scoped>
.chat-shell {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  width: min(1180px, calc(100vw - 32px));
  min-height: min(820px, calc(100vh - 32px));
  overflow: hidden;
  border: 1px solid rgba(32, 39, 55, 0.1);
  border-radius: 8px;
  background: #f7f8fb;
  box-shadow: 0 24px 70px rgba(31, 41, 55, 0.14);
}

.chat-sidebar {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
  color: #f8fafc;
  background:
    linear-gradient(145deg, rgba(11, 18, 32, 0.98), rgba(24, 39, 58, 0.96)),
    #111827;
}

.brand-block {
  display: flex;
  align-items: center;
  gap: 14px;
}

.brand-mark,
.avatar {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  font-weight: 800;
}

.brand-mark {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  color: #101827;
  background: #9fe6c8;
}

.eyebrow {
  margin: 0 0 3px;
  color: #6b7280;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.chat-sidebar .eyebrow {
  color: #8fb3c2;
}

h1,
h2 {
  margin: 0;
  color: inherit;
  font-weight: 800;
  letter-spacing: 0;
}

h1 {
  font-size: 24px;
}

h2 {
  color: #111827;
  font-size: 24px;
}

.status-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
}

.status-panel div {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-panel span,
.status-panel strong {
  font-size: 13px;
}

.status-panel strong {
  color: #9fe6c8;
  font-weight: 800;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #34d399;
}

.status-dot.active {
  animation: pulse 1s ease-in-out infinite;
}

.control-group {
  display: grid;
  gap: 10px;
}

.control-group label {
  color: #cbd5e1;
  font-size: 13px;
  font-weight: 700;
}

.segmented-control {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 4px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.74);
}

button {
  border: 0;
  border-radius: 8px;
  font: inherit;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease,
    opacity 0.18s ease;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

button:not(:disabled):active {
  transform: translateY(1px);
}

.segmented-control button {
  min-height: 36px;
  color: #cbd5e1;
  background: transparent;
  font-weight: 800;
}

.segmented-control button.selected {
  color: #0f172a;
  background: #f8fafc;
}

.prompt-button {
  width: 100%;
  min-height: 42px;
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #e2e8f0;
  background: rgba(255, 255, 255, 0.06);
  text-align: left;
}

.prompt-button:hover {
  border-color: rgba(159, 230, 200, 0.55);
  background: rgba(159, 230, 200, 0.1);
}

.side-actions {
  display: grid;
  gap: 10px;
  margin-top: auto;
}

.account-panel {
  display: grid;
  gap: 4px;
  padding: 12px 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
}

.account-panel span {
  color: #8fb3c2;
  font-size: 12px;
  font-weight: 800;
}

.account-panel strong {
  color: #f8fafc;
  font-size: 14px;
  font-weight: 900;
  word-break: break-word;
}

.secondary-action,
.ghost-action,
.send-button,
.stop-button {
  min-height: 44px;
  padding: 0 16px;
  font-weight: 800;
}

.secondary-action {
  color: #0f172a;
  background: #9fe6c8;
}

.ghost-action {
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #e5e7eb;
  background: transparent;
}

.chat-main {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto auto;
  min-width: 0;
  background: #ffffff;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 26px;
  border-bottom: 1px solid #e5e7eb;
}

.endpoint-pill {
  max-width: 100%;
  padding: 8px 10px;
  overflow: hidden;
  border: 1px solid #dbe3ee;
  border-radius: 999px;
  color: #355070;
  background: #f8fafc;
  font-size: 12px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-height: 0;
  padding: 24px 26px;
  overflow-y: auto;
  background:
    linear-gradient(rgba(255, 255, 255, 0.94), rgba(255, 255, 255, 0.94)),
    repeating-linear-gradient(0deg, transparent, transparent 31px, #eef2f7 32px);
}

.message-row {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  gap: 12px;
  align-items: flex-start;
}

.message-row.role-user {
  grid-template-columns: minmax(0, 1fr) 38px;
}

.message-row.role-user .avatar {
  grid-column: 2;
  background: #355070;
}

.message-row.role-user .message-bubble {
  grid-column: 1;
  grid-row: 1;
  justify-self: end;
  color: #ffffff;
  background: #355070;
}

.message-row.role-system .avatar {
  background: #f59e0b;
}

.message-row.role-system .message-bubble {
  border-color: #fde68a;
  background: #fffbeb;
}

.avatar {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  color: #0f172a;
  background: #9fe6c8;
  font-size: 12px;
}

.message-bubble {
  width: fit-content;
  max-width: min(720px, 100%);
  padding: 14px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  color: #172033;
  background: #ffffff;
  box-shadow: 0 10px 30px rgba(31, 41, 55, 0.08);
}

.message-row.role-user .message-bubble .message-meta {
  color: rgba(255, 255, 255, 0.75);
}

.message-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  color: #64748b;
  font-size: 12px;
}

.message-meta span {
  color: inherit;
  font-weight: 800;
}

.copy-button {
  min-height: 24px;
  margin-left: auto;
  padding: 0 8px;
  border: 1px solid currentColor;
  color: inherit;
  background: transparent;
  font-size: 11px;
  font-weight: 800;
}

.message-content {
  margin: 0;
  color: inherit;
  white-space: pre-wrap;
  word-break: break-word;
}

.typing-indicator {
  display: flex;
  gap: 5px;
  align-items: center;
  min-width: 54px;
  min-height: 24px;
}

.typing-indicator span {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #94a3b8;
  animation: bounce 1s infinite ease-in-out;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.15s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.3s;
}

.error-banner {
  margin: 0 26px 14px;
  padding: 10px 12px;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #991b1b;
  background: #fef2f2;
}

.composer {
  display: grid;
  gap: 12px;
  padding: 16px 26px 22px;
  border-top: 1px solid #e5e7eb;
  background: #ffffff;
}

textarea {
  width: 100%;
  min-height: 88px;
  max-height: 180px;
  resize: vertical;
  padding: 14px 16px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  outline: none;
  color: #111827;
  background: #f8fafc;
  font: inherit;
}

textarea:focus {
  border-color: #355070;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(53, 80, 112, 0.12);
}

.composer-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.composer-actions span {
  color: #64748b;
  font-size: 12px;
}

.send-button {
  color: #ffffff;
  background: #2f855a;
}

.stop-button {
  color: #ffffff;
  background: #be123c;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.45;
    transform: scale(1.4);
  }
}

@keyframes bounce {
  0%,
  80%,
  100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-5px);
  }
}

@media (max-width: 860px) {
  .chat-shell {
    grid-template-columns: 1fr;
    width: 100vw;
    min-height: 100vh;
    border: 0;
    border-radius: 0;
  }

  .chat-sidebar {
    gap: 16px;
    padding: 18px;
  }

  .control-group {
    display: none;
  }

  .side-actions {
    grid-template-columns: 1fr 1fr;
  }

  .chat-header,
  .message-list,
  .composer {
    padding-right: 16px;
    padding-left: 16px;
  }

  .chat-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .message-bubble {
    max-width: 100%;
  }
}
</style>
