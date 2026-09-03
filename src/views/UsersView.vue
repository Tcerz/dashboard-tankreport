<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import { authState } from '../lib/auth'
import { Plus, UserPlus, Pencil, KeyRound, Trash2, X } from '@lucide/vue'

const users = ref([])
const loading = ref(true)
const showForm = ref(false)
const saving = ref(false)
const error = ref('')

const form = ref({ nama: '', email: '', password: '', role: 'user' })
const editUser = ref(null)      // { id, nama, role } saat modal Edit terbuka
const resetUser = ref(null)     // { id, nama } saat modal Reset Password terbuka
const passwordBaru = ref('')
const aksiError = ref('')
const aksiLoading = ref(false)

async function muat() {
  loading.value = true
  const { data } = await supabase.from('profiles').select().order('created_at', { ascending: false })
  users.value = data || []
  loading.value = false
}
onMounted(muat)

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

// --- Edit nama & peran ---
function bukaEdit(u) { editUser.value = { id: u.id, nama: u.nama, role: u.role }; aksiError.value = '' }
async function simpanEdit() {
  aksiLoading.value = true
  aksiError.value = ''
  try {
    const { error: e } = await supabase.from('profiles')
      .update({ nama: editUser.value.nama.trim(), role: editUser.value.role })
      .eq('id', editUser.value.id)
    if (e) throw e
    editUser.value = null
    await muat()
  } catch (e) {
    aksiError.value = 'Gagal menyimpan: ' + e.message
  } finally {
    aksiLoading.value = false
  }
}

// --- Reset password ---
function bukaReset(u) { resetUser.value = { id: u.id, nama: u.nama }; passwordBaru.value = ''; aksiError.value = '' }
async function simpanReset() {
  aksiLoading.value = true
  aksiError.value = ''
  try {
    const { error: e } = await supabase.functions.invoke('manage-user', {
      body: { action: 'reset_password', userId: resetUser.value.id, password: passwordBaru.value },
    })
    if (e) throw e
    resetUser.value = null
  } catch (e) {
    aksiError.value = 'Gagal reset password: ' + (e.message || 'terjadi kesalahan')
  } finally {
    aksiLoading.value = false
  }
}

// --- Hapus akun ---
async function hapusUser(u) {
  if (u.id === authState.user.id) { alert('Tidak bisa menghapus akun sendiri.'); return }
  if (!confirm(`Hapus akun "${u.nama}"? Tindakan ini tidak bisa dibatalkan.`)) return
  const { error: e } = await supabase.functions.invoke('manage-user', {
    body: { action: 'delete', userId: u.id },
  })
  if (e) { alert('Gagal menghapus: ' + e.message); return }
  await muat()
}
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
          <tr><th>Nama</th><th>Email</th><th>Peran</th><th>Status</th><th style="width:280px"></th></tr>
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
              <div style="display:flex; gap:6px; justify-content:flex-end">
                <button class="icon-action" title="Edit nama/peran" @click="bukaEdit(u)"><Pencil :size="15" /></button>
                <button class="icon-action" title="Reset password" @click="bukaReset(u)"><KeyRound :size="15" /></button>
                <button class="btn-outline" style="padding:6px 12px" @click="toggleStatus(u)">
                  {{ u.status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan' }}
                </button>
                <button class="icon-action danger" title="Hapus akun" @click="hapusUser(u)"><Trash2 :size="15" /></button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal Edit -->
    <div v-if="editUser" class="modal-overlay" @click.self="editUser = null">
      <div class="modal">
        <div class="modal-head"><h3>Edit User</h3><button class="icon-action" @click="editUser = null"><X :size="16" /></button></div>
        <label>Nama</label>
        <input v-model="editUser.nama" style="margin-bottom:12px" />
        <label>Peran</label>
        <select v-model="editUser.role" style="margin-bottom:16px">
          <option value="user">Petugas</option>
          <option value="admin">Admin</option>
        </select>
        <p v-if="aksiError" style="color:var(--danger); font-size:13px">{{ aksiError }}</p>
        <button class="btn" style="width:100%" :disabled="aksiLoading" @click="simpanEdit">{{ aksiLoading ? 'Menyimpan…' : 'Simpan Perubahan' }}</button>
      </div>
    </div>

    <!-- Modal Reset Password -->
    <div v-if="resetUser" class="modal-overlay" @click.self="resetUser = null">
      <div class="modal">
        <div class="modal-head"><h3>Reset Password</h3><button class="icon-action" @click="resetUser = null"><X :size="16" /></button></div>
        <p style="font-size:13px; color:var(--text-muted); margin-top:0">Untuk akun <strong>{{ resetUser.nama }}</strong>. Password lama tidak bisa dilihat — ini akan menggantinya dengan password baru.</p>
        <label>Password Baru (min. 6 karakter)</label>
        <input v-model="passwordBaru" type="text" minlength="6" style="margin-bottom:16px" />
        <p v-if="aksiError" style="color:var(--danger); font-size:13px">{{ aksiError }}</p>
        <button class="btn" style="width:100%" :disabled="aksiLoading || passwordBaru.length < 6" @click="simpanReset">{{ aksiLoading ? 'Menyimpan…' : 'Set Password Baru' }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.icon-action {
  background: transparent;
  color: var(--text-muted);
  padding: 6px;
  border-radius: 4px;
  display: flex;
  align-items: center;
}
.icon-action:hover { background: var(--bg); color: var(--text); }
.icon-action.danger:hover { background: var(--danger-soft); color: var(--danger); }

.modal-overlay {
  position: fixed; inset: 0; background: rgba(20,33,49,0.4);
  display: flex; align-items: center; justify-content: center; z-index: 60;
}
.modal { background: #fff; border-radius: 8px; padding: 20px; width: 360px; max-width: 92vw; }
.modal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.modal-head h3 { font-size: 16px; }
</style>
