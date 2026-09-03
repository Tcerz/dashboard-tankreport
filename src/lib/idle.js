import { logout } from './auth'

const KEY = 'dsp_last_activity'
const BATAS_MS = 15 * 60 * 1000 // 15 menit

function catatAktivitas() {
  localStorage.setItem(KEY, Date.now().toString())
}

/// Dipanggil sekali saat app dimuat & user sudah login.
/// - Cek dulu: kalau sudah lebih 15 menit sejak aktivitas terakhir
///   (termasuk saat tab/browser sempat ditutup), langsung logout.
/// - Lalu pasang listener aktivitas + pengecekan berkala, supaya idle
///   15 menit saat tab tetap terbuka juga otomatis logout.
export function initAutoLogout() {
  const terakhir = Number(localStorage.getItem(KEY) || 0)
  if (terakhir && Date.now() - terakhir > BATAS_MS) {
    logout()
    return
  }
  catatAktivitas()

  ;['mousemove', 'keydown', 'click', 'scroll'].forEach((ev) =>
    window.addEventListener(ev, catatAktivitas, { passive: true })
  )

  setInterval(() => {
    const t = Number(localStorage.getItem(KEY) || 0)
    if (Date.now() - t > BATAS_MS) logout()
  }, 30_000)
}
