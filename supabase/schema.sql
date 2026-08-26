-- ============================================================
-- SEGUE Vistorias — schema de referência
-- Ajuste os nomes/tipos de coluna aqui caso seu banco já exista
-- com uma estrutura diferente; o front-end espera exatamente
-- estes nomes de coluna e de relacionamento (FKs).
-- ============================================================

create extension if not exists "pgcrypto";

-- Perfis de usuário (equipe da imobiliária)
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text not null unique,
  telefone text,
  role text not null check (role in ('Administrador', 'Gestor', 'Vistoriador', 'Corretor')),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Imóveis
create table if not exists public.imoveis (
  id uuid primary key default gen_random_uuid(),
  codigo_imovel text not null unique,
  endereco text not null,
  bairro text,
  cidade text,
  proprietario_nome text,
  inquilino_nome text,
  created_at timestamptz not null default now()
);

-- Vistorias
create table if not exists public.vistorias (
  id uuid primary key default gen_random_uuid(),
  imovel_id uuid not null references public.imoveis (id) on delete cascade,
  vistoriador_id uuid references public.profiles (id) on delete set null,
  tipo text not null check (tipo in ('Entrada', 'Saída', 'Conferência')),
  status text not null default 'agendada'
    check (status in ('agendada', 'aceita', 'finalizada', 'cancelada')),
  data_agendamento timestamptz not null,
  observacoes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_vistorias_data_agendamento on public.vistorias (data_agendamento);
create index if not exists idx_vistorias_status on public.vistorias (status);
create index if not exists idx_vistorias_vistoriador on public.vistorias (vistoriador_id);

-- Habilita Realtime (necessário para os hooks useVistorias/useProfiles)
alter publication supabase_realtime add table public.vistorias;
alter publication supabase_realtime add table public.profiles;

-- ============================================================
-- Row Level Security (ajuste as policies conforme sua regra de
-- negócio/autenticação real — exemplo permissivo para usuários
-- autenticados)
-- ============================================================
alter table public.profiles enable row level security;
alter table public.imoveis enable row level security;
alter table public.vistorias enable row level security;

create policy "Usuários autenticados podem ler profiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Usuários autenticados podem gerenciar profiles"
  on public.profiles for all
  to authenticated
  using (true)
  with check (true);

create policy "Usuários autenticados podem ler imoveis"
  on public.imoveis for select
  to authenticated
  using (true);

create policy "Usuários autenticados podem gerenciar imoveis"
  on public.imoveis for all
  to authenticated
  using (true)
  with check (true);

create policy "Usuários autenticados podem ler vistorias"
  on public.vistorias for select
  to authenticated
  using (true);

create policy "Usuários autenticados podem gerenciar vistorias"
  on public.vistorias for all
  to authenticated
  using (true)
  with check (true);
