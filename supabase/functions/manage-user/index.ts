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
    return new Response('Hanya admin/superadmin yang boleh melakukan ini', { status: 403, headers: corsHeaders })
  }

  const { action, userId, password } = await req.json()
  if (userId === caller.user.id) {
    return new Response('Tidak bisa melakukan ini pada akun sendiri', { status: 400, headers: corsHeaders })
  }

  // Admin biasa (bukan superadmin) hanya boleh kelola akun PETUGAS di depot sendiri
  // -- tidak boleh menyentuh sesama admin ataupun superadmin, walau depotnya sama.
  if (isAdmin) {
    const { data: target } = await admin.from('profiles').select('role, depot_id').eq('id', userId).single()
    if (!target || target.role !== 'user' || target.depot_id !== callerProfile.depot_id) {
      return new Response('Tidak boleh mengelola akun ini', { status: 403, headers: corsHeaders })
    }
  }

  if (action === 'reset_password') {
    const { error } = await admin.auth.admin.updateUserById(userId, { password })
    if (error) return new Response(error.message, { status: 400, headers: corsHeaders })
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  if (action === 'delete') {
    // Menghapus dari auth.users otomatis ikut menghapus baris profiles (ON DELETE CASCADE).
    const { error } = await admin.auth.admin.deleteUser(userId)
    if (error) return new Response(error.message, { status: 400, headers: corsHeaders })
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  return new Response('Action tidak dikenali', { status: 400, headers: corsHeaders })
})
