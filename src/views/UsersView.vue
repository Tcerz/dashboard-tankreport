<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import { authState, isSuperadmin } from '../lib/auth'
import { depots, muatDepots, tambahDepot } from '../lib/depots'
import { Plus, UserPlus, Pencil, KeyRound, Trash2, X, MapPin } from '@lucide/vue'

const users = ref([])
const loading = ref(true)
const showForm = ref(false)
const saving = ref(false)
const error = ref('')

const form = ref({ nama: '', email: '', password: '', role: 'user', depotId: '' })
const editUser = ref(null)
const resetUser = ref(null)
const passwordBaru = ref('')
const aksiError = ref('')
const aksiLoading = ref(false)
const depotBaru = ref('')
const showDepotForm = ref(false)

async function muat() {
  loading.value = true
  // RLS otomatis membatasi: admin biasa cuma dapat baris user di depotnya sendiri.
  const { data } = await supabase.from('profiles').select('*, depots(nama)').order('created_at', { ascending: false })
  users.value = data || []
  loading.value = false
}
onMounted(() => { muat(); muatDepots() })

async function tambahUser() {
  error.value = ''
  saving.value = true
  try {
    const { error: fnError } = await supabase.functions.invoke('create-user', { body: form.value })
    if (fnError) throw fnError
    form.value = { nama: '', email: '', password: '', role: 'user', depotId: '' }
    showForm.value = false
    await muat()
  } catch (e) {
    error.value = 'Gagal menambah user: ' + (e.message || 'terjadi kesalahan')
  } finally {
    saving.value = false
  }
}

async function simpanDepotBaru() {
  if (!depotBaru.value.trim()) return
  try {
    await tambahDepot(depotBaru.value)
    depotBaru.value = ''
    showDepotForm.value = false
  } catch (e) {
    alert('Gagal menambah depot: ' + e.message)
  }
}

async function toggleStatus(u) {
  const statusBaru = u.status === 'aktif' ? 'nonaktif' : 'aktif'
  await supabase.from('profiles').update({ status: statusBaru }).eq('id', u.id)
  u.status = statusBaru
}

function bukaEdit(u) { editUser.value = { id: u.id, nama: u.nama, role: u.role, depot_id: u.depot_id }; aksiError.value = '' }
async function simpanEdit() {
  aksiLoading.value = true
  aksiError.value = ''
  try {
    const payload = { nama: editUser.value.nama.trim() }
    if (isSuperadmin()) { payload.role = editUser.value.role; payload.depot_id = editUser.value.depot_id || null }
    const { error: e } = await supabase.from('profiles').update(payload).eq('id', editUser.value.id)
    if (e) throw e
    editUser.value = null
    await muat()
  } catch (e) {
    aksiError.value = 'Gagal menyimpan: ' + e.message
  } finally {
    aksiLoading.value = false
  }
}

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

async function hapusUser(u) {
  if (u.id === authState.user.id) { alert('Tidak bisa menghapus akun sendiri.'); return }
  if (!confirm(`Hapus akun "${u.nama}"? Tindakan ini tidak bisa dibatalkan.`)) return
  const { error: e } = await supabase.functions.invoke('manage-user', { body: { action: 'delete', userId: u.id } })
  if (e) { alert('Gagal menghapus: ' + e.message); return }
  await muat()
}

function labelRole(r) { return r === 'superadmin' ? 'Superadmin' : r === 'admin' ? 'Admin' : 'Petugas' }
</script>

<template>
  <div>
    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; flex-wrap:wrap; gap:12px">
      <div>
        <h1 style="margin-bottom:4px">Users</h1>
        <p style="color:var(--text-muted); margin:0; font-size:13px">Kelola akun petugas &amp; admin yang boleh mengakses sistem.</p>
      </div>
      <button class="btn" style="display:flex; align-items:center; gap:6px" @click="showForm = !showForm">
        <Plus :size="16" /> {{ showForm ? 'Batal' : 'Tambah User' }}
      </button>
    </div>

    <!-- Kelola Depot (superadmin saja) -->
    <div v-if="isSuperadmin()" class="card" style="margin-bottom:16px">
      <div style="display:flex; justify-content:space-between; align-items:center">
        <div style="display:flex; align-items:center; gap:8px; font-size:13px; font-weight:600">
          <MapPin :size="15" /> Daftar Depot ({{ depots.length }})
        </div>
        <button class="btn-outline" style="padding:6px 12px; font-size:13px" @click="showDepotForm = !showDepotForm">
          {{ showDepotForm ? 'Batal' : '+ Depot Baru' }}
        </button>
      </div>
      <div v-if="showDepotForm" style="display:flex; gap:8px; margin-top:12px">
        <input v-model="depotBaru" placeholder="Nama depot, mis. Depot Siak" @keyup.enter="simpanDepotBaru" />
        <button class="btn" style="flex-shrink:0" @click="simpanDepotBaru">Simpan</button>
      </div>
      <div v-if="depots.length" style="display:flex; flex-wrap:wrap; gap:6px; margin-top:12px">
        <span v-for="d in depots" :key="d.id" class="badge badge-neutral">{{ d.nama }}</span>
      </div>
    </div>

    <form v-if="showForm" class="card form-grid" style="margin-bottom:20px" @submit.prevent="tambahUser">
      <div style="grid-column:1/-1; display:flex; align-items:center; gap:8px; color:var(--text-muted); font-size:13px; margin-bottom:-4px">
        <UserPlus :size="15" /> Akun baru langsung aktif, tanpa perlu verifikasi email
      </div>
      <div><label>Nama</label><input v-model="form.nama" required /></div>
      <div><label>Email</label><input v-model="form.email" type="email" required /></div>
      <div><label>Password sementara</label><input v-model="form.password" type="text" minlength="6" required /></div>

      <div v-if="isSuperadmin()">
        <label>Peran</label>
        <select v-model="form.role">
          <option value="user">Petugas</option>
          <option value="admin">Admin</option>
          <option value="superadmin">Superadmin</option>
        </select>
      </div>
      <div v-else><label>Peran</label><input value="Petugas" disabled style="background:var(--bg)" /></div>

      <div v-if="isSuperadmin() && form.role !== 'superadmin'">
        <label>Depot</label>
        <select v-model="form.depotId" required>
          <option value="" disabled>Pilih depot…</option>
          <option v-for="d in depots" :key="d.id" :value="d.id">{{ d.nama }}</option>
        </select>
      </div>
      <div v-else-if="!isSuperadmin()">
        <label>Depot</label>
        <input :value="authState.profil?.depots?.nama || 'Depot Anda'" disabled style="background:var(--bg)" />
      </div>

      <p v-if="error" style="grid-column:1/-1; color:var(--danger); font-size:13px; margin:0">{{ error }}</p>
      <div style="grid-column:1/-1">
        <button class="btn" :disabled="saving" type="submit">{{ saving ? 'Menyimpan…' : 'Simpan User' }}</button>
      </div>
    </form>

    <div class="card" style="padding:0">
      <table>
        <thead>
          <tr><th>Nama</th><th>Email</th><th>Peran</th><th>Depot</th><th>Status</th><th style="width:280px"></th></tr>
        </thead>
        <tbody>
          <tr v-if="loading"><td colspan="6" style="text-align:center; color:var(--text-muted)">Memuat…</td></tr>
          <tr v-else-if="!users.length"><td colspan="6" style="text-align:center; color:var(--text-muted)">Belum ada user</td></tr>
          <tr v-for="u in users" :key="u.id">
            <td>{{ u.nama }}</td>
            <td>{{ u.email }}</td>
            <td><span class="badge badge-neutral">{{ labelRole(u.role) }}</span></td>
            <td>{{ u.depots?.nama || '-' }}</td>
            <td>
              <span :class="['badge', u.status === 'aktif' ? 'badge-success' : 'badge-danger']">
                {{ u.status === 'aktif' ? 'Aktif' : 'Nonaktif' }}
              </span>
            </td>
            <td>
              <div style="display:flex; gap:6px; justify-content:flex-end">
                <button class="icon-action" title="Edit" @click="bukaEdit(u)"><Pencil :size="15" /></button>
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

    <div v-if="editUser" class="modal-overlay" @click.self="editUser = null">
      <div class="modal">
        <div class="modal-head"><h3>Edit User</h3><button class="icon-action" @click="editUser = null"><X :size="16" /></button></div>
        <label>Nama</label>
        <input v-model="editUser.nama" style="margin-bottom:12px" />
        <template v-if="isSuperadmin()">
          <label>Peran</label>
          <select v-model="editUser.role" style="margin-bottom:12px">
            <option value="user">Petugas</option>
            <option value="admin">Admin</option>
            <option value="superadmin">Superadmin</option>
          </select>
          <label>Depot</label>
          <select v-model="editUser.depot_id" style="margin-bottom:16px">
            <option :value="null">- Tidak ada -</option>
            <option v-for="d in depots" :key="d.id" :value="d.id">{{ d.nama }}</option>
          </select>
        </template>
        <p v-if="aksiError" style="color:var(--danger); font-size:13px">{{ aksiError }}</p>
        <button class="btn" style="width:100%" :disabled="aksiLoading" @click="simpanEdit">{{ aksiLoading ? 'Menyimpan…' : 'Simpan Perubahan' }}</button>
      </div>
    </div>

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
.icon-action { background: transparent; color: var(--text-muted); padding: 6px; border-radius: 4px; display: flex; align-items: center; }
.icon-action:hover { background: var(--bg); color: var(--text); }
.icon-action.danger:hover { background: var(--danger-soft); color: var(--danger); }

.modal-overlay { position: fixed; inset: 0; background: rgba(20,33,49,0.4); display: flex; align-items: center; justify-content: center; z-index: 60; }
.modal { background: #fff; border-radius: 8px; padding: 20px; width: 360px; max-width: 92vw; }
.modal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.modal-head h3 { font-size: 16px; }

.form-grid { display: grid; gap: 12px; grid-template-columns: 1fr 1fr; }

@media (max-width: 640px) {
  .form-grid { grid-template-columns: 1fr; }
}
</style>
