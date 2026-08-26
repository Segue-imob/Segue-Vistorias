// Edge Function: admin-create-user
//
// Cria um usuário completo (Auth + profiles) sem derrubar a sessão do
// Administrador que está cadastrando. Roda no servidor com a
// service_role key (nunca exposta ao navegador) — é isso que permite
// usar supabase.auth.admin.createUser() com segurança.
//
// Deploy: supabase functions deploy admin-create-user
// Chamada pelo front: supabase.functions.invoke('admin-create-user', { body: {...} })

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
    const { nome, email, telefone, role, ativo, password } = body || {}

    if (!nome || !email || !role || !password) {
      return jsonResponse({ error: 'Preencha nome, e-mail, perfil e senha.' }, 400)
    }
    if (password.length < 6) {
      return jsonResponse({ error: 'A senha precisa ter pelo menos 6 caracteres.' }, 400)
    }

    // Cria o usuário no Supabase Auth. email_confirm: true evita que o
    // novo usuário precise confirmar o e-mail para conseguir logar,
    // já que foi o Administrador quem cadastrou a conta.
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (createErr) {
      const msg = (createErr.message || '').toLowerCase()
      if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
        return jsonResponse({ error: 'Este e-mail já está cadastrado.' }, 409)
      }
      return jsonResponse({ error: createErr.message || 'Erro ao criar o usuário.' }, 400)
    }

    const { error: profileErr } = await adminClient.from('profiles').insert({
      id: created.user.id,
      nome,
      email,
      telefone: telefone || null,
      role,
      ativo: ativo ?? true
    })

    if (profileErr) {
      // Rollback: se salvar o perfil falhar, desfaz a criação no Auth
      // para não deixar uma conta "órfã" sem perfil correspondente.
      await adminClient.auth.admin.deleteUser(created.user.id)
      return jsonResponse({ error: profileErr.message || 'Erro ao salvar o perfil do usuário.' }, 400)
    }

    return jsonResponse({ success: true, id: created.user.id }, 200)
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Erro inesperado.' }, 500)
  }
})
