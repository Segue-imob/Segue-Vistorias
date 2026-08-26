# SEGUE Vistorias

Painel de gestão de vistorias para a **SEGUE Imobiliária** — React + Tailwind CSS + Supabase.

## Telas

- **Login (`/login`)** — split-screen: formulário de acesso à esquerda (e-mail/senha via `supabase.auth.signInWithPassword`, com visualizador de senha) e apresentação do produto à direita. Rota pública; redireciona para `/` após login bem-sucedido, e para `/login` sempre que não houver sessão válida.
- **Agenda** — calendário mensal com badges de vistorias coloridas por status, painel do dia selecionado, filtros por vistoriador/tipo e botão "Agendar Vistoria". Acesso: Administrador e Gestão.
- **Vistorias** — listagem com busca (código, endereço, bairro, cidade, inquilino/proprietário), alternância Lista ↔ Kanban (drag and drop entre colunas) e botão "+ Agendar Vistoria". Acesso: Administrador.
- **Minhas Vistorias (`/minhas-vistorias`)** — painel mobile-first do Vistoriador, com abas **Novas** (aguardando aceite), **Em Andamento** e **Concluídas**. Cada card tem "Abrir no Mapa" (Google Maps a partir do endereço do imóvel) e, nas Novas, "Aceitar Vistoria". Acesso: Vistoriador.
- **Execução de Vistoria (`/minhas-vistorias/:id`)** — checklist ambiente por ambiente (Sala, Cozinha, Quarto, Banheiro, Varanda ou nome customizado), com 6 itens por ambiente (Piso, Parede, Teto, Portas, Janelas, Tomadas/Interruptores) avaliados como Bom/Regular/Avariado/Ausente, observação em texto e upload de fotos (com atalho direto para a câmera no celular). Botão fixo "Finalizar Vistoria" abre um modal de encerramento com resumo do checklist, assinatura digital em canvas e o botão "Finalizar e Salvar Vistoria", que grava a assinatura no Storage e muda o status para `finalizada`. Acesso: Vistoriador.
- **Usuários** — tabela de equipe com cadastro completo (Auth + `profiles`, com senha), edição de perfil e redefinição de senha via menu de ações, e toggle Ativo/Inativo. Acesso: Administrador.

## Autenticação e sessão

- `src/pages/Login.jsx` — tela split-screen. Chama `supabase.auth.signInWithPassword({ email, password })`; em caso de erro, `src/lib/authErrors.js` traduz a resposta do Supabase para mensagens específicas ("E-mail ou senha incorretos", "Erro ao conectar à sessão", "Seu e-mail ainda não foi confirmado" etc.) mostradas em um alerta vermelho. Em caso de sucesso navega para `/`, e `App.jsx` decide a rota final de acordo com o `role` do usuário.
- **Visualizar senha**: o campo de senha tem um botão de olho (ícone `Eye`/`EyeOff`) que alterna `type="password"` ↔ `type="text"` para conferir os caracteres digitados.
- **Conta de teste**: por padrão, nenhuma credencial fica no código-fonte — a senha nunca é embutida no bundle, pois isso viraria uma porta dos fundos visível a qualquer pessoa que inspecionasse o JS do site publicado. Em vez disso:
  - a autenticação já aceita normalmente qualquer usuário com conta no Supabase Auth **e** uma linha correspondente em `profiles` (inclusive `rogerbsjr@gmail.com`, se já cadastrado) — não foi preciso nenhuma mudança de código para isso, só confirmar que o profile existe com o `role` certo;
  - opcionalmente, defina `VITE_SHOW_TEST_LOGIN=true` (e, se quiser, `VITE_TEST_LOGIN_EMAIL=...`) no `.env` para exibir um botão discreto "Entrar com conta de teste" abaixo do formulário — ele só **preenche o campo de e-mail**, a senha continua sendo digitada manualmente. Deixe `VITE_SHOW_TEST_LOGIN=false` (ou omita a variável) em produção.
- Se o usuário já tiver sessão válida e cair em `/login` por engano, é redirecionado automaticamente.
- `src/components/RequireAuth.jsx` — protege todas as rotas internas (Agenda, Vistorias, Minhas Vistorias, Usuários, Sem Acesso): sem sessão válida, redireciona para `/login` guardando a rota de origem.
- `src/components/ProtectedRoute.jsx` — camada extra dentro de cada rota já autenticada: verifica se o `role` tem a permissão daquela página (ver seção abaixo) e redireciona para `/sem-acesso` caso não tenha.
- O botão **Sair** no rodapé da Sidebar chama `supabase.auth.signOut()`; a sessão cai, `RequireAuth` detecta e redireciona para `/login` automaticamente.

### Login "não funciona" — causas comuns (fora da UI)

Se o alerta vermelho aparecer com "E-mail ou senha incorretos" mesmo com a senha certa, ou se o login parecer funcionar mas a tela ficar em branco/redirecionar para `/sem-acesso`, o problema geralmente não é a tela de login em si:

1. **Usuário existe no Supabase Auth mas não em `profiles`** (ou o `id` não bate com `auth.users.id`) — `AuthContext` não encontra o perfil, `role` fica `null`, e o app manda para `/sem-acesso`. Confira em Table Editor se existe uma linha em `profiles` com o mesmo `id` do usuário em Authentication → Users.
2. **E-mail não confirmado** — se a confirmação de e-mail estiver habilitada no projeto Supabase (Authentication → Providers → Email), o login falha até o usuário confirmar. Agora isso aparece como mensagem específica ("Seu e-mail ainda não foi confirmado...").
3. **`role` com valor não reconhecido** — `normalizeRole()` só reconhece `admin`/`administrador`/`gestao`/`gestão`/`gestor`/`vistoriador` (com ou sem acento, maiúsculas/minúsculas). Qualquer outro texto na coluna `role` manda o usuário para `/sem-acesso`.
4. **Variáveis de ambiente erradas na Vercel** — `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` apontando para o projeto Supabase errado (ou não configuradas) fazem toda tentativa de login cair no erro "Erro ao conectar à sessão".

## Hierarquia de permissões (role)

O acesso é controlado pela coluna `role` de `profiles`, com três perfis:

| Role (canônico) | Rótulo        | Agenda | Vistorias (lista/kanban) | Minhas Vistorias | Usuários | Agendar vistoria | Pode ser vistoriador responsável |
|------------------|---------------|:------:|:-------------------------:|:-----------------:|:--------:|:-----------------:|:----------------------------------:|
| `admin`          | Administrador | ✅ | ✅ | — | ✅ | ✅ | ✅ |
| `gestao`         | Gestão        | ✅ | ❌ | — | ❌ | ✅ | ❌ |
| `vistoriador`    | Vistoriador   | ❌ | ❌ | ✅ (só as suas) | ❌ | ❌ | ✅ |

- A lógica vive em `src/lib/permissions.js` (`PERMISSIONS`, `normalizeRole`, `getHomeRouteForRole`). `normalizeRole` aceita tanto o valor canônico (`admin`/`gestao`/`vistoriador`) quanto o rótulo em português já salvo no banco (`Administrador`/`Gestão`/`Vistoriador`), então dados legados continuam funcionando.
- `src/context/AuthContext.jsx` busca a sessão do Supabase Auth e o registro correspondente em `profiles`, expondo `role` para o resto do app.
- `src/components/ProtectedRoute.jsx` bloqueia a navegação direta por URL: se o role não tiver a permissão da rota, redireciona para `/sem-acesso`.
- `src/components/Sidebar.jsx` e `src/components/Layout.jsx` (menu mobile) filtram os itens de navegação (`src/lib/navItems.js`) pela mesma tabela de permissões — quem não pode ver "Usuários", por exemplo, nunca vê o item no menu.
- O botão "Agendar Vistoria" (Agenda) só aparece para quem tem `scheduleVistoria` (`admin`/`gestao`).
- `src/pages/MinhasVistorias.jsx` busca só as vistorias com `vistoriador_id` igual ao `profiles.id` do usuário logado (filtro na própria query do Supabase, via `useVistorias({ vistoriadorId })`), organizadas em 3 abas por status: **Novas** (`agendada`), **Em Andamento** (`aceita`) e **Concluídas** (`finalizada`/`cancelada`). O botão "Aceitar Vistoria" move `agendada` → `aceita` (rotulado "Em Andamento" na UI, mesmo valor de status usado em toda a aplicação — ver seção seguinte).
- `src/pages/VistoriaExecucao.jsx` é a tela de checklist (rota `/minhas-vistorias/:id`), aberta ao tocar num card em "Em Andamento" ou "Concluídas" (neste caso em modo somente leitura).
- `useProfiles().vistoriadores` (usado no select "vistoriador responsável" ao agendar) inclui perfis `Vistoriador` **e** `Administrador` ativos, conforme pedido.
- **Importante**: os controles acima são só a camada de UI/rota. A segurança de verdade fica nas policies de RLS em `supabase/schema.sql`, que replicam a mesma hierarquia diretamente no Postgres (ex.: um Vistoriador não consegue ler/atualizar vistorias de outra pessoa mesmo chamando a API diretamente).

## Editar e excluir vistoria

Disponível nos três lugares onde uma vistoria aparece como card/linha — **Agenda** (painel do dia), **Vistorias → Kanban** e **Vistorias → Lista**:

- **Editar** (ícone de lápis): permitido para Administrador, Gestão, ou quem agendou a vistoria (`vistorias.criado_por`). Abre o mesmo `VistoriaModal` usado para agendar, pré-preenchido com Tipo, Data, Hora, Vistoriador responsável e Observações — o imóvel fica travado (não editável) porque não estava na lista de campos editáveis pedida. Ao salvar, faz um `UPDATE` (`useVistorias().updateVistoria`) em vez de criar uma vistoria nova.
- **Excluir** (ícone de lixeira): só aparece para Administrador. Abre `ConfirmDialog` com o texto "Tem certeza que deseja excluir permanentemente esta vistoria? Esta ação não afetará os dados históricos." — ao confirmar, `useVistorias().removeVistoria` faz um `DELETE` físico na tabela `vistorias` (diferente de `deleteVistoria`, que só cancela) e remove a linha do estado local na hora, sem esperar o Realtime.
- `criado_por` é uma coluna nova em `vistorias` (uuid → `profiles.id`), preenchida automaticamente com o usuário logado no momento do agendamento. As regras de "quem pode editar/excluir" vivem em `src/lib/permissions.js` (`canEditVistoria`, `canDeleteVistoria`) e são espelhadas na policy de `UPDATE` do Postgres em `schema.sql` (o `DELETE` já era restrito ao Administrador desde a policy criada para a hierarquia de roles).
- No Kanban, os botões ficam num container com `draggable={false}` + `stopPropagation` no `mousedown`, para não conflitar com o arrastar-e-soltar do card.

## Execução de vistoria (checklist do Vistoriador)



O fluxo completo de campo do Vistoriador precisou de 3 tabelas novas — rode novamente `supabase/schema.sql` (é idempotente) para criá-las:

- `vistoria_ambientes` — um ambiente vistoriado (`vistoria_id`, `ambiente`, `observacao`).
- `vistoria_itens` — o estado de cada item dentro de um ambiente (`ambiente_id`, `item`, `estado` — `bom`/`regular`/`avariado`/`ausente`; único por `(ambiente_id, item)`).
- `vistoria_fotos` — fotos anexadas a um ambiente (`ambiente_id`, `url`).
- `vistorias` ganhou duas colunas novas: `assinatura_url` (URL da assinatura no Storage) e `finalizada_em`.

Também é criado um **bucket de Storage público chamado `vistoria-fotos`** (fotos do checklist e a assinatura digital ficam em `vistoria-fotos/<vistoria_id>/...`). Se o SQL Editor do seu projeto não tiver permissão para alterar o schema `storage`, crie o bucket manualmente pelo Dashboard (Storage → New bucket → `vistoria-fotos`, público) e aplique as 3 policies do fim do `schema.sql` em Storage → Policies.

**Arquitetura no front-end:**
- `src/lib/vistoriaExecucao.js` — constantes (`AMBIENTES_PADRAO`, `ITENS_PADRAO`, `ESTADOS_ITEM`) e `buildMapsUrl()`.
- `src/hooks/useVistoriaExecucao.js` — carrega a vistoria + ambientes/itens/fotos e expõe `addAmbiente`, `removeAmbiente`, `updateObservacao`, `setItemEstado`, `addFoto`, `removeFoto`, `finalizarVistoria`. Cada ação já grava direto no Supabase (sem botão de "salvar rascunho" — o progresso nunca fica só na memória).
- `src/components/execucao/` — `AmbienteCard` (checklist do ambiente), `ItemEstadoSelector` (seletor de 4 estados), `FotoUploader` (upload com atalho de câmera via `capture="environment"`), `SignatureCanvas` (assinatura em `<canvas>`, mouse + toque) e `FinalizarVistoriaModal` (resumo + assinatura + confirmação).
- `src/pages/VistoriaExecucao.jsx` — junta tudo na rota `/minhas-vistorias/:id`; quando a vistoria já está `finalizada`/`cancelada`, o checklist abre em modo somente leitura.

## Gerenciamento de usuários (Administrador)

A aba **Usuários** cadastra, edita e redefine senha de membros da equipe direto pelo app, sem precisar abrir o painel do Supabase. Isso exige duas **Edge Functions**, porque criar um usuário com senha em Supabase Auth só pode ser feito de duas formas:

- `supabase.auth.signUp()` no navegador — **não usamos essa opção**: ela troca a sessão do navegador para a do usuário recém-criado, ou seja, o Administrador seria deslogado a cada cadastro.
- `supabase.auth.admin.createUser()` — exige a **service_role key**, que nunca pode ir para o código do front-end (ela ignora todo o RLS; se vazasse no bundle do site, qualquer visitante teria acesso total ao banco).

A solução: as duas ações rodam em **Supabase Edge Functions** (servidor, com a service_role key protegida como variável de ambiente que o Supabase já injeta automaticamente — não precisa configurar nada manualmente):

- `supabase/functions/admin-create-user` — cria o usuário em Auth (`auth.admin.createUser`) e a linha em `profiles` na sequência; se o `profiles` falhar, desfaz a criação em Auth (rollback). Retorna `"Este e-mail já está cadastrado."` quando o e-mail já existe.
- `supabase/functions/admin-reset-password` — redefine a senha de um usuário existente (`auth.admin.updateUserById`), acionado pelo item **Alterar senha** no menu de ações (ícone `⋮`) de cada linha da tabela.
- `supabase/functions/_shared/admin.ts` — helpers compartilhados: monta os dois clientes Supabase (um autenticado como quem chamou, outro com a service_role) e confirma que quem chamou é, de fato, um Administrador — checagem redundante com o RLS, mas que já barra a chamada antes de tocar no banco.

**Deploy das functions** (com o [Supabase CLI](https://supabase.com/docs/guides/cli) instalado e logado):

```bash
supabase link --project-ref SEU_PROJECT_REF
supabase functions deploy admin-create-user
supabase functions deploy admin-reset-password
```

Não é preciso configurar `SUPABASE_URL`, `SUPABASE_ANON_KEY` ou `SUPABASE_SERVICE_ROLE_KEY` manualmente — o Supabase já disponibiliza essas três variáveis automaticamente dentro de toda Edge Function do projeto.

No front-end, `src/hooks/useProfiles.js` expõe `createUserWithAuth(payload)` e `resetUserPassword(userId, password)`, que chamam essas functions via `supabase.functions.invoke(...)` e traduzem o corpo de erro da resposta (`error.context`) para uma mensagem legível — é daí que vêm os alertas "Usuário cadastrado com sucesso!", "Senha atualizada com sucesso!" e "Este e-mail já está cadastrado." na tela.

## Paleta oficial de status

| Status      | Cor       |
|-------------|-----------|
| Agendada    | `#2196F3` |
| Aceita      | `#FFC107` |
| Finalizada  | `#4CAF50` |
| Cancelada   | `#F44336` |

Definida em `src/lib/constants.js` (`STATUS`) — única fonte de verdade usada por todos os componentes.

## 1. Configurar o Supabase

Rode o script `supabase/schema.sql` no **SQL Editor** do seu projeto Supabase. Ele cria as tabelas `profiles`, `imoveis`, `vistorias` (+ tabelas do checklist de vistoria) com os nomes de coluna que o front-end espera, habilita Realtime e cria as policies de RLS por role. Se as tabelas já existirem, confira se os nomes de coluna batem — o front consome:

- `profiles`: `id, nome, email, telefone, role, ativo, created_at`
- `imoveis`: `id, codigo_imovel, endereco, bairro, cidade, proprietario_nome, inquilino_nome`
- `vistorias`: `id, imovel_id, vistoriador_id, tipo, status, data_agendamento, observacoes, assinatura_url, finalizada_em, criado_por`

Depois, faça o deploy das Edge Functions de gerenciamento de usuários (veja a seção "Gerenciamento de usuários" abaixo) — sem isso, a aba Usuários não consegue cadastrar novas contas.

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
5. Deploy. O `vercel.json` incluso já configura o rewrite de SPA (rotas `/agenda`, `/vistorias`, `/minhas-vistorias`, `/usuarios`).

## Estrutura

```
src/
  components/     # Sidebar, Layout, RequireAuth, ProtectedRoute, Modal, Calendar, KanbanBoard, StatusBadge,
                   # PasswordField, SuccessBanner, UsuarioModal, ResetPasswordModal...
  components/execucao/  # AmbienteCard, ItemEstadoSelector, FotoUploader, SignatureCanvas, FinalizarVistoriaModal
  context/        # AuthContext.jsx (sessão Supabase + profiles.role)
  hooks/          # useVistorias, useImoveis, useProfiles, useVistoriaExecucao (Supabase + Realtime)
  lib/            # supabaseClient.js, constants.js, permissions.js, navItems.js, realtimeChannel.js, vistoriaExecucao.js, authErrors.js
  pages/          # Login.jsx, Agenda.jsx, Vistorias.jsx, MinhasVistorias.jsx, VistoriaExecucao.jsx, Usuarios.jsx, SemAcesso.jsx
supabase/
  schema.sql      # DDL de referência (tabelas, RLS por role, realtime, checklist de vistoria, storage)
  functions/
    admin-create-user/    # Edge Function: cria usuário em Auth + profiles (service role)
    admin-reset-password/ # Edge Function: redefine senha de um usuário (service role)
    _shared/admin.ts       # helpers compartilhados pelas duas functions
```

## Notas de implementação

- **Realtime (canal único)**: para evitar o erro `cannot add postgres_changes callbacks ... after subscribe()` — que acontece quando mais de um componente monta o mesmo hook ao mesmo tempo — todo o Realtime do app passa por **um único canal singleton** em `src/lib/realtimeChannel.js`, chamado `schema-db-changes`. Esse módulo registra **todos** os `.on('postgres_changes', ...)` (para `profiles`, `vistorias` e `imoveis`) **antes** do único `.subscribe()` da cadeia, e expõe `subscribeToTable(table, callback)` para que os hooks apenas "assinem" eventos sem criar canais próprios.
- **"Deletar" vistoria**: por padrão o botão de status "Cancelada" faz um soft-delete (`status = 'cancelada'`), preservando histórico. Ajuste `useVistorias.deleteVistoria` se preferir exclusão física (`.delete()`).
- **Autenticação**: `src/pages/Login.jsx` + `src/components/RequireAuth.jsx` cobrem o fluxo completo (login, redirecionamento pós-login, proteção de rota, logout). Não é necessário nenhum outro pacote de auth — tudo usa `supabase.auth` diretamente.
- **Perfil sem role reconhecido**: se `profiles.role` estiver vazio ou não bater com nenhum alias conhecido, o usuário é redirecionado para `/sem-acesso` com uma explicação — não fica preso numa tela em branco.
