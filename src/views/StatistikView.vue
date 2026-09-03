<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../lib/supabase'

const reports = ref([])
const users = ref([])
const loading = ref(true)

onMounted(async () => {
  const [r, u] = await Promise.all([
    supabase.from('reports').select('id, created_at'),
    supabase.from('profiles').select('id, status'),
  ])
  reports.value = r.data || []
  users.value = u.data || []
  loading.value = false
})

const totalLaporan = computed(() => reports.value.length)
const userAktif = computed(() => users.value.filter((u) => u.status === 'aktif').length)

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
    <h1 style="margin-bottom:20px">Statistik</h1>

    <div v-if="!loading" style="display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:20px">
      <div class="card">
        <div style="color:var(--text-muted); font-size:13px">Total Laporan</div>
        <div style="font-size:28px; font-weight:700; margin-top:4px">{{ totalLaporan }}</div>
      </div>
      <div class="card">
        <div style="color:var(--text-muted); font-size:13px">User Aktif</div>
        <div style="font-size:28px; font-weight:700; margin-top:4px">{{ userAktif }}</div>
      </div>
      <div class="card">
        <div style="color:var(--text-muted); font-size:13px">Laporan 7 Hari Terakhir</div>
        <div style="font-size:28px; font-weight:700; margin-top:4px">{{ laporanMingguIni }}</div>
      </div>
    </div>

    <div v-if="!loading" class="card">
      <div style="color:var(--text-muted); font-size:13px; margin-bottom:16px">Laporan per Hari (7 Hari Terakhir)</div>
      <div style="display:flex; align-items:flex-end; gap:14px; height:140px">
        <div v-for="h in tujuhHari" :key="h.label" style="flex:1; display:flex; flex-direction:column; align-items:center; gap:6px; height:100%; justify-content:flex-end">
          <span style="font-size:12px; color:var(--text-muted)">{{ h.jumlah }}</span>
          <div :style="{ height: (h.jumlah / maxHari * 90) + 'px', background: 'var(--accent)', width: '100%', borderRadius: '4px 4px 0 0', minHeight: '2px' }"></div>
          <span style="font-size:12px; color:var(--text-muted)">{{ h.label }}</span>
        </div>
      </div>
    </div>

    <p v-else style="color:var(--text-muted)">Memuat…</p>
  </div>
</template>
