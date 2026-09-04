import { ref } from 'vue'
import { supabase } from './supabase'

export const depots = ref([])
export const depotFilter = ref('') // '' = Semua Depot (hanya relevan utk superadmin)
let termuat = false

export async function muatDepots() {
  if (termuat) return
  const { data } = await supabase.from('depots').select().order('nama')
  depots.value = data || []
  termuat = true
}

export async function tambahDepot(nama) {
  const { data, error } = await supabase.from('depots').insert({ nama: nama.trim() }).select().single()
  if (error) throw error
  depots.value.push(data)
  depots.value.sort((a, b) => a.nama.localeCompare(b.nama))
  return data
}
