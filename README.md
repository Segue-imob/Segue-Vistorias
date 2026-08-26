# SEGUE Vistorias

Painel de gestão de vistorias para a **SEGUE Imobiliária** — React + Tailwind CSS + Supabase.

## Telas

- **Agenda** — calendário mensal com badges de vistorias coloridas por status, painel do dia selecionado e filtros por vistoriador/tipo.
- **Vistorias** — listagem com busca (código, endereço, inquilino/proprietário), alternância Lista ↔ Kanban (drag and drop entre colunas) e botão "+ Agendar Vistoria".
- **Usuários** — tabela de equipe com cadastro/edição e toggle Ativo/Inativo.

## Paleta oficial de status

| Status      | Cor       |
|-------------|-----------|
| Agendada    | `#2196F3` |
| Aceita      | `#FFC107` |
| Finalizada  | `#4CAF50` |
| Cancelada   | `#F44336` |

Definida em `src/lib/constants.js` (`STATUS`) — única fonte de verdade usada por todos os componentes.

## 1. Configurar o Supabase

Rode o script `supabase/schema.sql` no **SQL Editor** do seu projeto Supabase (ele cria as tabelas `profiles`, `imoveis`, `vistorias` com os nomes de coluna que o front-end espera, habilita Realtime e RLS básico). Se as tabelas já existirem, apenas confira se os nomes de coluna batem — o front consome:

- `profiles`: `id, nome, email, telefone, role, ativo, created_at`
- `imoveis`: `id, codigo_imovel, endereco, bairro, cidade, proprietario_nome, inquilino_nome`
- `vistorias`: `id, imovel_id, vistoriador_id, tipo, status, data_agendamento, observacoes`

## 2. Rodar localmente

```bash
npm install
cp .env.example .env   # preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm run dev
```

## 3. Deploy na Vercel

1. Suba este projeto num repositório Git (GitHub/GitLab/Bitbucket).
2. Na Vercel, clique em **New Project** e importe o repositório.
3. Framework preset: **Vite** (detectado automaticamente).
4. Em **Environment Variables**, adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy. O `vercel.json` incluso já configura o rewrite de SPA (rotas `/agenda`, `/vistorias`, `/usuarios`).

## Estrutura

```
src/
  components/     # Sidebar, Layout, Modal, Calendar, KanbanBoard, StatusBadge...
  hooks/          # useVistorias, useImoveis, useProfiles (Supabase + Realtime)
  lib/            # supabaseClient.js, constants.js (status/cores/tipos)
  pages/          # Agenda.jsx, Vistorias.jsx, Usuarios.jsx
supabase/
  schema.sql      # DDL de referência (tabelas, RLS, realtime)
```

## Notas de implementação

- **Realtime (canal único)**: para evitar o erro `cannot add postgres_changes callbacks ... after subscribe()` — que acontece quando mais de um componente monta o mesmo hook (ex.: `useProfiles` é chamado tanto em `Agenda.jsx` quanto dentro de `VistoriaModal.jsx`, criando canais duplicados — todo o Realtime do app passa por **um único canal singleton** em `src/lib/realtimeChannel.js`, chamado `schema-db-changes`. Esse módulo registra **todos** os `.on('postgres_changes', ...)` (para `profiles`, `vistorias` e `imoveis`) **antes** do único `.subscribe()` da cadeia, e expõe `subscribeToTable(table, callback)` para que os hooks (`useVistorias`, `useProfiles`, `useImoveis`) apenas "assinem" eventos sem criar canais próprios.
- **"Deletar" vistoria**: por padrão o botão de status "Cancelada" faz um soft-delete (`status = 'cancelada'`), preservando histórico. Ajuste `useVistorias.deleteVistoria` se preferir exclusão física (`.delete()`).
- **Autenticação**: o app assume que o login (Supabase Auth) já existe/roda antes do usuário chegar aqui. Não há tela de login neste pacote — o `LogOut` no rodapé da Sidebar é um placeholder pronto para conectar em `supabase.auth.signOut()`.
