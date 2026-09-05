<script setup>
import { ref, onMounted, watch } from 'vue'
import { supabase } from '../lib/supabase'
import { buatPdfLaporan } from '../lib/pdf'
import { isSuperadmin } from '../lib/auth'
import { depots, depotFilter, muatDepots } from '../lib/depots'
import { X, FileText, Loader2, Download, Trash2 } from '@lucide/vue'

const laporan = ref([])
const loading = ref(true)

const dipilih = ref(null)        // report yang sedang dibuka di panel
const fotoDipilih = ref([])
const mode = ref('detail')       // 'detail' | 'pdf'
const memuatDetail = ref(false)
const membuatPdf = ref(false)
const pdfUrl = ref('')

async function muat() {
  loading.value = true
  let q = supabase.from('reports').select('*, depots(nama)').order('created_at', { ascending: false })
  if (isSuperadmin() && depotFilter.value) q = q.eq('depot_id', depotFilter.value)
  const { data } = await q
  laporan.value = data || []
  loading.value = false
}
onMounted(() => { muat(); muatDepots() })
watch(depotFilter, muat)

async function bukaDetail(l) {
  dipilih.value = l
  mode.value = 'detail'
  pdfUrl.value = ''
  memuatDetail.value = true
  const { data } = await supabase.from('report_photos').select('*').eq('report_id', l.id)
  fotoDipilih.value = data || []
  memuatDetail.value = false
}

function tutupPanel() {
  dipilih.value = null
  if (pdfUrl.value) URL.revokeObjectURL(pdfUrl.value)
  pdfUrl.value = ''
}

async function tampilkanPdf() {
  mode.value = 'pdf'
  membuatPdf.value = true
  try {
    const doc = await buatPdfLaporan(dipilih.value, fotoDipilih.value)
    const blob = doc.output('blob')
    pdfUrl.value = URL.createObjectURL(blob)
  } finally {
    membuatPdf.value = false
  }
}

function unduhPdf() {
  const a = document.createElement('a')
  a.href = pdfUrl.value
  a.download = `Laporan_${dipilih.value.tanggal}_${dipilih.value.jam_patroli}.pdf`.replace(/[:\s]/g, '-')
  a.click()
}

function kondisiClass(k) {
  return String(k).toLowerCase() === 'tidak aman' ? 'badge-danger' : 'badge-success'
}

// --- Hapus laporan (superadmin, dengan verifikasi ketik nama petugas) ---
const konfirmasiHapus = ref(false)
const namaKetik = ref('')
const menghapus = ref(false)
const errorHapus = ref('')

function bukaKonfirmasiHapus() {
  namaKetik.value = ''
  errorHapus.value = ''
  konfirmasiHapus.value = true
}

async function hapusLaporan() {
  if (namaKetik.value.trim() !== dipilih.value.nama_pembuat) {
    errorHapus.value = 'Nama yang diketik tidak cocok dengan pembuat laporan.'
    return
  }
  menghapus.value = true
  errorHapus.value = ''
  try {
    // Hapus file foto di storage dulu (best-effort, tidak menghentikan proses kalau gagal).
    const paths = fotoDipilih.value
      .map((f) => f.photo_url.split('/laporan-foto/')[1])
      .filter(Boolean)
    if (paths.length) await supabase.storage.from('laporan-foto').remove(paths)

    const { error } = await supabase.from('reports').delete().eq('id', dipilih.value.id)
    if (error) throw error

    konfirmasiHapus.value = false
    tutupPanel()
    await muat()
  } catch (e) {
    errorHapus.value = 'Gagal menghapus: ' + e.message
  } finally {
    menghapus.value = false
  }
}
</script>

<template>
  <div>
    <h1 style="margin-bottom:4px">Laporan Masuk</h1>
    <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:20px; flex-wrap:wrap; gap:10px">
      <p style="color:var(--text-muted); margin:0; font-size:13px">Klik salah satu baris untuk melihat detail laporan beserta foto.</p>
      <div v-if="isSuperadmin()" style="display:flex; align-items:center; gap:8px">
        <label style="margin:0; white-space:nowrap">Depot:</label>
        <select v-model="depotFilter" style="width:auto; min-width:180px">
          <option value="">Semua Depot</option>
          <option v-for="d in depots" :key="d.id" :value="d.id">{{ d.nama }}</option>
        </select>
      </div>
    </div>

    <div class="card" style="padding:0">
      <table>
        <thead>
          <tr><th>Tanggal</th><th>Jam Patroli</th><th v-if="isSuperadmin()">Depot</th><th>PIC</th><th>Dibuat Oleh</th><th>Waktu Upload</th></tr>
        </thead>
        <tbody>
          <tr v-if="loading"><td colspan="6" style="text-align:center; color:var(--text-muted)">Memuat…</td></tr>
          <tr v-else-if="!laporan.length"><td colspan="6" style="text-align:center; color:var(--text-muted)">Belum ada laporan masuk</td></tr>
          <tr v-for="l in laporan" :key="l.id" class="row-click" @click="bukaDetail(l)">
            <td>{{ l.tanggal }}</td>
            <td>{{ l.jam_patroli }}</td>
            <td v-if="isSuperadmin()">{{ l.depots?.nama || '-' }}</td>
            <td>{{ l.pic_patroli }}</td>
            <td>{{ l.nama_pembuat }}</td>
            <td>{{ new Date(l.created_at).toLocaleString('id-ID') }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Overlay -->
    <div v-if="dipilih" class="overlay" @click="tutupPanel"></div>

    <!-- Side panel -->
    <aside v-if="dipilih" class="panel">
      <div class="panel-head">
        <div>
          <h3>{{ dipilih.tanggal }} &middot; {{ dipilih.jam_patroli }}</h3>
          <p style="margin:2px 0 0; font-size:12px; color:var(--text-muted)">PIC: {{ dipilih.pic_patroli }} &middot; Oleh: {{ dipilih.nama_pembuat }}</p>
        </div>
        <button class="icon-btn" @click="tutupPanel"><X :size="18" /></button>
      </div>

      <!-- MODE: DETAIL -->
      <div v-if="mode === 'detail'" class="panel-body">
        <div style="display:flex; gap:8px; margin-bottom:18px">
          <button class="btn" style="flex:1; display:flex; align-items:center; justify-content:center; gap:8px" @click="tampilkanPdf">
            <FileText :size="16" /> Tampilkan PDF
          </button>
          <button v-if="isSuperadmin()" class="btn-danger-outline" title="Hapus laporan" @click="bukaKonfirmasiHapus">
            <Trash2 :size="16" />
          </button>
        </div>

        <p v-if="memuatDetail" style="color:var(--text-muted)">Memuat detail…</p>

        <template v-else>
          <section v-for="s in [
            { judul: 'Loading', d: JSON.parse(dipilih.loading_data || '{}'), fields: [['personel','Personel'],['jetty1','Jetty 1'],['jetty2','Jetty 2'],['produk','Produk']] },
            { judul: 'Discharge', d: JSON.parse(dipilih.discharge_data || '{}'), fields: [['personel','Personel'],['jetty1','Jetty 1'],['jetty2','Jetty 2'],['produk','Produk']] },
            { judul: 'Penyaluran', d: JSON.parse(dipilih.penyaluran_data || '{}'), fields: [['personel','Personel'],['startJam','Jam Mulai'],['selesaiJam','Jam Selesai']] },
          ]" :key="s.judul" class="seksi">
            <div class="seksi-head">
              <strong>{{ s.judul }}</strong>
              <span :class="['badge', kondisiClass(s.d.kondisi)]">{{ s.d.kondisi }}</span>
            </div>
            <div v-for="f in s.fields" :key="f[0]" class="field-row"><span>{{ f[1] }}</span><span>{{ s.d[f[0]] || '-' }}</span></div>
            <div v-if="s.d.note" class="note">{{ s.d.note }}</div>
          </section>

          <section class="seksi">
            <div class="seksi-head">
              <strong>Storage / Penimbunan</strong>
              <span :class="['badge', kondisiClass(JSON.parse(dipilih.storage_data || '{}').kondisi)]">{{ JSON.parse(dipilih.storage_data || '{}').kondisi }}</span>
            </div>
            <div class="field-row"><span>Personel</span><span>{{ JSON.parse(dipilih.storage_data || '{}').personel || '-' }}</span></div>
            <div class="field-row"><span>Tangki Off</span><span>{{ (JSON.parse(dipilih.storage_data || '{}').tangkiOff || []).join(', ') || '-' }}</span></div>
            <div class="field-row"><span>Tangki Aktif/Idle</span><span>{{ (JSON.parse(dipilih.storage_data || '{}').tangkiAktifIdle || []).join(', ') || '-' }}</span></div>
            <div v-if="JSON.parse(dipilih.storage_data || '{}').note" class="note">{{ JSON.parse(dipilih.storage_data || '{}').note }}</div>
          </section>

          <section class="seksi">
            <div class="seksi-head"><strong>Foto Lampiran</strong></div>
            <div class="foto-grid">
              <div v-for="f in fotoDipilih" :key="f.id" class="foto-item">
                <img :src="f.photo_url" :alt="f.kategori" />
                <div class="foto-cap">{{ f.kategori }}</div>
              </div>
              <p v-if="!fotoDipilih.length" style="color:var(--text-muted); font-size:13px">Tidak ada foto.</p>
            </div>
          </section>
        </template>
      </div>

      <!-- MODE: PDF -->
      <div v-else class="panel-body pdf-mode">
        <div v-if="membuatPdf" class="pdf-loading">
          <Loader2 :size="22" class="spin" />
          <span>Menyusun dokumen PDF…</span>
        </div>
        <template v-else-if="pdfUrl">
          <div style="display:flex; gap:8px; margin-bottom:10px">
            <button class="btn-outline" style="flex:1" @click="mode = 'detail'">&larr; Kembali ke Detail</button>
            <button class="btn" style="display:flex; align-items:center; gap:6px" @click="unduhPdf"><Download :size="15" /> Unduh</button>
          </div>
          <iframe :src="pdfUrl" class="pdf-frame"></iframe>
        </template>
      </div>
    </aside>

    <!-- Modal Konfirmasi Hapus -->
    <div v-if="konfirmasiHapus" class="modal-overlay" @click.self="konfirmasiHapus = false">
      <div class="modal">
        <div class="modal-head"><h3>Hapus Laporan</h3><button class="icon-btn" @click="konfirmasiHapus = false"><X :size="16" /></button></div>
        <p style="font-size:13px; color:var(--text-muted)">
          Tindakan ini <strong>tidak bisa dibatalkan</strong>. Laporan, foto lampirannya akan dihapus permanen.
          Untuk memastikan, ketik ulang nama petugas pembuat laporan ini:
        </p>
        <p style="font-size:14px; font-weight:700; background:var(--bg); padding:8px; border-radius:4px; text-align:center">{{ dipilih.nama_pembuat }}</p>
        <input v-model="namaKetik" placeholder="Ketik nama di atas" style="margin:10px 0" @keyup.enter="hapusLaporan" />
        <p v-if="errorHapus" style="color:var(--danger); font-size:13px">{{ errorHapus }}</p>
        <button class="btn-danger" style="width:100%" :disabled="menghapus || !namaKetik.trim()" @click="hapusLaporan">
          {{ menghapus ? 'Menghapus…' : 'Hapus Permanen' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.row-click { cursor: pointer; }
.row-click:hover { background: #fafaf9; }

.overlay {
  position: fixed; inset: 0; background: rgba(20,33,49,0.35); z-index: 40;
}
.panel {
  position: fixed; top: 0; right: 0; bottom: 0; width: 460px; max-width: 92vw;
  background: #fff; z-index: 50; box-shadow: -8px 0 24px rgba(0,0,0,0.15);
  display: flex; flex-direction: column;
}
.panel-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 18px 20px; border-bottom: 1px solid var(--border);
}
.panel-body { padding: 20px; overflow-y: auto; flex: 1; }
.icon-btn { background: transparent; padding: 4px; color: var(--text-muted); }
.icon-btn:hover { color: var(--text); }

.seksi { margin-bottom: 18px; border: 1px solid var(--border); border-radius: 6px; padding: 12px; }
.seksi-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.field-row { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; border-bottom: 1px dashed var(--border); }
.field-row:last-of-type { border-bottom: none; }
.field-row span:first-child { color: var(--text-muted); }
.note { margin-top: 8px; font-size: 13px; background: var(--bg); padding: 8px; border-radius: 4px; }

.foto-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.foto-item img { width: 100%; height: 90px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border); }
.foto-cap { font-size: 11px; color: var(--text-muted); margin-top: 4px; text-align: center; }

.pdf-mode { display: flex; flex-direction: column; }
.pdf-frame { flex: 1; width: 100%; border: 1px solid var(--border); border-radius: 4px; }
.pdf-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; height: 100%; color: var(--text-muted); }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.btn-danger-outline {
  background: transparent;
  border: 1px solid var(--danger);
  color: var(--danger);
  padding: 0 14px;
  border-radius: var(--radius);
}
.btn-danger-outline:hover { background: var(--danger-soft); }

.modal-overlay {
  position: fixed; inset: 0; background: rgba(20,33,49,0.4);
  display: flex; align-items: center; justify-content: center; z-index: 70;
}
.modal { background: #fff; border-radius: 8px; padding: 20px; width: 380px; max-width: 92vw; }
.modal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.modal-head h3 { font-size: 16px; }
</style>
