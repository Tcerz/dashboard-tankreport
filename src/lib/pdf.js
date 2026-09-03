import { jsPDF } from 'jspdf'

const MARGIN = 15
const PAGE_W = 210
const PAGE_H = 297
const CONTENT_W = PAGE_W - MARGIN * 2

async function urlKeBase64(url) {
  const res = await fetch(url)
  const blob = await res.blob()
  return await new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.readAsDataURL(blob)
  })
}

function kv(doc, y, label, value) {
  doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(90)
  doc.text(label, MARGIN, y)
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(20)
  doc.text(String(value || '-'), MARGIN + 38, y)
  return y + 6
}

function judulSeksi(doc, y, nomor, judul) {
  if (y > PAGE_H - 30) { doc.addPage(); y = MARGIN }
  doc.setFillColor(20, 33, 49)
  doc.rect(MARGIN, y, CONTENT_W, 7, 'F')
  doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(255)
  doc.text(`${nomor}. ${judul}`, MARGIN + 3, y + 5)
  doc.setTextColor(20)
  return y + 12
}

function baris(doc, y, label, value, opts = {}) {
  if (y > PAGE_H - 20) { doc.addPage(); y = MARGIN }
  doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(90)
  doc.text(label, MARGIN + 2, y)
  const isTidakAman = String(value).toLowerCase() === 'tidak aman'
  doc.setFont('helvetica', opts.bold ? 'bold' : 'normal').setFontSize(9.5)
  if (isTidakAman) doc.setTextColor(179, 38, 30)
  else if (String(value).toLowerCase() === 'aman') doc.setTextColor(30, 123, 77)
  else doc.setTextColor(20)
  const lines = doc.splitTextToSize(String(value || '-'), CONTENT_W - 48)
  doc.text(lines, MARGIN + 48, y)
  doc.setTextColor(20)
  return y + Math.max(6, lines.length * 5)
}

function kegiatanLoadingDischarge(doc, y, judul, nomor, d) {
  y = judulSeksi(doc, y, nomor, judul)
  y = baris(doc, y, 'Personel', d.personel)
  y = baris(doc, y, 'Jetty 1', d.jetty1)
  y = baris(doc, y, 'Jetty 2', d.jetty2)
  y = baris(doc, y, 'Produk', d.produk)
  y = baris(doc, y, 'Kondisi', d.kondisi, { bold: true })
  y = baris(doc, y, 'Catatan', d.note || '-')
  return y + 4
}

function kegiatanPenyaluran(doc, y, d) {
  y = judulSeksi(doc, y, 3, 'PENYALURAN')
  y = baris(doc, y, 'Personel', d.personel)
  y = baris(doc, y, 'Jam Mulai', d.startJam)
  y = baris(doc, y, 'Jam Selesai', d.selesaiJam)
  y = baris(doc, y, 'Kondisi', d.kondisi, { bold: true })
  y = baris(doc, y, 'Catatan', d.note || '-')
  return y + 4
}

function kegiatanStorage(doc, y, d) {
  y = judulSeksi(doc, y, 4, 'STORAGE / PENIMBUNAN')
  y = baris(doc, y, 'Personel', d.personel)
  y = baris(doc, y, 'Tangki Loading', (d.tangkiLoading || []).join(', ') || '-')
  y = baris(doc, y, 'Tangki Discharge', (d.tangkiDischarge || []).join(', ') || '-')
  y = baris(doc, y, 'Tangki Penyaluran', (d.tangkiPenyaluran || []).join(', ') || '-')
  y = baris(doc, y, 'Tangki Aktif/Idle', (d.tangkiAktifIdle || []).join(', ') || '-')
  y = baris(doc, y, 'Tangki Off', (d.tangkiOff || []).join(', ') || '-')
  y = baris(doc, y, 'Kondisi', d.kondisi, { bold: true })
  y = baris(doc, y, 'Catatan', d.note || '-')
  return y + 4
}

export async function buatPdfLaporan(report, photos) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  doc.setFont('helvetica', 'bold').setFontSize(15).setTextColor(20)
  doc.text('LAPORAN SAFETY PATROL', PAGE_W / 2, 20, { align: 'center' })
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(100)
  doc.text('DIGISAFPAT \u2014 Digital Safety Patrol', PAGE_W / 2, 26, { align: 'center' })
  doc.setDrawColor(200).line(MARGIN, 30, PAGE_W - MARGIN, 30)

  let y = 40
  y = kv(doc, y, 'Tanggal', report.tanggal)
  y = kv(doc, y, 'Jam Patroli', report.jam_patroli)
  y = kv(doc, y, 'PIC Patroli', report.pic_patroli)
  y = kv(doc, y, 'Dibuat Oleh', report.nama_pembuat)
  y = kv(doc, y, 'Waktu Dibuat', report.waktu_dibuat)
  y += 4

  const loading = JSON.parse(report.loading_data || '{}')
  const discharge = JSON.parse(report.discharge_data || '{}')
  const penyaluran = JSON.parse(report.penyaluran_data || '{}')
  const storage = JSON.parse(report.storage_data || '{}')

  y = kegiatanLoadingDischarge(doc, y, 'LOADING', 1, loading)
  y = kegiatanLoadingDischarge(doc, y, 'DISCHARGE', 2, discharge)
  y = kegiatanPenyaluran(doc, y, penyaluran)
  y = kegiatanStorage(doc, y, storage)

  // Lampiran foto (satu per halaman baru supaya rapi & besar)
  for (const foto of photos) {
    doc.addPage()
    doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(20)
    doc.text(`Lampiran Foto \u2014 ${foto.kategori}`, MARGIN, 18)
    try {
      const base64 = await urlKeBase64(foto.photo_url)
      doc.addImage(base64, 'JPEG', MARGIN, 24, CONTENT_W, CONTENT_W * 0.75, undefined, 'FAST')
    } catch {
      doc.setFont('helvetica', 'italic').setFontSize(9).setTextColor(150)
      doc.text('(Gagal memuat gambar)', MARGIN, 40)
    }
    const capY = 24 + CONTENT_W * 0.75 + 8
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(90)
    doc.text(`Waktu: ${foto.jam}   |   Suhu: ${foto.suhu}`, MARGIN, capY)
    doc.text(`Lokasi: ${foto.alamat}`, MARGIN, capY + 5)
    doc.text(`Koordinat: ${foto.latitude}, ${foto.longitude}`, MARGIN, capY + 10)
  }

  // Footer nomor halaman di semua halaman
  const total = doc.internal.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(150)
    doc.text(`Halaman ${i} dari ${total}`, PAGE_W - MARGIN, PAGE_H - 8, { align: 'right' })
    doc.text('Dihasilkan otomatis oleh sistem DIGISAFPAT', MARGIN, PAGE_H - 8)
  }

  return doc
}
