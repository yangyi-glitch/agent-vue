import { createRouter, createWebHistory } from 'vue-router'
import LoginPage from '@/views/LoginPage.vue'
import StreamingChat from '@/views/StreamingChat.vue'
import { getToken } from '@/utils/session'

const routes = [
  {
    path: '/',
    name: 'LoginPage',
    component: LoginPage,
    props: (route) => ({ notice: route.query.notice ? String(route.query.notice) : '' }),
  },
  {
    path: '/chat',
    name: 'StreamingChat',
    component: StreamingChat,
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const isAuthed = Boolean(getToken())

  if (to.meta.requiresAuth && !isAuthed) {
    return { name: 'LoginPage' }
  }

  if (to.name === 'LoginPage' && isAuthed) {
    return { name: 'StreamingChat' }
  }

  return true
})

export default router
