<script setup lang="ts">
import { ref } from 'vue'
import LoginPage from './components/LoginPage.vue'
import StreamingChat from './components/StreamingChat.vue'
import { clearSession, getStoredAccount, getToken } from './services/auth'

const isAuthed = ref(Boolean(getToken()))
const account = ref(getStoredAccount())
const loginNotice = ref('')

function handleLogin(loginAccount: string) {
  account.value = loginAccount
  isAuthed.value = true
  loginNotice.value = ''
}

function handleLogout(reason?: string) {
  clearSession()
  account.value = ''
  isAuthed.value = false
  loginNotice.value = reason || ''
}
</script>

<template>
  <StreamingChat v-if="isAuthed" :account="account" @logout="handleLogout" />
  <LoginPage v-else :notice="loginNotice" @login="handleLogin" />
</template>