<script setup>
import { watch, ref } from 'vue'
import { sudahDikonfigurasi } from './lib/supabase'
import { authState, logout } from './lib/auth'
import { pasangPelacakAktivitas } from './lib/idle'
import { muatDepots } from './lib/depots'
import { useRouter, useRoute } from 'vue-router'
import { LayoutDashboard, Users, FileText, LogOut, ShieldCheck, Menu, X } from '@lucide/vue'

const router = useRouter()
const route = useRoute()
let autoLogoutTerpasang = false
const sidebarTerbuka = ref(false)

// { immediate: true } penting: saat refresh, authState.user BISA SAJA sudah
// bernilai isi sejak sebelum komponen ini dibuat (karena initAuth() di
// main.js sudah selesai duluan) -- tanpa immediate, watcher ini tidak akan
// pernah terpanggil untuk kasus sesi yang di-restore lewat refresh.
watch(
  () => authState.user,
  (user) => {
    if (user && !autoLogoutTerpasang) {
      autoLogoutTerpasang = true
      pasangPelacakAktivitas()
      muatDepots()
    }
  },
  { immediate: true }
)

// Tutup sidebar otomatis tiap pindah halaman (khusus tampilan mobile).
watch(() => route.name, () => { sidebarTerbuka.value = false })

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
    <!-- Topbar khusus mobile -->
    <header class="topbar">
      <button class="icon-btn" @click="sidebarTerbuka = true"><Menu :size="22" /></button>
      <div class="topbar-brand"><ShieldCheck :size="17" /> DIGISAFPAT</div>
    </header>

    <div v-if="sidebarTerbuka" class="sidebar-overlay" @click="sidebarTerbuka = false"></div>

    <aside class="sidebar" :class="{ open: sidebarTerbuka }">
      <div class="brand">
        <ShieldCheck :size="20" />
        <div>
          <div class="brand-name">DIGISAFPAT</div>
          <div class="brand-sub">Digital Safety Patrol</div>
        </div>
        <button class="icon-btn close-sidebar" @click="sidebarTerbuka = false"><X :size="18" /></button>
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
.setup-msg, .full { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 16px; }
.shell { display: flex; min-height: 100vh; }

.topbar { display: none; }
.close-sidebar { display: none; }

.sidebar {
  width: 232px;
  flex-shrink: 0;
  background: var(--sidebar);
  color: var(--sidebar-text);
  display: flex;
  flex-direction: column;
  padding: 22px 14px;
}
.brand { display: flex; align-items: center; gap: 10px; color: #fff; padding: 8px 10px 24px; position: relative; }
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
.content { flex: 1; padding: 32px 40px; max-width: 1200px; min-width: 0; }
.icon-btn { background: transparent; color: inherit; padding: 6px; display: flex; }

.sidebar-overlay { display: none; }

/* ---- Mobile (<= 860px): sidebar jadi drawer geser dari kiri ---- */
@media (max-width: 860px) {
  .shell { flex-direction: column; }
  .topbar {
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--sidebar);
    color: #fff;
    padding: 12px 14px;
    position: sticky;
    top: 0;
    z-index: 30;
  }
  .topbar-brand { display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 14px; }

  .sidebar-overlay { display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 45; }

  .sidebar {
    position: fixed;
    top: 0; bottom: 0; left: 0;
    width: 78vw;
    max-width: 280px;
    transform: translateX(-100%);
    transition: transform 0.2s ease;
    z-index: 50;
  }
  .sidebar.open { transform: translateX(0); }
  .close-sidebar { display: flex; position: absolute; right: 0; top: 6px; }

  .content { padding: 18px; max-width: 100%; }
}
</style>
