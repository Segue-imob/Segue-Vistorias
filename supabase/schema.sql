-- ============================================================
-- SEGUE Vistorias — schema de referência
-- Ajuste os nomes/tipos de coluna aqui caso seu banco já exista
-- com uma estrutura diferente; o front-end espera exatamente
-- estes nomes de coluna e de relacionamento (FKs).
--
-- Inclui também as políticas de RLS que espelham a hierarquia de
-- permissões do front-end (src/lib/permissions.js). Isso importa:
-- os controles de visibilidade no React só escondem botões/rotas —
-- quem garante a regra de verdade é o Postgres via RLS.
-- ============================================================

create extension if not exists "pgcrypto";

-- Perfis de usuário (equipe da imobiliária)
-- `role` aceita tanto a forma canônica em minúsculas quanto o rótulo
-- em português já usado antes (compatibilidade com dados legados).
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text not null unique,
  telefone text,
  role text not null check (
    lower(role) in ('admin', 'administrador', 'gestao', 'gestão', 'gestor', 'vistoriador')
  ),
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

-- Habilita Realtime (necessário para o canal único em src/lib/realtimeChannel.js)
alter publication supabase_realtime add table public.vistorias;
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.imoveis;

-- ============================================================
-- Funções auxiliares de role (usadas nas policies abaixo)
-- ============================================================
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select lower(coalesce((select role from public.profiles where id = auth.uid()), ''))
    in ('admin', 'administrador');
$$;

create or replace function public.is_gestao()
returns boolean
language sql stable security definer set search_path = public
as $$
  select lower(coalesce((select role from public.profiles where id = auth.uid()), ''))
    in ('gestao', 'gestão', 'gestor');
$$;

create or replace function public.is_vistoriador()
returns boolean
language sql stable security definer set search_path = public
as $$
  select lower(coalesce((select role from public.profiles where id = auth.uid()), '')) = 'vistoriador';
$$;

-- ============================================================
-- Row Level Security — espelha src/lib/permissions.js:
--   Administrador: acesso irrestrito
--   Gestão:        lê Agenda (todas as vistorias) e agenda novas
--   Vistoriador:   só lê/atualiza as vistorias atribuídas a ele
-- ============================================================
alter table public.profiles enable row level security;
alter table public.imoveis enable row level security;
alter table public.vistorias enable row level security;

-- profiles: todos autenticados podem listar (necessário para o
-- select de "vistoriador responsável" e para a Sidebar), mas só
-- Administrador cria/edita/remove usuários.
create policy "Autenticados leem profiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Somente admin cria profiles"
  on public.profiles for insert
  to authenticated
  with check (public.is_admin());

create policy "Somente admin atualiza profiles"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Somente admin remove profiles"
  on public.profiles for delete
  to authenticated
  using (public.is_admin());

-- imoveis: leitura liberada (todo perfil precisa ver dados do imóvel
-- vinculado às vistorias); cadastro por Administrador ou Gestão.
create policy "Autenticados leem imoveis"
  on public.imoveis for select
  to authenticated
  using (true);

create policy "Admin e gestao cadastram imoveis"
  on public.imoveis for insert
  to authenticated
  with check (public.is_admin() or public.is_gestao());

create policy "Admin e gestao atualizam imoveis"
  on public.imoveis for update
  to authenticated
  using (public.is_admin() or public.is_gestao())
  with check (public.is_admin() or public.is_gestao());

create policy "Somente admin remove imoveis"
  on public.imoveis for delete
  to authenticated
  using (public.is_admin());

-- vistorias: Administrador e Gestão veem tudo; Vistoriador só as suas.
create policy "Leitura por hierarquia de role"
  on public.vistorias for select
  to authenticated
  using (
    public.is_admin()
    or public.is_gestao()
    or vistoriador_id = auth.uid()
  );

create policy "Admin e gestao agendam vistorias"
  on public.vistorias for insert
  to authenticated
  with check (public.is_admin() or public.is_gestao());

-- Administrador atualiza qualquer vistoria (qualquer status, inclusive
-- cancelar). Vistoriador só atualiza a própria vistoria (usado para
-- Aceitar -> aceita e Finalizar -> finalizada).
create policy "Atualizacao por hierarquia de role"
  on public.vistorias for update
  to authenticated
  using (
    public.is_admin()
    or (public.is_vistoriador() and vistoriador_id = auth.uid())
  )
  with check (
    public.is_admin()
    or (public.is_vistoriador() and vistoriador_id = auth.uid())
  );

create policy "Somente admin remove vistorias"
  on public.vistorias for delete
  to authenticated
  using (public.is_admin());
