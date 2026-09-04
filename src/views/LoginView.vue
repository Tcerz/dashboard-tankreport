<script setup>
import { ref } from 'vue'
import { login, isAdmin, logout } from '../lib/auth'
import { useRouter } from 'vue-router'

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const router = useRouter()

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await login(email.value.trim(), password.value)
    // Tunggu profil termuat lalu pastikan yang login memang admin.
    await new Promise((r) => setTimeout(r, 300))
    if (!isAdmin()) {
      await logout()
      error.value = 'Akun ini bukan admin/superadmin. Dashboard hanya untuk admin.'
      return
    }
    router.push({ name: 'statistik' })
  } catch (e) {
    error.value = 'Login gagal. Periksa email & password.'
  } finally {
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

      <p v-if="error" style="color:var(--danger); font-size:13px; margin:0 0 12px">{{ error }}</p>

      <button class="btn" style="width:100%" :disabled="loading" type="submit">
        {{ loading ? 'Memproses…' : 'Masuk' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; }
</style>
