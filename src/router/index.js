import { createRouter, createWebHistory } from 'vue-router'
import { authState } from '../lib/auth'

const routes = [
  { path: '/login', name: 'login', component: () => import('../views/LoginView.vue') },
  { path: '/', name: 'statistik', component: () => import('../views/StatistikView.vue'), meta: { butuhAdmin: true } },
  { path: '/users', name: 'users', component: () => import('../views/UsersView.vue'), meta: { butuhAdmin: true } },
  { path: '/laporan', name: 'laporan', component: () => import('../views/LaporanView.vue'), meta: { butuhAdmin: true } },
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to) => {
  if (to.meta.butuhAdmin && !authState.user) return { name: 'login' }
  if (to.name === 'login' && authState.user) return { name: 'statistik' }
})

export default router
