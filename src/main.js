import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { sudahDikonfigurasi } from './lib/supabase'
import { initAuth } from './lib/auth'

async function start() {
  // Tunggu cek sesi login selesai DULU, baru mount app+router. Kalau
  // tidak, router bisa sempat mengambil keputusan redirect berdasarkan
  // status login yang belum lengkap (race condition saat refresh halaman).
  if (sudahDikonfigurasi) await initAuth()
  createApp(App).use(router).mount('#app')
}

start()
