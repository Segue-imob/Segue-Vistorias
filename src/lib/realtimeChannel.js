import { supabase } from './supabaseClient'

// ------------------------------------------------------------------
// Canal Realtime ÚNICO e compartilhado por todo o aplicativo.
//
// Por que isso existe: se cada hook (useVistorias, useProfiles,
// useImoveis) criar seu próprio `supabase.channel(...)`, e mais de
// um componente montar o mesmo hook ao mesmo tempo (ex.: a página
// Agenda chama useProfiles() e também renderiza <VistoriaModal>,
// que chama useProfiles() de novo), acabamos com múltiplos canais
// concorrentes — e o Supabase lança:
//   "cannot add postgres_changes callbacks for realtime:<canal>
//    after subscribe()"
//
// A correção é ter UM único canal ('schema-db-changes'), criado uma
// única vez (padrão singleton), com TODOS os `.on('postgres_changes', ...)`
// registrados antes do único `.subscribe()` da cadeia — exatamente
// nessa ordem, que é a exigida pelo Supabase:
//
//   supabase
//     .channel('schema-db-changes')
//     .on('postgres_changes', { table: 'profiles' }, cb)
//     .on('postgres_changes', { table: 'vistorias' }, cb)
//     .on('postgres_changes', { table: 'imoveis' }, cb)
//     .subscribe()   // <- sempre por último
//
// Os hooks não criam mais canais: eles apenas se inscrevem (pub/sub)
// nas tabelas que lhes interessam via `subscribeToTable`.
// ------------------------------------------------------------------

const TABLES = ['profiles', 'vistorias', 'imoveis']

const listeners = TABLES.reduce((acc, table) => {
  acc[table] = new Set()
  return acc
}, {})

let channel = null

function ensureChannel() {
  if (channel) return channel

  let builder = supabase.channel('schema-db-changes')

  // Todos os .on(...) são encadeados ANTES do .subscribe() — nenhum
  // .on() é chamado depois que a inscrição já foi feita.
  TABLES.forEach((table) => {
    builder = builder.on(
      'postgres_changes',
      { event: '*', schema: 'public', table },
      (payload) => {
        listeners[table].forEach((callback) => callback(payload))
      }
    )
  })

  channel = builder.subscribe() // .subscribe() é sempre o último método da cadeia

  return channel
}

/**
 * Inscreve um callback para mudanças em uma tabela específica
 * (profiles | vistorias | imoveis). Retorna uma função de limpeza.
 * O canal físico do Supabase é criado apenas uma vez, na primeira
 * chamada, e reutilizado por todos os hooks depois disso.
 */
export function subscribeToTable(table, callback) {
  if (!listeners[table]) {
    throw new Error(`[realtimeChannel] Tabela não suportada: "${table}"`)
  }
  ensureChannel()
  listeners[table].add(callback)

  return () => {
    listeners[table].delete(callback)
  }
}
