<script setup>
import { onMounted } from 'vue'
import { sudahDikonfigurasi } from './lib/supabase'
import { authState, initAuth, logout } from './lib/auth'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

onMounted(() => { if (sudahDikonfigurasi) initAuth() })

async function keluar() {
  await logout()
  router.push({ name: 'login' })
}

const menu = [
  { name: 'statistik', label: 'Statistik', path: '/' },
  { name: 'users', label: 'Users', path: '/users' },
  { name: 'laporan', label: 'Laporan', path: '/laporan' },
]
</script>

<template>
  <div v-if="!sudahDikonfigurasi" class="setup-msg">
    <div class="card" style="max-width:420px">
      <h2>Supabase belum dikonfigurasi</h2>
      <p style="color:var(--text-muted)">Salin <code>.env.example</code> menjadi <code>.env</code>, lalu isi URL dan anon key project Supabase Anda.</p>
    </div>
  </div>

  <div v-else-if="!authState.siap" class="setup-msg">Memuat&hellip;</div>

  <div v-else-if="!authState.user" class="full">
    <router-view />
  </div>

  <div v-else class="shell">
    <aside class="sidebar">
      <div class="brand">Tank Report</div>
      <nav>
        <router-link
          v-for="item in menu" :key="item.name"
          :to="item.path"
          :class="['nav-item', { active: route.name === item.name }]"
        >{{ item.label }}</router-link>
      </nav>
      <div class="sidebar-foot">
        <div class="me">{{ authState.profil?.nama || authState.user.email }}</div>
        <button class="btn-outline" style="width:100%" @click="keluar">Keluar</button>
      </div>
    </aside>
    <main class="content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.setup-msg, .full { min-height: 100vh; display: flex; align-items: center; justify-content: center; }
.shell { display: flex; min-height: 100vh; }
.sidebar {
  width: 220px;
  flex-shrink: 0;
  background: var(--sidebar);
  color: var(--sidebar-text);
  display: flex;
  flex-direction: column;
  padding: 20px 14px;
}
.brand { color: #fff; font-weight: 700; font-size: 16px; padding: 8px 10px 20px; }
nav { display: flex; flex-direction: column; gap: 2px; flex: 1; }
.nav-item {
  display: block;
  padding: 10px 12px;
  border-radius: 6px;
  text-decoration: none;
  color: var(--sidebar-text);
  font-size: 14px;
}
.nav-item.active { background: rgba(255,255,255,0.08); color: var(--sidebar-text-active); font-weight: 600; }
.nav-item:hover { color: var(--sidebar-text-active); }
.sidebar-foot { border-top: 1px solid rgba(255,255,255,0.1); padding-top: 14px; margin-top: 14px; }
.me { font-size: 12px; color: var(--sidebar-text); margin-bottom: 8px; word-break: break-all; }
.content { flex: 1; padding: 32px 40px; max-width: 1100px; }
</style>
