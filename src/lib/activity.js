const KEY = 'dsp_last_activity'
const BATAS_MS = 15 * 60 * 1000 // 15 menit

export function catatAktivitas() {
  localStorage.setItem(KEY, Date.now().toString())
}

export function sudahLewatBatasIdle() {
  const t = Number(localStorage.getItem(KEY) || 0)
  return t > 0 && Date.now() - t > BATAS_MS
}
