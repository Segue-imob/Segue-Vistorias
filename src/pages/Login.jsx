import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Mail, Lock, Loader2, Building2, CalendarCheck2, LayoutGrid, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

function FeatureCard({ icon: Icon, title, desc }) {
  return (
    <div className="relative rounded-xl2 border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      <Icon size={18} className="text-brand-accentLight" />
      <p className="mt-2.5 text-sm font-semibold text-white">{title}</p>
      <p className="mt-1 text-xs text-slate-400">{desc}</p>
    </div>
  )
}

export default function Login() {
  const { session, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Sessão já válida (ex.: usuário voltou para /login por engano) — manda
  // direto de volta para onde ele estava indo, ou para a home.
  if (!authLoading && session) {
    const from = location.state?.from?.pathname || '/'
    return <Navigate to={from} replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')

    if (!email || !password) {
      setErrorMsg('Informe e-mail e senha para continuar.')
      return
    }

    setSubmitting(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setSubmitting(false)

    if (error) {
      setErrorMsg('E-mail ou senha inválidos. Verifique os dados e tente novamente.')
      return
    }

    // App.jsx decide a rota final por role (Agenda, Minhas Vistorias, etc.)
    navigate('/', { replace: true })
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Coluna esquerda — formulário de acesso */}
      <div className="flex items-center justify-center bg-slate-50 px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-accent">
              <Building2 size={20} className="text-white" strokeWidth={2.5} />
            </div>
            <div className="leading-tight">
              <p className="text-base font-bold text-brand-900">SEGUE</p>
              <p className="text-xs font-medium text-slate-500">Vistorias</p>
            </div>
          </div>

          <div className="card p-7 sm:p-8">
            <h1 className="text-lg font-bold text-slate-900">Bem-vindo de volta</h1>
            <p className="mt-1 text-sm text-slate-500">
              Acesso restrito — digite seu e-mail e senha para entrar.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
              <div>
                <label className="label-field" htmlFor="login-email">
                  E-mail
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    className="input-field !pl-9"
                    placeholder="seu.email@segueimoveis.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="label-field" htmlFor="login-password">
                  Senha
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    className="input-field !pl-9"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {errorMsg && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{errorMsg}</p>
              )}

              <button type="submit" disabled={submitting} className="btn-primary w-full justify-center !py-2.5">
                {submitting && <Loader2 size={15} className="animate-spin" />}
                Entrar
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            SEGUE Imobiliária © {new Date().getFullYear()}
          </p>
        </div>
      </div>

      {/* Coluna direita — apresentação do produto */}
      <div className="relative hidden overflow-hidden bg-brand-900 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(60% 60% at 15% 15%, rgba(79,70,229,0.35), transparent 60%), radial-gradient(50% 50% at 90% 85%, rgba(129,140,248,0.25), transparent 60%)'
          }}
        />

        <div className="relative">
          <div className="flex items-center gap-2 text-slate-300">
            <ShieldCheck size={18} />
            <span className="text-xs font-semibold uppercase tracking-wide">Plataforma SEGUE</span>
          </div>
          <h2 className="mt-6 max-w-md text-3xl font-bold leading-tight text-white">
            SEGUE Vistorias — a solução completa para gestão de vistorias da sua imobiliária
          </h2>
          <p className="mt-4 max-w-sm text-sm text-slate-400">
            Agilidade no agendamento, organização visual em Kanban por status e controle total da agenda —
            tudo em um só lugar.
          </p>
        </div>

        <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FeatureCard
            icon={CalendarCheck2}
            title="Agenda unificada"
            desc="Todas as vistorias do mês em um só calendário."
          />
          <FeatureCard
            icon={LayoutGrid}
            title="Kanban por status"
            desc="Agendada, Aceita, Finalizada e Cancelada."
          />
          <FeatureCard
            icon={ShieldCheck}
            title="Acesso por perfil"
            desc="Cada perfil vê exatamente o que precisa."
          />
        </div>
      </div>
    </div>
  )
}
