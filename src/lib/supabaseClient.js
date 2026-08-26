import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Evita crash silencioso em runtime caso as env vars não tenham sido configuradas
  console.warn(
    '[SEGUE Vistorias] VITE_SUPABASE_URL e/ou VITE_SUPABASE_ANON_KEY não foram definidas. ' +
      'Configure o arquivo .env (veja .env.example).'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
})
