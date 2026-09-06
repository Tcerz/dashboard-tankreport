import { reactive } from 'vue'
import { supabase } from './supabase'
import { catatAktivitas, sudahLewatBatasIdle } from './activity'

export const authState = reactive({
  siap: false,      // sudah selesai cek sesi awal
  user: null,        // user Supabase Auth
  profil: null,       // baris dari tabel profiles (nama, role, status)
})

export async function muatProfil() {
  if (!authState.user) { authState.profil = null; return }
  const { data } = await supabase.from('profiles').select('*, depots(nama)').eq('id', authState.user.id).maybeSingle()
  authState.profil = data
}

/// Dipanggil SEKALI di awal (lihat main.js), sebelum aplikasi Vue di-mount
/// sama sekali. Ini penting: dengan menunggu proses ini selesai dulu,
/// Vue Router tidak akan sempat membuat keputusan redirect berdasarkan
/// data sesi yang belum lengkap (race condition penyebab tampilan kacau
/// saat refresh).
export async function initAuth() {
  const { data } = await supabase.auth.getSession()

  // Sesi lama ditemukan, tapi ternyata sudah lebih dari 15 menit sejak
  // aktivitas terakhir (mis. tab sempat ditutup lama) -> anggap logout,
  // dilakukan di sini SEBELUM apa pun dirender, bukan belakangan.
  if (data.session && sudahLewatBatasIdle()) {
    await supabase.auth.signOut()
    authState.user = null
    authState.profil = null
    authState.siap = true
    return
  }

  authState.user = data.session?.user ?? null
  await muatProfil()
  authState.siap = true

  supabase.auth.onAuthStateChange(async (_event, session) => {
    authState.user = session?.user ?? null
    await muatProfil()
  })
}

export async function login(email, password, captchaToken) {
  const { error } = await supabase.auth.signInWithPassword({
    email, password, options: { captchaToken },
  })
  if (error) throw error
  // Login baru = jelas bukan idle. Catat aktivitas segar SEKARANG, supaya
  // tidak pernah kena anggap "sudah lewat 15 menit" gara-gara stempel lama.
  catatAktivitas()
}

export async function logout() {
  await supabase.auth.signOut()
}

export const isAdmin = () => ['admin', 'superadmin'].includes(authState.profil?.role)
export const isSuperadmin = () => authState.profil?.role === 'superadmin'
