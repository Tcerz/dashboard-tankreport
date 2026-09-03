import { createClient } from '@supabase/supabase-js'

// Isi kedua nilai ini di file .env (lihat .env.example) sebelum menjalankan project.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const sudahDikonfigurasi = Boolean(url && anonKey)

export const supabase = sudahDikonfigurasi
  ? createClient(url, anonKey)
  : null
