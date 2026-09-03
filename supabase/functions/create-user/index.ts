import { createClient } from 'jsr:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const admin = createClient(supabaseUrl, serviceKey)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Browser selalu mengirim preflight OPTIONS dulu sebelum request asli.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  const jwt = authHeader.replace('Bearer ', '')

  // 1. Pastikan pemanggil sudah login & adalah admin.
  const { data: caller } = await admin.auth.getUser(jwt)
  if (!caller.user) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders })
  }

  const { data: callerProfile } = await admin
    .from('profiles').select('role').eq('id', caller.user.id).single()
  if (callerProfile?.role !== 'admin') {
    return new Response('Hanya admin yang boleh menambah user', { status: 403, headers: corsHeaders })
  }

  // 2. Buat user baru (auto-confirmed, tanpa email verifikasi).
  const { nama, email, password, role } = await req.json()
  const { data: created, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { nama },
  })
  if (error) return new Response(error.message, { status: 400, headers: corsHeaders })

  // 3. Trigger di DB otomatis membuat baris profiles dengan role default 'user'.
  //    Kalau diminta admin, update rolenya di sini.
  if (role === 'admin') {
    await admin.from('profiles').update({ role: 'admin' }).eq('id', created.user.id)
  }

  return new Response(JSON.stringify({ id: created.user.id }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})