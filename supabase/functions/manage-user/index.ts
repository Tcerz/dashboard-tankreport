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
    .from('profiles').select('role').eq('id', caller.user.id).single()
  if (callerProfile?.role !== 'admin') {
    return new Response('Hanya admin yang boleh melakukan ini', { status: 403, headers: corsHeaders })
  }

  const { action, userId, password } = await req.json()

  if (action === 'reset_password') {
    if (userId === caller.user.id) {
      return new Response('Tidak bisa reset password akun sendiri lewat sini', { status: 400, headers: corsHeaders })
    }
    const { error } = await admin.auth.admin.updateUserById(userId, { password })
    if (error) return new Response(error.message, { status: 400, headers: corsHeaders })
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  if (action === 'delete') {
    if (userId === caller.user.id) {
      return new Response('Tidak bisa menghapus akun sendiri', { status: 400, headers: corsHeaders })
    }
    // Menghapus dari auth.users otomatis ikut menghapus baris profiles (ON DELETE CASCADE).
    const { error } = await admin.auth.admin.deleteUser(userId)
    if (error) return new Response(error.message, { status: 400, headers: corsHeaders })
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  return new Response('Action tidak dikenali', { status: 400, headers: corsHeaders })
})
