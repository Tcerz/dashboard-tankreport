import { createClient } from 'jsr:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const admin = createClient(supabaseUrl, serviceKey)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
  const { data: caller } = await admin.auth.getUser(jwt)
  if (!caller.user) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

  const { data: callerProfile } = await admin
    .from('profiles').select('role, depot_id').eq('id', caller.user.id).single()

  const isSuperadmin = callerProfile?.role === 'superadmin'
  const isAdmin = callerProfile?.role === 'admin'
  if (!isSuperadmin && !isAdmin) {
    return new Response('Hanya admin/superadmin yang boleh menambah user', { status: 403, headers: corsHeaders })
  }

  const body = await req.json()
  const { nama, email, password } = body

  // Admin biasa (bukan superadmin) HANYA boleh membuat akun petugas,
  // dan otomatis untuk depotnya sendiri -- tidak bisa memilih depot lain
  // atau membuat sesama admin, walau field itu dikirim dari form.
  const role = isSuperadmin ? (body.role || 'user') : 'user'
  const depotId = isSuperadmin ? (body.depotId || null) : callerProfile.depot_id

  if (role !== 'superadmin' && !depotId) {
    return new Response('Depot wajib dipilih untuk akun admin/petugas', { status: 400, headers: corsHeaders })
  }

  const { data: created, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { nama },
  })
  if (error) return new Response(error.message, { status: 400, headers: corsHeaders })

  // Trigger di DB otomatis membuat baris profiles dengan role default 'user'
  // dan depot_id kosong -- lengkapi di sini sesuai keputusan di atas.
  await admin.from('profiles').update({ role, depot_id: depotId }).eq('id', created.user.id)

  return new Response(JSON.stringify({ id: created.user.id }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
