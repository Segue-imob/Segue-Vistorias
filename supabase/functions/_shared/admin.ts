// Utilitários compartilhados pelas Edge Functions de gerenciamento de
// usuários (admin-create-user, admin-reset-password). Deno importa
// módulos por URL, então este arquivo é referenciado como
// '../_shared/admin.ts' pelas duas functions.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

export function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

/**
 * Cria dois clientes Supabase:
 *  - `callerClient`: autenticado como quem fez a chamada (usa o JWT do
 *    header Authorization), só para descobrir QUEM está chamando.
 *  - `adminClient`: usa a service_role key, só existe dentro da Edge
 *    Function (nunca chega ao navegador) — é quem de fato tem
 *    permissão para criar/editar usuários em auth.users.
 */
export function buildClients(req) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const authHeader = req.headers.get('Authorization') || ''

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } }
  })
  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  return { callerClient, adminClient }
}

/** Confirma que quem chamou a function está logado E tem role Administrador. */
export async function requireAdminCaller(callerClient, adminClient) {
  const {
    data: { user },
    error: userErr
  } = await callerClient.auth.getUser()

  if (userErr || !user) {
    return { ok: false, response: jsonResponse({ error: 'Sessão inválida ou expirada.' }, 401) }
  }

  const { data: profile, error: profileErr } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = (profile?.role || '').toLowerCase()
  const isAdmin = !profileErr && ['admin', 'administrador'].includes(role)

  if (!isAdmin) {
    return {
      ok: false,
      response: jsonResponse({ error: 'Apenas administradores podem executar esta ação.' }, 403)
    }
  }

  return { ok: true, user }
}
