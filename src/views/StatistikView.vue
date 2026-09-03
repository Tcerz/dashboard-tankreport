<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { AlertTriangle, FileWarning, Users as UsersIcon, ClipboardList } from '@lucide/vue'

const reports = ref([])
const users = ref([])
const loading = ref(true)

onMounted(async () => {
  const [r, u] = await Promise.all([
    supabase.from('reports').select('id, created_at, loading_data, discharge_data, penyaluran_data, storage_data'),
    supabase.from('profiles').select('id, status'),
  ])
  reports.value = r.data || []
  users.value = u.data || []
  loading.value = false
})

function parse(json) { try { return JSON.parse(json || '{}') } catch { return {} } }

const totalLaporan = computed(() => reports.value.length)
const userAktif = computed(() => users.value.filter((u) => u.status === 'aktif').length)

// Kumpulkan ke-4 kegiatan dari semua laporan untuk dianalisis kondisinya.
const semuaKegiatan = computed(() =>
  reports.value.flatMap((r) => [
    { jenis: 'Loading', ...parse(r.loading_data) },
    { jenis: 'Discharge', ...parse(r.discharge_data) },
    { jenis: 'Penyaluran', ...parse(r.penyaluran_data) },
    { jenis: 'Storage', ...parse(r.storage_data) },
  ])
)

const totalTemuanTidakAman = computed(() =>
  semuaKegiatan.value.filter((k) => String(k.kondisi).toLowerCase() === 'tidak aman').length
)

const persenAman = computed(() => {
  const total = semuaKegiatan.value.length
  if (!total) return 100
  return Math.round(((total - totalTemuanTidakAman.value) / total) * 100)
})

// Frekuensi tangki berstatus "Off" di seluruh laporan storage.
const tangkiSeringOff = computed(() => {
  const hitung = {}
  reports.value.forEach((r) => {
    const off = parse(r.storage_data).tangkiOff || []
    off.forEach((t) => { hitung[t] = (hitung[t] || 0) + 1 })
  })
  return Object.entries(hitung).sort((a, b) => b[1] - a[1]).slice(0, 8)
})
const maxOff = computed(() => Math.max(1, ...tangkiSeringOff.value.map((t) => t[1])))

const tujuhHari = computed(() => {
  const hari = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const jumlah = reports.value.filter((r) => r.created_at?.slice(0, 10) === key).length
    hari.push({ label: d.toLocaleDateString('id-ID', { weekday: 'short' }), jumlah })
  }
  return hari
})
const laporanMingguIni = computed(() => tujuhHari.value.reduce((a, h) => a + h.jumlah, 0))
const maxHari = computed(() => Math.max(1, ...tujuhHari.value.map((h) => h.jumlah)))
</script>

<template>
  <div>
    <h1 style="margin-bottom:4px">Statistik</h1>
    <p style="color:var(--text-muted); margin:0 0 20px; font-size:13px">Ringkasan diambil dari seluruh laporan patroli yang sudah masuk.</p>

    <template v-if="!loading">
      <div class="grid-4">
        <div class="card stat-card">
          <ClipboardList :size="18" color="var(--accent)" />
          <div class="stat-num">{{ totalLaporan }}</div>
          <div class="stat-label">Total Laporan</div>
        </div>
        <div class="card stat-card">
          <UsersIcon :size="18" color="var(--accent)" />
          <div class="stat-num">{{ userAktif }}</div>
          <div class="stat-label">User Aktif</div>
        </div>
        <div class="card stat-card">
          <FileWarning :size="18" color="var(--danger)" />
          <div class="stat-num" :style="{ color: totalTemuanTidakAman ? 'var(--danger)' : undefined }">{{ totalTemuanTidakAman }}</div>
          <div class="stat-label">Temuan Tidak Aman</div>
        </div>
        <div class="card stat-card">
          <AlertTriangle :size="18" color="var(--success)" />
          <div class="stat-num">{{ persenAman }}%</div>
          <div class="stat-label">Kegiatan Berstatus Aman</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-title">Laporan per Hari (7 Hari Terakhir) &middot; total {{ laporanMingguIni }}</div>
          <div class="bar-chart">
            <div v-for="h in tujuhHari" :key="h.label" class="bar-col">
              <span class="bar-val">{{ h.jumlah }}</span>
              <div class="bar" :style="{ height: (h.jumlah / maxHari * 90) + 'px' }"></div>
              <span class="bar-label">{{ h.label }}</span>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-title">Tangki Paling Sering Berstatus "Off"</div>
          <div v-if="!tangkiSeringOff.length" style="color:var(--text-muted); font-size:13px">Belum ada data tangki off.</div>
          <div v-for="[tangki, jumlah] in tangkiSeringOff" :key="tangki" class="hbar-row">
            <span class="hbar-label">{{ tangki }}</span>
            <div class="hbar-track"><div class="hbar-fill" :style="{ width: (jumlah / maxOff * 100) + '%' }"></div></div>
            <span class="hbar-val">{{ jumlah }}</span>
          </div>
        </div>
      </div>
    </template>

    <p v-else style="color:var(--text-muted)">Memuat…</p>
  </div>
</template>

<style scoped>
.grid-4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; margin-bottom: 20px; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.stat-card { display: flex; flex-direction: column; gap: 6px; }
.stat-num { font-size: 26px; font-weight: 700; }
.stat-label { font-size: 12px; color: var(--text-muted); }
.card-title { font-size: 13px; color: var(--text-muted); margin-bottom: 16px; }

.bar-chart { display: flex; align-items: flex-end; gap: 10px; height: 140px; }
.bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; height: 100%; justify-content: flex-end; }
.bar-val { font-size: 11px; color: var(--text-muted); }
.bar { width: 100%; background: var(--accent); border-radius: 4px 4px 0 0; min-height: 2px; }
.bar-label { font-size: 11px; color: var(--text-muted); }

.hbar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.hbar-label { width: 44px; font-size: 12px; font-weight: 600; flex-shrink: 0; }
.hbar-track { flex: 1; background: var(--bg); border-radius: 999px; height: 10px; overflow: hidden; }
.hbar-fill { height: 100%; background: var(--danger); border-radius: 999px; }
.hbar-val { width: 20px; text-align: right; font-size: 12px; color: var(--text-muted); }
</style>
