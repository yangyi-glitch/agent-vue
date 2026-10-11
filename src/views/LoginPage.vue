<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { loginCheck } from '@/api/auth'
import { getStoredAccount } from '@/utils/session'

defineProps({
  notice: {
    type: String,
    default: '',
  },
})

const router = useRouter()

const account = ref(getStoredAccount() || 'admin')
const password = ref('')
const loading = ref(false)
const error = ref('')

const canSubmit = computed(() => account.value.trim() && password.value.trim() && !loading.value)

async function submitLogin() {
  if (!canSubmit.value) return

  loading.value = true
  error.value = ''

  try {
    await loginCheck(account.value.trim(), password.value)
    router.push({ name: 'StreamingChat' })
  } catch (err) {
    error.value = err instanceof Error ? err.message : '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <section class="login-panel">
      <div class="login-visual">
        <div class="brand-mark">AI</div>
        <p class="eyebrow">Project Agent</p >
        <h1>登录智能项目助手</h1>
        <p class="summary">登录后会获取后端签发的 Token，后续知识库刷新和流式对话都会自动携带认证头。</p >

        <div class="signal-grid" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>

      <form class="login-form" @submit.prevent="submitLogin">
        <div>
          <p class="eyebrow">Secure Access</p >
          <h2>账号登录</h2>
        </div>

        <label>
          <span>账号</span>
          <input v-model="account" autocomplete="username" placeholder="请输入账号" />
        </label>

        <label>
          <span>密码</span>
          <input
            v-model="password"
            autocomplete="current-password"
            placeholder="请输入密码"
            type="password"
          />
        </label>

        <p v-if="notice" class="notice-message">{{ notice }}</p >
        <p v-if="error" class="error-message">{{ error }}</p >

        <button :disabled="!canSubmit" type="submit">
          {{ loading ? '登录中...' : '进入工作台' }}
        </button>
      </form>
    </section>
  </main>
</template>

<style scoped>
.login-page {
  display: grid;
  place-items: center;
  width: min(960px, calc(100vw - 32px));
  min-height: min(640px, calc(100vh - 32px));
}

.login-panel {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.95fr);
  width: 100%;
  overflow: hidden;
  border: 1px solid rgba(32, 39, 55, 0.1);
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 24px 70px rgba(31, 41, 55, 0.14);
}

.login-visual {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 540px;
  padding: 42px;
  overflow: hidden;
  color: #f8fafc;
  background:
    linear-gradient(145deg, rgba(11, 18, 32, 0.98), rgba(24, 39, 58, 0.96)),
    #111827;
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  margin-bottom: 24px;
  border-radius: 8px;
  color: #101827;
  background: #9fe6c8;
  font-weight: 900;
}

.eyebrow {
  margin: 0 0 6px;
  color: #6b7280;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}

.login-visual .eyebrow {
  color: #8fb3c2;
}

h1,
h2,
.summary {
  margin: 0;
}

h1 {
  max-width: 360px;
  color: #ffffff;
  font-size: 38px;
  font-weight: 900;
  line-height: 1.12;
}

h2 {
  color: #111827;
  font-size: 26px;
  font-weight: 900;
}

.summary {
  max-width: 420px;
  margin-top: 18px;
  color: #cbd5e1;
}

.signal-grid {
  display: grid;
  grid-template-columns: repeat(2, 86px);
  gap: 12px;
  margin-top: 42px;
}

.signal-grid span {
  height: 56px;
  border: 1px solid rgba(159, 230, 200, 0.28);
  border-radius: 8px;
  background: rgba(159, 230, 200, 0.08);
}

.signal-grid span:nth-child(2),
.signal-grid span:nth-child(3) {
  background: rgba(255, 255, 255, 0.06);
}

.login-form {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 20px;
  padding: 42px;
}

label {
  display: grid;
  gap: 8px;
  color: #334155;
  font-size: 13px;
  font-weight: 800;
}

input {
  width: 100%;
  min-height: 46px;
  padding: 0 14px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  outline: none;
  color: #111827;
  background: #f8fafc;
  font: inherit;
}

input:focus {
  border-color: #355070;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(53, 80, 112, 0.12);
}

button {
  min-height: 48px;
  border: 0;
  border-radius: 8px;
  color: #ffffff;
  background: #2f855a;
  font: inherit;
  font-weight: 900;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    opacity 0.18s ease;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

button:not(:disabled):active {
  transform: translateY(1px);
}

.error-message {
  margin: 0;
  padding: 10px 12px;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #991b1b;
  background: #fef2f2;
}

.notice-message {
  margin: 0;
  padding: 10px 12px;
  border: 1px solid #fed7aa;
  border-radius: 8px;
  color: #9a3412;
  background: #fff7ed;
}

@media (max-width: 760px) {
  .login-page {
    width: 100vw;
    min-height: 100vh;
  }

  .login-panel {
    grid-template-columns: 1fr;
    min-height: 100vh;
    border: 0;
    border-radius: 0;
  }

  .login-visual {
    min-height: auto;
    padding: 28px 22px;
  }

  h1 {
    font-size: 30px;
  }

  .signal-grid {
    display: none;
  }

  .login-form {
    padding: 28px 22px;
  }
}
</style>
