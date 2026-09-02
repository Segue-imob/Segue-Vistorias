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
drop policy if exists "Autenticados leem profiles" on public.profiles;
create policy "Autenticados leem profiles"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "Somente admin cria profiles" on public.profiles;
create policy "Somente admin cria profiles"
  on public.profiles for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Somente admin atualiza profiles" on public.profiles;
create policy "Somente admin atualiza profiles"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Somente admin remove profiles" on public.profiles;
create policy "Somente admin remove profiles"
  on public.profiles for delete
  to authenticated
  using (public.is_admin());

-- imoveis: leitura liberada (todo perfil precisa ver dados do imóvel
-- vinculado às vistorias); cadastro por Administrador ou Gestão.
drop policy if exists "Autenticados leem imoveis" on public.imoveis;
create policy "Autenticados leem imoveis"
  on public.imoveis for select
  to authenticated
  using (true);

drop policy if exists "Admin e gestao cadastram imoveis" on public.imoveis;
create policy "Admin e gestao cadastram imoveis"
  on public.imoveis for insert
  to authenticated
  with check (public.is_admin() or public.is_gestao());

drop policy if exists "Admin e gestao atualizam imoveis" on public.imoveis;
create policy "Admin e gestao atualizam imoveis"
  on public.imoveis for update
  to authenticated
  using (public.is_admin() or public.is_gestao())
  with check (public.is_admin() or public.is_gestao());

drop policy if exists "Somente admin remove imoveis" on public.imoveis;
create policy "Somente admin remove imoveis"
  on public.imoveis for delete
  to authenticated
  using (public.is_admin());

-- vistorias: Administrador e Gestão veem tudo; Vistoriador só as suas.
drop policy if exists "Leitura por hierarquia de role" on public.vistorias;
create policy "Leitura por hierarquia de role"
  on public.vistorias for select
  to authenticated
  using (
    public.is_admin()
    or public.is_gestao()
    or vistoriador_id = auth.uid()
  );

drop policy if exists "Admin e gestao agendam vistorias" on public.vistorias;
create policy "Admin e gestao agendam vistorias"
  on public.vistorias for insert
  to authenticated
  with check (public.is_admin() or public.is_gestao());

-- Administrador atualiza qualquer vistoria (qualquer status, inclusive
-- cancelar). Vistoriador só atualiza a própria vistoria (usado para
-- Aceitar -> aceita e Finalizar -> finalizada).
drop policy if exists "Atualizacao por hierarquia de role" on public.vistorias;
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

drop policy if exists "Somente admin remove vistorias" on public.vistorias;
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
drop policy if exists "Le ambientes por hierarquia de role" on public.vistoria_ambientes;
create policy "Le ambientes por hierarquia de role"
  on public.vistoria_ambientes for select
  to authenticated
  using (public.is_admin() or public.is_gestao() or public.owns_vistoria(vistoria_id));

drop policy if exists "Vistoriador cria ambientes da propria vistoria" on public.vistoria_ambientes;
create policy "Vistoriador cria ambientes da propria vistoria"
  on public.vistoria_ambientes for insert
  to authenticated
  with check (public.owns_vistoria(vistoria_id));

drop policy if exists "Vistoriador atualiza ambientes da propria vistoria" on public.vistoria_ambientes;
create policy "Vistoriador atualiza ambientes da propria vistoria"
  on public.vistoria_ambientes for update
  to authenticated
  using (public.owns_vistoria(vistoria_id))
  with check (public.owns_vistoria(vistoria_id));

drop policy if exists "Vistoriador remove ambientes da propria vistoria" on public.vistoria_ambientes;
create policy "Vistoriador remove ambientes da propria vistoria"
  on public.vistoria_ambientes for delete
  to authenticated
  using (public.owns_vistoria(vistoria_id));

-- vistoria_itens (checa o dono via join com vistoria_ambientes)
drop policy if exists "Le itens por hierarquia de role" on public.vistoria_itens;
create policy "Le itens por hierarquia de role"
  on public.vistoria_itens for select
  to authenticated
  using (
    public.is_admin() or public.is_gestao() or exists (
      select 1 from public.vistoria_ambientes a
      where a.id = ambiente_id and public.owns_vistoria(a.vistoria_id)
    )
  );

drop policy if exists "Vistoriador cria itens da propria vistoria" on public.vistoria_itens;
create policy "Vistoriador cria itens da propria vistoria"
  on public.vistoria_itens for insert
  to authenticated
  with check (
    exists (select 1 from public.vistoria_ambientes a where a.id = ambiente_id and public.owns_vistoria(a.vistoria_id))
  );

drop policy if exists "Vistoriador atualiza itens da propria vistoria" on public.vistoria_itens;
create policy "Vistoriador atualiza itens da propria vistoria"
  on public.vistoria_itens for update
  to authenticated
  using (exists (select 1 from public.vistoria_ambientes a where a.id = ambiente_id and public.owns_vistoria(a.vistoria_id)))
  with check (exists (select 1 from public.vistoria_ambientes a where a.id = ambiente_id and public.owns_vistoria(a.vistoria_id)));

drop policy if exists "Vistoriador remove itens da propria vistoria" on public.vistoria_itens;
create policy "Vistoriador remove itens da propria vistoria"
  on public.vistoria_itens for delete
  to authenticated
  using (exists (select 1 from public.vistoria_ambientes a where a.id = ambiente_id and public.owns_vistoria(a.vistoria_id)));

-- vistoria_fotos (mesma regra)
drop policy if exists "Le fotos por hierarquia de role" on public.vistoria_fotos;
create policy "Le fotos por hierarquia de role"
  on public.vistoria_fotos for select
  to authenticated
  using (
    public.is_admin() or public.is_gestao() or exists (
      select 1 from public.vistoria_ambientes a
      where a.id = ambiente_id and public.owns_vistoria(a.vistoria_id)
    )
  );

drop policy if exists "Vistoriador anexa fotos da propria vistoria" on public.vistoria_fotos;
create policy "Vistoriador anexa fotos da propria vistoria"
  on public.vistoria_fotos for insert
  to authenticated
  with check (
    exists (select 1 from public.vistoria_ambientes a where a.id = ambiente_id and public.owns_vistoria(a.vistoria_id))
  );

drop policy if exists "Vistoriador remove fotos da propria vistoria" on public.vistoria_fotos;
create policy "Vistoriador remove fotos da propria vistoria"
  on public.vistoria_fotos for delete
  to authenticated
  using (exists (select 1 from public.vistoria_ambientes a where a.id = ambiente_id and public.owns_vistoria(a.vistoria_id)));

-- ============================================================
-- Storage: bucket público para fotos do checklist e para a
-- assinatura digital de encerramento (ambos ficam em
-- "vistorias-fotos/<vistoria_id>/...").
-- Se o SQL Editor do seu projeto não tiver permissão para alterar
-- o schema "storage", crie o bucket pelo Dashboard (Storage > New
-- bucket > "vistorias-fotos", marcado como público) e aplique as
-- policies abaixo manualmente em Storage > Policies.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('vistorias-fotos', 'vistorias-fotos', true)
on conflict (id) do nothing;

drop policy if exists "Leitura publica de vistorias-fotos" on storage.objects;
create policy "Leitura publica de vistorias-fotos"
  on storage.objects for select
  using (bucket_id = 'vistorias-fotos');

drop policy if exists "Autenticados enviam para vistorias-fotos" on storage.objects;
create policy "Autenticados enviam para vistorias-fotos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'vistorias-fotos');

drop policy if exists "Autenticados removem de vistorias-fotos" on storage.objects;
create policy "Autenticados removem de vistorias-fotos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'vistorias-fotos');

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

-- ============================================================
-- Reforço da leitura de vistorias (tela de Execução do Vistoriador
-- e visualização por Administrador). Recria a policy de SELECT
-- explicitamente com todos os casos que devem enxergar a vistoria:
-- Administrador, Gestão, o vistoriador atribuído E o solicitante
-- original — cobre o cenário de "vistoria não encontrada" causado
-- por uma policy que não incluísse todos esses casos.
-- Bloco idempotente: seguro rodar de novo.
-- ============================================================
drop policy if exists "Leitura por hierarquia de role" on public.vistorias;
create policy "Leitura por hierarquia de role"
  on public.vistorias for select
  to authenticated
  using (
    public.is_admin()
    or public.is_gestao()
    or vistoriador_id = auth.uid()
    or criado_por = auth.uid()
  );

-- ============================================================
-- Checklist em 2 níveis (Ambientes -> Itens), com observação e foto
-- por ITEM (antes eram por ambiente), itens padrão carregados na
-- hora do "+ Adicionar" ambiente (12 itens: Piso, Rodapé, Parede,
-- Teto, Porta, Janela, Interruptores e Tomadas, Luminária, Armário,
-- Bancada da Pia, Torneira, Tanque), "+ Adicionar Outro Item" para
-- personalizados, e snapshot da estrutura completa salvo a cada
-- alteração em vistorias.laudo_preenchido.
-- Bloco idempotente: seguro rodar de novo.
-- ============================================================

-- Observação passa a existir por item.
alter table public.vistoria_itens add column if not exists observacao text;

-- Item pode existir sem avaliação ainda (carregado automaticamente
-- ao criar o ambiente, com estado = null até o vistoriador escolher).
alter table public.vistoria_itens alter column estado drop not null;

-- A unicidade por nome não faz mais sentido: os itens agora são
-- criados como linhas próprias (não via upsert por nome), e itens
-- personalizados podem coincidir de nome com os padrão ou entre si.
alter table public.vistoria_itens drop constraint if exists vistoria_itens_ambiente_id_item_key;

-- Fotos passam a poder ser vinculadas a um item específico. ambiente_id
-- continua obrigatório (preenchido junto no INSERT), então as policies
-- de RLS de vistoria_fotos já existentes continuam valendo sem mudança.
alter table public.vistoria_fotos add column if not exists item_id uuid references public.vistoria_itens (id) on delete cascade;
create index if not exists idx_vistoria_fotos_item on public.vistoria_fotos (item_id);

-- Snapshot da estrutura completa do laudo (ambientes -> itens -> fotos),
-- sincronizado a cada alteração pelo front-end — útil para consulta ou
-- exportação rápida sem precisar recompor os joins.
alter table public.vistorias add column if not exists laudo_preenchido jsonb;

-- ------------------------------------------------------------
-- Limpeza: se você já rodou uma versão anterior deste script, ela
-- criou o bucket/policies com o nome singular "vistoria-fotos". O
-- bloco de Storage acima já foi atualizado para "vistorias-fotos"
-- (plural) — isso aqui só remove as policies antigas com o nome
-- singular, caso existam, pra não ficarem órfãs. Se o bucket
-- "vistoria-fotos" (singular) também existir, pode remover
-- manualmente pelo Dashboard se não for mais usado.
-- ------------------------------------------------------------
drop policy if exists "Leitura publica de vistoria-fotos" on storage.objects;
drop policy if exists "Autenticados enviam para vistoria-fotos" on storage.objects;
drop policy if exists "Autenticados removem de vistoria-fotos" on storage.objects;

-- ============================================================
-- Colunas redundantes para tolerância a nomes alternativos: o
-- front-end agora grava o nome do ambiente/item e o estado em DUAS
-- colunas cada (ambiente+nome, item+nome, estado+status), para
-- funcionar tanto em bancos que usam um nome quanto o outro. Isso é
-- redundância deliberada (as duas colunas do mesmo par sempre têm o
-- mesmo valor) — não é a forma mais limpa de modelar o dado, mas é
-- o que garante compatibilidade caso seu projeto tenha sido ajustado
-- manualmente com nomes de coluna diferentes dos originais.
-- Bloco idempotente: seguro rodar de novo.
-- ============================================================
alter table public.vistoria_ambientes add column if not exists nome text;
alter table public.vistoria_itens add column if not exists nome text;
alter table public.vistoria_itens add column if not exists status text;

-- ============================================================
-- Nova escala de condição do item (Ótima/Boa/Regular/Ruim, valores
-- internos: otima/boa/regular/ruim) + campo Funcionamento (Sim/Não)
-- para eletros/eletrônicos.
--
-- A constraint antiga de `estado` só aceitava
-- ('bom','regular','avariado','ausente') — como a escala mudou de
-- verdade (não é só troca de nome de coluna) e já tivemos atrito
-- repetido com CHECK/NOT NULL travando o front, removemos a
-- constraint em vez de trocá-la de novo: `estado`/`status` viram
-- texto livre, validado só no app (ESTADOS_ITEM em
-- src/lib/vistoriaExecucao.js).
-- Bloco idempotente: seguro rodar de novo.
-- ============================================================
alter table public.vistoria_itens drop constraint if exists vistoria_itens_estado_check;
alter table public.vistoria_itens add column if not exists funcionamento text;

-- ============================================================
-- Espelho de URLs em vistoria_itens: além da linha em
-- vistoria_fotos (vinculada por item_id), cada upload também
-- acrescenta a URL num array na própria linha do item — útil pra
-- quem quer ler todas as fotos de um item sem fazer join.
-- Bloco idempotente: seguro rodar de novo.
-- ============================================================
alter table public.vistoria_itens add column if not exists fotos_urls jsonb default '[]'::jsonb;

-- ============================================================
-- Payload completo de vistoria_fotos (retrocompatibilidade): além de
-- ambiente_id e item_id, o front agora também envia vistoria_id
-- (referência direta, sem precisar navegar item -> ambiente ->
-- vistoria) e foto_url (nome alternativo de "url", mesmo valor).
-- Bloco idempotente: seguro rodar de novo.
-- ============================================================
alter table public.vistoria_fotos add column if not exists vistoria_id uuid references public.vistorias (id) on delete cascade;
alter table public.vistoria_fotos add column if not exists foto_url text;
create index if not exists idx_vistoria_fotos_vistoria on public.vistoria_fotos (vistoria_id);

-- ============================================================
-- Encerramento com data redundante + observações finais + laudo em
-- PDF: `finalizada_em` e `concluida_em` recebem o mesmo timestamp
-- (retrocompatibilidade de nome de coluna, como os outros pares já
-- existentes). `laudo_pdf_url` é preenchido pelo botão "Imprimir /
-- Baixar Laudo PDF" (gera o PDF no navegador via @react-pdf/renderer,
-- sobe pro Storage e grava a URL aqui — melhor esforço, nunca
-- impede o download já feito no dispositivo do vistoriador).
-- Bloco idempotente: seguro rodar de novo.
-- ============================================================
alter table public.vistorias add column if not exists concluida_em timestamptz;
alter table public.vistorias add column if not exists laudo_pdf_url text;
alter table public.vistorias add column if not exists observacoes_finais text;

-- ============================================================
-- Informações Gerais do Imóvel (estado de limpeza, energia, água,
-- gás) — campos da vistoria como um todo, preenchidos no topo da
-- tela de execução e exibidos numa caixa própria no laudo em PDF,
-- entre o cabeçalho e o Resumo Executivo.
-- Sem CHECK de propósito: a validação de valores fica só no front
-- (ESTADO_LIMPEZA_OPCOES/ENERGIA_OPCOES/AGUA_OPCOES/GAS_OPCOES em
-- src/lib/vistoriaExecucao.js), pelo mesmo motivo já explicado na
-- mudança de escala de condição do item — menos atrito a cada ajuste
-- futuro de rótulo.
-- Bloco idempotente: seguro rodar de novo.
-- ============================================================
alter table public.vistorias add column if not exists estado_limpeza text;
alter table public.vistorias add column if not exists energia text;
alter table public.vistorias add column if not exists agua text;
alter table public.vistorias add column if not exists gas text;

-- ============================================================
-- CEP do imóvel (usado pela busca automática via ViaCEP no
-- formulário de novo imóvel, dentro do agendamento de vistoria).
-- `proprietario_nome`/`inquilino_nome` continuam existindo na
-- tabela (não foram removidas, só pararam de ser coletadas no
-- formulário de cadastro) — histórico de imóveis já cadastrados
-- com esses dados preenchidos continua intacto.
-- Bloco idempotente: seguro rodar de novo.
-- ============================================================
alter table public.imoveis add column if not exists cep text;

-- ============================================================
-- Novos campos de imóvel (Número, Destinação, Tipo de Imóvel) e
-- sinalizador de sincronização da vistoria (`sincronizado`) — usado
-- pelo botão "Sincronizar Vistoria" do vistoriador para liberar o
-- laudo ao Solicitante, independente do texto de `status`.
-- Sem CHECK nos campos novos de imóvel, de propósito (mesma lição
-- da mudança de escala de condição do item): validação de opções
-- fica só no front, menos atrito a cada ajuste futuro de rótulo.
-- Bloco idempotente: seguro rodar de novo.
-- ============================================================
alter table public.imoveis add column if not exists numero text;
alter table public.imoveis add column if not exists destinacao text;
alter table public.imoveis add column if not exists tipo_imovel text;
alter table public.vistorias add column if not exists sincronizado boolean not null default false;
