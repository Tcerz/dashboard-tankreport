<script setup>
import { onMounted, watch } from 'vue'
import { sudahDikonfigurasi } from './lib/supabase'
import { authState, initAuth, logout } from './lib/auth'
import { initAutoLogout } from './lib/idle'
import { muatDepots } from './lib/depots'
import { useRouter, useRoute } from 'vue-router'
import { LayoutDashboard, Users, FileText, LogOut, ShieldCheck } from '@lucide/vue'

const router = useRouter()
const route = useRoute()
let autoLogoutTerpasang = false

onMounted(() => { if (sudahDikonfigurasi) initAuth() })

// Pasang auto-logout begitu status login diketahui (sekali saja).
watch(
  () => authState.user,
  (user) => {
    if (user && !autoLogoutTerpasang) {
      autoLogoutTerpasang = true
      initAutoLogout()
      muatDepots()
    }
  }
)

async function keluar() {
  await logout()
  router.push({ name: 'login' })
}

const menu = [
  { name: 'statistik', label: 'Statistik', path: '/', icon: LayoutDashboard },
  { name: 'users', label: 'Users', path: '/users', icon: Users },
  { name: 'laporan', label: 'Laporan', path: '/laporan', icon: FileText },
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
      <div class="brand">
        <ShieldCheck :size="20" />
        <div>
          <div class="brand-name">DIGISAFPAT</div>
          <div class="brand-sub">Digital Safety Patrol</div>
        </div>
      </div>
      <nav>
        <router-link
          v-for="item in menu" :key="item.name"
          :to="item.path"
          :class="['nav-item', { active: route.name === item.name }]"
        >
          <component :is="item.icon" :size="17" />
          {{ item.label }}
        </router-link>
      </nav>
      <div class="sidebar-foot">
        <div class="me">
          <div class="me-name">{{ authState.profil?.nama || authState.user.email }}</div>
          <div class="me-role">
            {{ authState.profil?.role === 'superadmin' ? 'Superadmin \u2014 Semua Depot' : authState.profil?.role === 'admin' ? `Admin \u2014 ${authState.profil?.depots?.nama || '-'}` : 'Admin' }}
          </div>
        </div>
        <button class="logout-btn" @click="keluar">
          <LogOut :size="16" /> Keluar
        </button>
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
  width: 232px;
  flex-shrink: 0;
  background: var(--sidebar);
  color: var(--sidebar-text);
  display: flex;
  flex-direction: column;
  padding: 22px 14px;
}
.brand { display: flex; align-items: center; gap: 10px; color: #fff; padding: 8px 10px 24px; }
.brand-name { font-weight: 700; font-size: 15px; letter-spacing: 0.02em; }
.brand-sub { font-size: 11px; color: var(--sidebar-text); }
nav { display: flex; flex-direction: column; gap: 2px; flex: 1; }
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 6px;
  text-decoration: none;
  color: var(--sidebar-text);
  font-size: 14px;
}
.nav-item.active { background: rgba(255,255,255,0.08); color: var(--sidebar-text-active); font-weight: 600; }
.nav-item:hover { color: var(--sidebar-text-active); }
.sidebar-foot { border-top: 1px solid rgba(255,255,255,0.1); padding-top: 14px; margin-top: 14px; }
.me { margin-bottom: 12px; }
.me-name { font-size: 13px; color: #fff; font-weight: 600; word-break: break-word; }
.me-role { font-size: 11px; color: var(--sidebar-text); }
.logout-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--danger);
  color: #fff;
  font-weight: 600;
  font-size: 13px;
}
.logout-btn:hover { filter: brightness(1.1); }
.content { flex: 1; padding: 32px 40px; max-width: 1200px; }
</style>

