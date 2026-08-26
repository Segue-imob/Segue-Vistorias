// Edge Function: admin-reset-password
//
// Permite ao Administrador redefinir a senha de qualquer usuário
// diretamente pelo app, sem acessar o painel do Supabase. Roda no
// servidor com a service_role key — necessária para
// auth.admin.updateUserById().
//
// Deploy: supabase functions deploy admin-reset-password
// Chamada pelo front: supabase.functions.invoke('admin-reset-password', { body: {...} })

import { buildClients, corsHeaders, jsonResponse, requireAdminCaller } from '../_shared/admin.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { callerClient, adminClient } = buildClients(req)

    const authCheck = await requireAdminCaller(callerClient, adminClient)
    if (!authCheck.ok) return authCheck.response

    const body = await req.json()
    const { userId, password } = body || {}

    if (!userId || !password) {
      return jsonResponse({ error: 'Informe o usuário e a nova senha.' }, 400)
    }
    if (password.length < 6) {
      return jsonResponse({ error: 'A senha precisa ter pelo menos 6 caracteres.' }, 400)
    }

    const { error } = await adminClient.auth.admin.updateUserById(userId, { password })

    if (error) {
      return jsonResponse({ error: error.message || 'Erro ao redefinir a senha.' }, 400)
    }

    return jsonResponse({ success: true }, 200)
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Erro inesperado.' }, 500)
  }
})
