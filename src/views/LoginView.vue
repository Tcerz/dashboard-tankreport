<script setup>
import { ref, onMounted } from 'vue'
import { login, isAdmin, logout } from '../lib/auth'
import { useRouter } from 'vue-router'

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const captchaToken = ref('')
const captchaSiap = ref(false)
const router = useRouter()
const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY
let widgetId = null

// Turnstile dimuat lewat <script> di index.html; tunggu sampai window.turnstile siap
// (bisa telat kalau koneksi lambat), baru render widget-nya ke dalam #turnstile-box.
onMounted(() => {
  if (!siteKey) return // belum dikonfigurasi -> form tetap bisa dipakai tanpa captcha
  const tunggu = setInterval(() => {
    if (window.turnstile) {
      clearInterval(tunggu)
      widgetId = window.turnstile.render('#turnstile-box', {
        sitekey: siteKey,
        callback: (token) => { captchaToken.value = token },
        'expired-callback': () => { captchaToken.value = '' },
      })
      captchaSiap.value = true
    }
  }, 200)
})

function resetCaptcha() {
  captchaToken.value = ''
  if (window.turnstile && widgetId !== null) window.turnstile.reset(widgetId)
}

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await login(email.value.trim(), password.value, captchaToken.value || undefined)
    await new Promise((r) => setTimeout(r, 300))
    if (!isAdmin()) {
      await logout()
      error.value = 'Akun ini bukan admin/superadmin. Dashboard hanya untuk admin.'
      return
    }
    router.push({ name: 'statistik' })
  } catch (e) {
    error.value = 'Login gagal. Periksa email, password, atau verifikasi keamanan di bawah.'
  } finally {
    resetCaptcha()
    loading.value = false
  }
}
</script>

<template>
  <div class="wrap">
    <form class="card" style="width:340px" @submit.prevent="submit">
      <h2 style="margin-bottom:4px">DIGISAFPAT</h2>
      <p style="color:var(--text-muted); margin:0 0 20px">Digital Safety Patrol &mdash; Masuk sebagai admin</p>

      <label>Email</label>
      <input v-model="email" type="email" required style="margin-bottom:14px" />

      <label>Password</label>
      <input v-model="password" type="password" required style="margin-bottom:16px" />

      <div id="turnstile-box" style="margin-bottom:14px"></div>

      <p v-if="error" style="color:var(--danger); font-size:13px; margin:0 0 12px">{{ error }}</p>

      <button class="btn" style="width:100%" :disabled="loading || (siteKey && captchaSiap && !captchaToken)" type="submit">
        {{ loading ? 'Memproses…' : 'Masuk' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; }
</style>
