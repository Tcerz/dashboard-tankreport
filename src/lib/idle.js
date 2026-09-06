import { logout } from './auth'
import { catatAktivitas, sudahLewatBatasIdle } from './activity'

/// Dipanggil sekali saat user sudah dipastikan login (baik login baru
/// maupun sesi lama yang berhasil di-restore). HANYA memasang pelacak
/// aktivitas & interval pengecekan -- TIDAK melakukan cek "sudah lewat
/// 15 menit?" di sini, karena itu sudah ditangani lebih awal di
/// auth.js:initAuth() sebelum tampilan sempat dirender sama sekali.
export function pasangPelacakAktivitas() {
  catatAktivitas()

  ;['mousemove', 'keydown', 'click', 'scroll'].forEach((ev) =>
    window.addEventListener(ev, catatAktivitas, { passive: true })
  )

  setInterval(() => {
    if (sudahLewatBatasIdle()) logout()
  }, 30_000)
}
