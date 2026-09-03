<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

const laporan = ref([])
const loading = ref(true)

onMounted(async () => {
  const { data } = await supabase
    .from('reports')
    .select('id, tanggal, jam_patroli, pic_patroli, nama_pembuat, created_at')
    .order('created_at', { ascending: false })
  laporan.value = data || []
  loading.value = false
})
</script>

<template>
  <div>
    <h1 style="margin-bottom:20px">Laporan Masuk</h1>
    <div class="card" style="padding:0">
      <table>
        <thead>
          <tr><th>Tanggal</th><th>Jam Patroli</th><th>PIC</th><th>Dibuat Oleh</th><th>Waktu Upload</th></tr>
        </thead>
        <tbody>
          <tr v-if="loading"><td colspan="5" style="text-align:center; color:var(--text-muted)">Memuat…</td></tr>
          <tr v-else-if="!laporan.length"><td colspan="5" style="text-align:center; color:var(--text-muted)">Belum ada laporan masuk</td></tr>
          <tr v-for="l in laporan" :key="l.id">
            <td>{{ l.tanggal }}</td>
            <td>{{ l.jam_patroli }}</td>
            <td>{{ l.pic_patroli }}</td>
            <td>{{ l.nama_pembuat }}</td>
            <td>{{ new Date(l.created_at).toLocaleString('id-ID') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
