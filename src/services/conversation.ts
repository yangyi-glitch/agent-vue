const CONVERSATION_STORAGE_KEY = 'agent_study_conversation_id'

export function createConversationId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID()
  }

  return `conv_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export function getStoredConversationId() {
  return localStorage.getItem(CONVERSATION_STORAGE_KEY) || ''
}

export function saveConversationId(conversationId: string) {
  localStorage.setItem(CONVERSATION_STORAGE_KEY, conversationId)
}

export function resetConversationId() {
  const conversationId = createConversationId()
  saveConversationId(conversationId)
  return conversationId
}

export function getOrCreateConversationId() {
  const storedConversationId = getStoredConversationId()
  if (storedConversationId) {
    return storedConversationId
  }

  return resetConversationId()
}