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

-- ============================================================
-- Execução de Vistoria (perfil Vistoriador) — checklist ambiente
-- por ambiente, fotos e assinatura digital de encerramento.
-- Este bloco é idempotente: pode rodar de novo com segurança
-- (create table if not exists / add column if not exists).
-- ============================================================

-- Colunas novas em vistorias: assinatura coletada no encerramento
-- e o momento em que a vistoria foi finalizada.
alter table public.vistorias add column if not exists assinatura_url text;
alter table public.vistorias add column if not exists finalizada_em timestamptz;

-- Um ambiente vistoriado (Sala, Cozinha, Quarto, Banheiro, Varanda, ...)
create table if not exists public.vistoria_ambientes (
  id uuid primary key default gen_random_uuid(),
  vistoria_id uuid not null references public.vistorias (id) on delete cascade,
  ambiente text not null,
  observacao text,
  created_at timestamptz not null default now()
);

-- Estado de cada item (Piso, Parede, Teto, Portas, Janelas,
-- Tomadas/Interruptores) dentro de um ambiente.
create table if not exists public.vistoria_itens (
  id uuid primary key default gen_random_uuid(),
  ambiente_id uuid not null references public.vistoria_ambientes (id) on delete cascade,
  item text not null,
  estado text not null check (estado in ('bom', 'regular', 'avariado', 'ausente')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ambiente_id, item)
);

-- Fotos anexadas a um ambiente (armazenadas no Storage, bucket
-- "vistoria-fotos" — ver bloco de Storage mais abaixo).
create table if not exists public.vistoria_fotos (
  id uuid primary key default gen_random_uuid(),
  ambiente_id uuid not null references public.vistoria_ambientes (id) on delete cascade,
  url text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_vistoria_ambientes_vistoria on public.vistoria_ambientes (vistoria_id);
create index if not exists idx_vistoria_itens_ambiente on public.vistoria_itens (ambiente_id);
create index if not exists idx_vistoria_fotos_ambiente on public.vistoria_fotos (ambiente_id);

alter table public.vistoria_ambientes enable row level security;
alter table public.vistoria_itens enable row level security;
alter table public.vistoria_fotos enable row level security;

-- Helper: o usuário logado é Administrador, Gestão (leitura), ou o
-- Vistoriador responsável pela vistoria dona deste ambiente/item/foto.
create or replace function public.owns_vistoria(p_vistoria_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_admin() or exists (
    select 1 from public.vistorias
    where id = p_vistoria_id and vistoriador_id = auth.uid()
  );
$$;

-- vistoria_ambientes
create policy "Le ambientes por hierarquia de role"
  on public.vistoria_ambientes for select
  to authenticated
  using (public.is_admin() or public.is_gestao() or public.owns_vistoria(vistoria_id));

create policy "Vistoriador cria ambientes da propria vistoria"
  on public.vistoria_ambientes for insert
  to authenticated
  with check (public.owns_vistoria(vistoria_id));

create policy "Vistoriador atualiza ambientes da propria vistoria"
  on public.vistoria_ambientes for update
  to authenticated
  using (public.owns_vistoria(vistoria_id))
  with check (public.owns_vistoria(vistoria_id));

create policy "Vistoriador remove ambientes da propria vistoria"
  on public.vistoria_ambientes for delete
  to authenticated
  using (public.owns_vistoria(vistoria_id));

-- vistoria_itens (checa o dono via join com vistoria_ambientes)
create policy "Le itens por hierarquia de role"
  on public.vistoria_itens for select
  to authenticated
  using (
    public.is_admin() or public.is_gestao() or exists (
      select 1 from public.vistoria_ambientes a
      where a.id = ambiente_id and public.owns_vistoria(a.vistoria_id)
    )
  );

create policy "Vistoriador cria itens da propria vistoria"
  on public.vistoria_itens for insert
  to authenticated
  with check (
    exists (select 1 from public.vistoria_ambientes a where a.id = ambiente_id and public.owns_vistoria(a.vistoria_id))
  );

create policy "Vistoriador atualiza itens da propria vistoria"
  on public.vistoria_itens for update
  to authenticated
  using (exists (select 1 from public.vistoria_ambientes a where a.id = ambiente_id and public.owns_vistoria(a.vistoria_id)))
  with check (exists (select 1 from public.vistoria_ambientes a where a.id = ambiente_id and public.owns_vistoria(a.vistoria_id)));

create policy "Vistoriador remove itens da propria vistoria"
  on public.vistoria_itens for delete
  to authenticated
  using (exists (select 1 from public.vistoria_ambientes a where a.id = ambiente_id and public.owns_vistoria(a.vistoria_id)));

-- vistoria_fotos (mesma regra)
create policy "Le fotos por hierarquia de role"
  on public.vistoria_fotos for select
  to authenticated
  using (
    public.is_admin() or public.is_gestao() or exists (
      select 1 from public.vistoria_ambientes a
      where a.id = ambiente_id and public.owns_vistoria(a.vistoria_id)
    )
  );

create policy "Vistoriador anexa fotos da propria vistoria"
  on public.vistoria_fotos for insert
  to authenticated
  with check (
    exists (select 1 from public.vistoria_ambientes a where a.id = ambiente_id and public.owns_vistoria(a.vistoria_id))
  );

create policy "Vistoriador remove fotos da propria vistoria"
  on public.vistoria_fotos for delete
  to authenticated
  using (exists (select 1 from public.vistoria_ambientes a where a.id = ambiente_id and public.owns_vistoria(a.vistoria_id)));

-- ============================================================
-- Storage: bucket público para fotos do checklist e para a
-- assinatura digital de encerramento (ambos ficam em
-- "vistoria-fotos/<vistoria_id>/...").
-- Se o SQL Editor do seu projeto não tiver permissão para alterar
-- o schema "storage", crie o bucket pelo Dashboard (Storage > New
-- bucket > "vistoria-fotos", marcado como público) e aplique as
-- policies abaixo manualmente em Storage > Policies.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('vistoria-fotos', 'vistoria-fotos', true)
on conflict (id) do nothing;

create policy "Leitura publica de vistoria-fotos"
  on storage.objects for select
  using (bucket_id = 'vistoria-fotos');

create policy "Autenticados enviam para vistoria-fotos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'vistoria-fotos');

create policy "Autenticados removem de vistoria-fotos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'vistoria-fotos');

-- ============================================================
-- Editar / Excluir vistoria (Agenda, Kanban, Listagem)
--   - Excluir (remoção física): só Administrador — já coberto pela
--     policy "Somente admin remove vistorias" criada anteriormente.
--   - Editar: Administrador, Gestão, ou o solicitante original
--     (quem agendou a vistoria) — por isso guardamos `criado_por` e
--     ampliamos a policy de UPDATE para incluir esses três casos.
-- Bloco idempotente: seguro rodar de novo.
-- ============================================================
alter table public.vistorias add column if not exists criado_por uuid references public.profiles (id);
create index if not exists idx_vistorias_criado_por on public.vistorias (criado_por);

drop policy if exists "Atualizacao por hierarquia de role" on public.vistorias;
create policy "Atualizacao por hierarquia de role"
  on public.vistorias for update
  to authenticated
  using (
    public.is_admin()
    or public.is_gestao()
    or criado_por = auth.uid()
    or (public.is_vistoriador() and vistoriador_id = auth.uid())
  )
  with check (
    public.is_admin()
    or public.is_gestao()
    or criado_por = auth.uid()
    or (public.is_vistoriador() and vistoriador_id = auth.uid())
  );
