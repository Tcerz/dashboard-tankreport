<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import { Plus, UserPlus } from '@lucide/vue'

const users = ref([])
const loading = ref(true)
const showForm = ref(false)
const saving = ref(false)
const error = ref('')

const form = ref({ nama: '', email: '', password: '', role: 'user' })

async function muat() {
  loading.value = true
  const { data } = await supabase.from('profiles').select().order('created_at', { ascending: false })
  users.value = data || []
  loading.value = false
}

async function tambahUser() {
  error.value = ''
  saving.value = true
  try {
    const { error: fnError } = await supabase.functions.invoke('create-user', { body: form.value })
    if (fnError) throw fnError
    form.value = { nama: '', email: '', password: '', role: 'user' }
    showForm.value = false
    await muat()
  } catch (e) {
    error.value = 'Gagal menambah user: ' + (e.message || 'terjadi kesalahan')
  } finally {
    saving.value = false
  }
}

async function toggleStatus(u) {
  const statusBaru = u.status === 'aktif' ? 'nonaktif' : 'aktif'
  await supabase.from('profiles').update({ status: statusBaru }).eq('id', u.id)
  u.status = statusBaru
}

onMounted(muat)
</script>

<template>
  <div>
    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px">
      <div>
        <h1 style="margin-bottom:4px">Users</h1>
        <p style="color:var(--text-muted); margin:0; font-size:13px">Kelola akun petugas &amp; admin yang boleh mengakses sistem.</p>
      </div>
      <button class="btn" style="display:flex; align-items:center; gap:6px" @click="showForm = !showForm">
        <Plus :size="16" /> {{ showForm ? 'Batal' : 'Tambah User' }}
      </button>
    </div>

    <form v-if="showForm" class="card" style="margin-bottom:20px; display:grid; gap:12px; grid-template-columns:1fr 1fr" @submit.prevent="tambahUser">
      <div style="grid-column:1/-1; display:flex; align-items:center; gap:8px; color:var(--text-muted); font-size:13px; margin-bottom:-4px">
        <UserPlus :size="15" /> Akun baru langsung aktif, tanpa perlu verifikasi email
      </div>
      <div><label>Nama</label><input v-model="form.nama" required /></div>
      <div><label>Email</label><input v-model="form.email" type="email" required /></div>
      <div><label>Password sementara</label><input v-model="form.password" type="text" minlength="6" required /></div>
      <div>
        <label>Peran</label>
        <select v-model="form.role">
          <option value="user">Petugas</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <p v-if="error" style="grid-column:1/-1; color:var(--danger); font-size:13px; margin:0">{{ error }}</p>
      <div style="grid-column:1/-1">
        <button class="btn" :disabled="saving" type="submit">{{ saving ? 'Menyimpan…' : 'Simpan User' }}</button>
      </div>
    </form>

    <div class="card" style="padding:0">
      <table>
        <thead>
          <tr><th>Nama</th><th>Email</th><th>Peran</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          <tr v-if="loading"><td colspan="5" style="text-align:center; color:var(--text-muted)">Memuat…</td></tr>
          <tr v-else-if="!users.length"><td colspan="5" style="text-align:center; color:var(--text-muted)">Belum ada user</td></tr>
          <tr v-for="u in users" :key="u.id">
            <td>{{ u.nama }}</td>
            <td>{{ u.email }}</td>
            <td><span class="badge badge-neutral">{{ u.role === 'admin' ? 'Admin' : 'Petugas' }}</span></td>
            <td>
              <span :class="['badge', u.status === 'aktif' ? 'badge-success' : 'badge-danger']">
                {{ u.status === 'aktif' ? 'Aktif' : 'Nonaktif' }}
              </span>
            </td>
            <td>
              <button class="btn-outline" @click="toggleStatus(u)">
                {{ u.status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
