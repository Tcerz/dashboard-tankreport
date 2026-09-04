import { reactive } from 'vue'
import { supabase } from './supabase'

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

export async function initAuth() {
  const { data } = await supabase.auth.getSession()
  authState.user = data.session?.user ?? null
  await muatProfil()
  authState.siap = true

  supabase.auth.onAuthStateChange(async (_event, session) => {
    authState.user = session?.user ?? null
    await muatProfil()
  })
}

export async function login(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function logout() {
  await supabase.auth.signOut()
}

export const isAdmin = () => ['admin', 'superadmin'].includes(authState.profil?.role)
export const isSuperadmin = () => authState.profil?.role === 'superadmin'
