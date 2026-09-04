<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { supabase } from '../lib/supabase'
import { isSuperadmin } from '../lib/auth'
import { depots, depotFilter, muatDepots } from '../lib/depots'
import { AlertTriangle, FileWarning, Users as UsersIcon, ClipboardList, Image as ImageIcon } from '@lucide/vue'

const reports = ref([])
const users = ref([])
const totalFoto = ref(0)
const loading = ref(true)

async function muat() {
  loading.value = true
  let qReports = supabase.from('reports').select('id, created_at, loading_data, discharge_data, penyaluran_data, storage_data')
  let qUsers = supabase.from('profiles').select('id, status')
  let qFoto = supabase.from('report_photos').select('id, reports!inner(depot_id)', { count: 'exact', head: true })

  if (isSuperadmin() && depotFilter.value) {
    qReports = qReports.eq('depot_id', depotFilter.value)
    qUsers = qUsers.eq('depot_id', depotFilter.value)
    qFoto = qFoto.eq('reports.depot_id', depotFilter.value)
  }

  const [r, u, f] = await Promise.all([qReports, qUsers, qFoto])
  reports.value = r.data || []
  users.value = u.data || []
  totalFoto.value = f.count || 0
  loading.value = false
}
onMounted(() => { muat(); muatDepots() })
watch(depotFilter, muat)

function parse(json) { try { return JSON.parse(json || '{}') } catch { return {} } }
function top(list, ambil = 5) {
  const hitung = {}
  list.forEach((v) => { if (v) hitung[v] = (hitung[v] || 0) + 1 })
  return Object.entries(hitung).sort((a, b) => b[1] - a[1]).slice(0, ambil)
}

const totalLaporan = computed(() => reports.value.length)
const userAktif = computed(() => users.value.filter((u) => u.status === 'aktif').length)

const kegiatanPerJenis = computed(() =>
  reports.value.map((r) => ({
    loading: parse(r.loading_data), discharge: parse(r.discharge_data),
    penyaluran: parse(r.penyaluran_data), storage: parse(r.storage_data),
  }))
)
const semuaKegiatan = computed(() => kegiatanPerJenis.value.flatMap((k) => [
  { jenis: 'Loading', ...k.loading }, { jenis: 'Discharge', ...k.discharge },
  { jenis: 'Penyaluran', ...k.penyaluran }, { jenis: 'Storage', ...k.storage },
]))
const totalTemuanTidakAman = computed(() => semuaKegiatan.value.filter((k) => String(k.kondisi).toLowerCase() === 'tidak aman').length)
const persenAman = computed(() => {
  const total = semuaKegiatan.value.length
  return total ? Math.round(((total - totalTemuanTidakAman.value) / total) * 100) : 100
})

// Temuan tidak aman, dipecah per jenis kegiatan.
const temuanPerJenis = computed(() => {
  const jenis = ['Loading', 'Discharge', 'Penyaluran', 'Storage']
  return jenis.map((j) => ({
    jenis: j,
    jumlah: semuaKegiatan.value.filter((k) => k.jenis === j && String(k.kondisi).toLowerCase() === 'tidak aman').length,
  }))
})
const maxTemuanJenis = computed(() => Math.max(1, ...temuanPerJenis.value.map((t) => t.jumlah)))

const tangkiSeringOff = computed(() => {
  const off = reports.value.flatMap((r) => parse(r.storage_data).tangkiOff || [])
  return top(off, 8)
})
const maxOff = computed(() => Math.max(1, ...tangkiSeringOff.value.map((t) => t[1])))

// Personel paling sering bertugas (gabungan ke-4 kegiatan).
const personelTeraktif = computed(() => top(semuaKegiatan.value.map((k) => k.personel), 6))
const maxPersonel = computed(() => Math.max(1, ...personelTeraktif.value.map((p) => p[1])))

// Produk paling sering ditangani (dari Loading & Discharge).
const produkTeratas = computed(() =>
  top(kegiatanPerJenis.value.flatMap((k) => [k.loading.produk, k.discharge.produk]), 6)
)
const maxProduk = computed(() => Math.max(1, ...produkTeratas.value.map((p) => p[1])))

const tujuhHari = computed(() => {
  const hari = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    hari.push({ label: d.toLocaleDateString('id-ID', { weekday: 'short' }), jumlah: reports.value.filter((r) => r.created_at?.slice(0, 10) === key).length })
  }
  return hari
})
const laporanMingguIni = computed(() => tujuhHari.value.reduce((a, h) => a + h.jumlah, 0))
const maxHari = computed(() => Math.max(1, ...tujuhHari.value.map((h) => h.jumlah)))

// Tren 6 bulan terakhir.
const enamBulan = computed(() => {
  const bulan = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    bulan.push({ label: d.toLocaleDateString('id-ID', { month: 'short' }), jumlah: reports.value.filter((r) => r.created_at?.slice(0, 7) === key).length })
  }
  return bulan
})
const maxBulan = computed(() => Math.max(1, ...enamBulan.value.map((b) => b.jumlah)))
</script>

<template>
  <div>
    <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:20px; flex-wrap:wrap; gap:10px">
      <div>
        <h1 style="margin-bottom:4px">Statistik</h1>
        <p style="color:var(--text-muted); margin:0; font-size:13px">Ringkasan diambil dari seluruh laporan patroli yang sudah masuk.</p>
      </div>
      <div v-if="isSuperadmin()" style="display:flex; align-items:center; gap:8px">
        <label style="margin:0; white-space:nowrap">Depot:</label>
        <select v-model="depotFilter" style="width:auto; min-width:180px">
          <option value="">Semua Depot</option>
          <option v-for="d in depots" :key="d.id" :value="d.id">{{ d.nama }}</option>
        </select>
      </div>
    </div>

    <template v-if="!loading">
      <div class="grid-5">
        <div class="card stat-card"><ClipboardList :size="18" color="var(--accent)" /><div class="stat-num">{{ totalLaporan }}</div><div class="stat-label">Total Laporan</div></div>
        <div class="card stat-card"><UsersIcon :size="18" color="var(--accent)" /><div class="stat-num">{{ userAktif }}</div><div class="stat-label">User Aktif</div></div>
        <div class="card stat-card"><FileWarning :size="18" color="var(--danger)" /><div class="stat-num" :style="{ color: totalTemuanTidakAman ? 'var(--danger)' : undefined }">{{ totalTemuanTidakAman }}</div><div class="stat-label">Temuan Tidak Aman</div></div>
        <div class="card stat-card"><AlertTriangle :size="18" color="var(--success)" /><div class="stat-num">{{ persenAman }}%</div><div class="stat-label">Kegiatan Aman</div></div>
        <div class="card stat-card"><ImageIcon :size="18" color="var(--accent)" /><div class="stat-num">{{ totalFoto }}</div><div class="stat-label">Foto Terkumpul</div></div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-title">Laporan per Hari (7 Hari Terakhir) &middot; total {{ laporanMingguIni }}</div>
          <div class="bar-chart">
            <div v-for="h in tujuhHari" :key="h.label" class="bar-col"><span class="bar-val">{{ h.jumlah }}</span><div class="bar" :style="{ height: (h.jumlah / maxHari * 90) + 'px' }"></div><span class="bar-label">{{ h.label }}</span></div>
          </div>
        </div>
        <div class="card">
          <div class="card-title">Tren Laporan per Bulan (6 Bulan Terakhir)</div>
          <div class="bar-chart">
            <div v-for="b in enamBulan" :key="b.label" class="bar-col"><span class="bar-val">{{ b.jumlah }}</span><div class="bar accent2" :style="{ height: (b.jumlah / maxBulan * 90) + 'px' }"></div><span class="bar-label">{{ b.label }}</span></div>
          </div>
        </div>
      </div>

      <div class="grid-2" style="margin-top:16px">
        <div class="card">
          <div class="card-title">Temuan "Tidak Aman" per Jenis Kegiatan</div>
          <div v-for="t in temuanPerJenis" :key="t.jenis" class="hbar-row">
            <span class="hbar-label">{{ t.jenis }}</span>
            <div class="hbar-track"><div class="hbar-fill" :style="{ width: (t.jumlah / maxTemuanJenis * 100) + '%' }"></div></div>
            <span class="hbar-val">{{ t.jumlah }}</span>
          </div>
        </div>
        <div class="card">
          <div class="card-title">Tangki Paling Sering Berstatus "Off"</div>
          <div v-if="!tangkiSeringOff.length" style="color:var(--text-muted); font-size:13px">Belum ada data.</div>
          <div v-for="[tangki, jumlah] in tangkiSeringOff" :key="tangki" class="hbar-row">
            <span class="hbar-label">{{ tangki }}</span>
            <div class="hbar-track"><div class="hbar-fill" :style="{ width: (jumlah / maxOff * 100) + '%' }"></div></div>
            <span class="hbar-val">{{ jumlah }}</span>
          </div>
        </div>
      </div>

      <div class="grid-2" style="margin-top:16px">
        <div class="card">
          <div class="card-title">Personel Paling Aktif Bertugas</div>
          <div v-if="!personelTeraktif.length" style="color:var(--text-muted); font-size:13px">Belum ada data.</div>
          <div v-for="[nama, jumlah] in personelTeraktif" :key="nama" class="hbar-row">
            <span class="hbar-label" style="width:90px">{{ nama }}</span>
            <div class="hbar-track"><div class="hbar-fill accent2" :style="{ width: (jumlah / maxPersonel * 100) + '%' }"></div></div>
            <span class="hbar-val">{{ jumlah }}</span>
          </div>
        </div>
        <div class="card">
          <div class="card-title">Produk Paling Sering Ditangani</div>
          <div v-if="!produkTeratas.length" style="color:var(--text-muted); font-size:13px">Belum ada data.</div>
          <div v-for="[produk, jumlah] in produkTeratas" :key="produk" class="hbar-row">
            <span class="hbar-label" style="width:90px">{{ produk }}</span>
            <div class="hbar-track"><div class="hbar-fill accent2" :style="{ width: (jumlah / maxProduk * 100) + '%' }"></div></div>
            <span class="hbar-val">{{ jumlah }}</span>
          </div>
        </div>
      </div>
    </template>

    <p v-else style="color:var(--text-muted)">Memuat…</p>
  </div>
</template>

<style scoped>
.grid-5 { display: grid; grid-template-columns: repeat(5,1fr); gap: 14px; margin-bottom: 20px; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.stat-card { display: flex; flex-direction: column; gap: 6px; }
.stat-num { font-size: 24px; font-weight: 700; }
.stat-label { font-size: 12px; color: var(--text-muted); }
.card-title { font-size: 13px; color: var(--text-muted); margin-bottom: 16px; }

.bar-chart { display: flex; align-items: flex-end; gap: 10px; height: 140px; }
.bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; height: 100%; justify-content: flex-end; }
.bar-val { font-size: 11px; color: var(--text-muted); }
.bar { width: 100%; background: var(--accent); border-radius: 4px 4px 0 0; min-height: 2px; }
.bar.accent2 { background: var(--sidebar); }
.bar-label { font-size: 11px; color: var(--text-muted); }

.hbar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.hbar-label { width: 70px; font-size: 12px; font-weight: 600; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hbar-track { flex: 1; background: var(--bg); border-radius: 999px; height: 10px; overflow: hidden; }
.hbar-fill { height: 100%; background: var(--danger); border-radius: 999px; }
.hbar-fill.accent2 { background: var(--accent); }
.hbar-val { width: 20px; text-align: right; font-size: 12px; color: var(--text-muted); }
</style>
