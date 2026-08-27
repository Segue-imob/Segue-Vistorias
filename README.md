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

O fluxo de campo do Vistoriador é uma navegação em **2 níveis**:

- **Nível 1 — Ambientes**: cards com o nome do ambiente, barra de progresso e "X/Y itens avaliados", botão **Vistoriar Ambiente**. O seletor "+ Adicionar" ambiente (Sala, Cozinha, Quarto, Banheiro, Varanda ou "Outro" customizado) já carrega, na hora, os **12 itens padrão** como linhas reais no banco — é por isso que o card nasce mostrando "0/12" mesmo antes de entrar nele.
- **Nível 2 — Itens do ambiente**: ao tocar em "Vistoriar Ambiente", a tela troca para a lista de itens daquele ambiente (Piso, Rodapé, Parede, Teto, Porta, Janela, Interruptores e Tomadas, Luminária, Armário, Bancada da Pia, Torneira, Tanque), cada um com seletor de estado (`Bom`/`Regular`/`Avariado`/`Ausente`), campo de observação e upload de foto **por item** (não mais por ambiente). O botão **+ Adicionar Outro Item** cria itens personalizados na hora. **← Voltar para Lista de Ambientes** retorna ao Nível 1.

### Resiliência a nomes de coluna alternativos

`useVistoriaExecucao.js` grava o nome do ambiente/item e o estado em **duas colunas cada** — `ambiente`+`nome` (em `vistoria_ambientes`), `item`+`nome` e `estado`+`status` (em `vistoria_itens`) — para funcionar mesmo que seu banco use um nome de coluna diferente do outro. Isso é redundância deliberada (as duas colunas do par sempre recebem o mesmo valor); `schema.sql` já cria as colunas extras. Se algum `insert`/`update` falhar mesmo assim (sem internet em campo, coluna realmente ausente, etc.), a mensagem exata do Supabase vai pro `console.error` e o ambiente/item aparece na tela com um selo **"não sincronizado"** — a interface não trava, mas esses itens só existem localmente até a próxima gravação bem-sucedida (não sobrevivem a um recarregamento de página).

**Importante — o que eu não implementei de propósito**: itens novos (padrão ou personalizados) sempre nascem com estado `null` ("não avaliado"), nunca pré-preenchidos como "Bom". Preencher automaticamente um item como "em bom estado" antes do vistoriador sequer olhar pra ele forjaria dado num documento que pode virar base de laudo ou disputa de caução — isso é uma escolha de integridade dos dados, não uma lacuna técnica.

Tabelas envolvidas — rode novamente `supabase/schema.sql` (é idempotente) para aplicar:

- `vistoria_ambientes` — um ambiente vistoriado (`vistoria_id`, `ambiente`).
- `vistoria_itens` — cada item de um ambiente (`ambiente_id`, `item`, `estado` — agora **opcional**, `null` até ser avaliado —, `observacao`). Não tem mais unicidade por nome: itens são linhas próprias, criadas de verdade ao adicionar o ambiente (os 12 padrão) ou via "+ Adicionar Outro Item".
- `vistoria_fotos` — ganhou a coluna `item_id` (além de `ambiente_id`, que continua obrigatório): cada foto agora se vincula a um item específico.
- `vistorias` ganhou `assinatura_url`, `finalizada_em` e `laudo_preenchido` (jsonb) — este último recebe, **a cada alteração no checklist**, um snapshot JSON da estrutura completa (ambientes → itens → fotos), útil para consulta/exportação sem precisar recompor os joins. Essa sincronização roda em segundo plano (efeito colateral "melhor esforço": se falhar, só avisa no console, nunca trava a tela).

### "column vistorias.X does not exist" mesmo depois de rodar o `ALTER TABLE`

Se você adicionou uma coluna nova em `vistorias` (ou em qualquer tabela) direto no SQL Editor e o app continua reclamando que a coluna não existe, o mais provável **não é** a coluna em si — é o **cache de schema do PostgREST** (a camada de API REST do Supabase) ainda não ter atualizado. Ele normalmente se atualiza sozinho em alguns segundos, mas às vezes precisa de um empurrão manual:

```sql
notify pgrst, 'reload schema';
```
Rode isso no SQL Editor logo depois de qualquer `ALTER TABLE`/`CREATE TABLE`. Alternativa: Project Settings → API → Restart project.

Por segurança contra esse tipo de dessincronia, as consultas de `vistorias` em `useVistorias.js` e `useVistoriaExecucao.js` usam `select('*', imoveis: ..., vistoriador: ...)` em vez de listar cada coluna — assim, colunas que ainda não existem (ou que existem mas o front não conhece) nunca quebram o carregamento da página.

> Nota: se você criou também `fotos_urls` ou `observacoes_finais` em `vistorias` numa tentativa anterior, saiba que o app **não usa essas duas colunas** — fotos e observações vivem em `vistoria_fotos`/`vistoria_itens` (uma linha por foto/item). `laudo_preenchido`, por outro lado, **é usado** (veja acima). As colunas não usadas não atrapalham nada existindo, só ficam vazias.

### Bucket de Storage: `vistorias-fotos` (plural)

Fotos do checklist e a assinatura digital ficam em `vistorias-fotos/<vistoria_id>/...`. **Esse nome mudou** — versões anteriores deste projeto usavam `vistoria-fotos` (singular) por engano; se você já tinha criado o bucket assim, ele fica órfão e sem uso (pode remover pelo Dashboard). Se o SQL Editor do seu projeto não tiver permissão para alterar o schema `storage`, crie o bucket manualmente (Storage → New bucket → `vistorias-fotos`, público) e aplique as 3 policies da seção de Storage do `schema.sql`.

**Arquitetura no front-end:**
- `src/lib/vistoriaExecucao.js` — constantes (`AMBIENTES_PADRAO`, `ITENS_PADRAO` com os 12 itens, `ESTADOS_ITEM`, `FOTOS_BUCKET`) e `buildMapsUrl()`.
- `src/hooks/useVistoriaExecucao.js` — carrega a vistoria + ambientes/itens/fotos e expõe `addAmbiente` (já cria os 12 itens padrão junto), `removeAmbiente`, `addItemCustom`, `removeItem`, `setItemEstado`, `updateItemObservacao`, `addFotoItem`, `removeFotoItem`, `finalizarVistoria`. Cada ação grava direto no Supabase (sem botão de "salvar rascunho") e dispara a sincronização de `laudo_preenchido`.
- `src/components/execucao/` — `AmbienteSummaryCard` (card do Nível 1, com progresso), `ItemCard` (card do Nível 2, um por item — estado + observação + fotos), `ItemEstadoSelector`, `FotoUploader` (atalho de câmera via `capture="environment"`), `SignatureCanvas` (assinatura em `<canvas>`, mouse + toque) e `FinalizarVistoriaModal` (resumo por item + assinatura + confirmação).
- `src/pages/VistoriaExecucao.jsx` — junta tudo na rota `/minhas-vistorias/:id`, controlando qual nível está ativo (`activeAmbienteId`); quando a vistoria já está `finalizada`/`cancelada`, o checklist abre em modo somente leitura nos dois níveis.

## Gerenciamento de usuários (Administrador)

A aba **Usuários** cadastra, edita e redefine senha de membros da equipe direto pelo app, sem precisar abrir o painel do Supabase.

### Cadastro de usuário — 100% client-side, sem Edge Function

O cadastro usa `supabase.auth.signUp({ email, password })` (client-side, sem depender de nenhuma Edge Function) seguido de um `upsert` em `profiles` com os dados complementares (Nome, Telefone, Role, Ativo). Toda a lógica está em `useProfiles().createUserWithAuth` (`src/hooks/useProfiles.js`). Três cuidados que essa abordagem exige — todos tratados no código:

1. **`signUp()` troca a sessão ativa do navegador** para a do usuário recém-criado (comportamento padrão do Supabase Auth quando chamado com uma sessão já logada). Para o Administrador não ser deslogado a cada cadastro, `createUserWithAuth` guarda a sessão dele com `supabase.auth.getSession()` **antes** de chamar `signUp()`, e a restaura com `supabase.auth.setSession()` logo depois — antes até de gravar o `profiles`, já que a policy de `INSERT` exige que quem está logado no momento seja Administrador. Ainda assim pode haver um breve "piscar" da tela durante a troca, já que isso acontece no navegador; é a limitação de fazer esse fluxo sem um servidor no meio.
2. **Confirmação de e-mail**: se a opção "Confirm email" estiver ligada em Authentication → Providers → Email no seu projeto Supabase, o usuário criado só consegue logar depois de clicar no link enviado por e-mail — o `signUp()` do navegador não tem o equivalente do `email_confirm: true` da API admin. Se quiser que contas criadas pelo Administrador já entrem direto, desligue essa opção.
3. **Fallback (item pedido explicitamente)**: se `signUp()` falhar por qualquer motivo que não seja e-mail duplicado, o app ainda salva o perfil em `profiles` com um `id` gerado localmente via `crypto.randomUUID()`, para o Administrador não perder os dados já digitados — nesse caso aparece um **alerta amarelo** explicando que o perfil foi salvo mas o login não foi criado, com o UUID gerado, para alguém criar manualmente a conta em Authentication → Users depois. E-mail duplicado sempre vira a mensagem "Este e-mail já está cadastrado.", sem cair nesse fallback.

### Alterar senha — ainda usa Edge Function

Diferente do cadastro, **redefinir a senha de um usuário existente continua usando a Edge Function `admin-reset-password`** (`auth.admin.updateUserById`) — não existe um jeito client-side de um Administrador definir a senha de outra pessoa sem a service_role key. Se você não fizer o deploy dela, o botão **Alterar senha** no menu de ações vai falhar com o mesmo erro `Failed to send a request to the Edge Function` que você viu no cadastro:

```bash
supabase link --project-ref SEU_PROJECT_REF
supabase functions deploy admin-reset-password
```

Não é preciso configurar `SUPABASE_URL`, `SUPABASE_ANON_KEY` ou `SUPABASE_SERVICE_ROLE_KEY` manualmente — o Supabase já disponibiliza essas três variáveis automaticamente dentro de toda Edge Function do projeto. Se preferir remover essa dependência também, dá pra trocar por `supabase.auth.resetPasswordForEmail(email)` (manda um link de redefinição para o próprio usuário) — é só pedir.

## Paleta oficial de status

| Status      | Cor       |
|-------------|-----------|
| Agendada    | `#2196F3` |
| Aceita      | `#FFC107` |
| Finalizada  | `#4CAF50` |
| Cancelada   | `#F44336` |

Definida em `src/lib/constants.js` (`STATUS`) — única fonte de verdade usada por todos os componentes.

## Identidade visual da marca

Paleta oficial configurada em `tailwind.config.js` (`theme.extend.colors.brand`) — é a única fonte de verdade para essas cores; nenhum componente usa hex de marca solto, tudo referencia o token:

| Token Tailwind              | Hex       | Uso                                              |
|------------------------------|-----------|---------------------------------------------------|
| `brand-accent`                | `#a64324` | Destaque / ação principal (botões primários, item ativo da Sidebar) |
| `brand-900`                   | `#261912` | Fundo da Sidebar **e** cor de texto escuro em todo o app (títulos, texto principal) |
| `brand-700` / `brand-accentDark` | `#593825` | Secundária / hover (hover de botões primários, hover de itens do menu) |
| `brand-cream`                  | `#f1ede5` | Fundo interno de cards/badges/hovers (nunca fundo de tela inteira — esse é branco) |
| `brand-border`                 | `#bfb8ae` | Bordas e divisores de cards, tabelas e inputs |
| `brand-accentLight`            | `#c9836a` | Tom claro do terracota (avatar da Sidebar, glow do painel de login) |

Fundos de **tela e modal continuam brancos** (`#ffffff`) — só o conteúdo *dentro* deles (cards, badges, linhas de tabela em hover, trilhas de progresso) usa `brand-cream`. As cores de status (tabela acima) são um sistema à parte e não mudam com o rebrand.

Como todo o app já usava os tokens `brand-*` (não classes soltas tipo `indigo-600`), trocar os valores em `tailwind.config.js` já recolore automaticamente botões, estados ativos e realces em todo o app — o trabalho manual ficou em trocar os `slate-50/100/200/300` (fundos e bordas neutras) por `brand-cream`/`brand-border`, e `slate-900/800` (texto escuro) por `brand-900`.

## 1. Configurar o Supabase

Rode o script `supabase/schema.sql` no **SQL Editor** do seu projeto Supabase. Ele cria as tabelas `profiles`, `imoveis`, `vistorias` (+ tabelas do checklist de vistoria) com os nomes de coluna que o front-end espera, habilita Realtime e cria as policies de RLS por role. Se as tabelas já existirem, confira se os nomes de coluna batem — o front consome:

- `profiles`: `id, nome, email, telefone, role, ativo, created_at`
- `imoveis`: `id, codigo_imovel, endereco, bairro, cidade, proprietario_nome, inquilino_nome`
- `vistorias`: `id, imovel_id, vistoriador_id, tipo, status, data_agendamento, observacoes, assinatura_url, finalizada_em, criado_por`

Depois, se você quiser usar a opção "Alterar senha" da aba Usuários, faça o deploy da Edge Function `admin-reset-password` (veja a seção "Gerenciamento de usuários" abaixo) — o cadastro de usuário em si não depende de nenhuma Edge Function.

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
    admin-reset-password/ # Edge Function: redefine senha de um usuário (service role)
    _shared/admin.ts       # helpers compartilhados pela function acima
```

## Notas de implementação

- **Realtime (canal único)**: para evitar o erro `cannot add postgres_changes callbacks ... after subscribe()` — que acontece quando mais de um componente monta o mesmo hook ao mesmo tempo — todo o Realtime do app passa por **um único canal singleton** em `src/lib/realtimeChannel.js`, chamado `schema-db-changes`. Esse módulo registra **todos** os `.on('postgres_changes', ...)` (para `profiles`, `vistorias` e `imoveis`) **antes** do único `.subscribe()` da cadeia, e expõe `subscribeToTable(table, callback)` para que os hooks apenas "assinem" eventos sem criar canais próprios.
- **"Deletar" vistoria**: por padrão o botão de status "Cancelada" faz um soft-delete (`status = 'cancelada'`), preservando histórico. Ajuste `useVistorias.deleteVistoria` se preferir exclusão física (`.delete()`).
- **Autenticação**: `src/pages/Login.jsx` + `src/components/RequireAuth.jsx` cobrem o fluxo completo (login, redirecionamento pós-login, proteção de rota, logout). Não é necessário nenhum outro pacote de auth — tudo usa `supabase.auth` diretamente.
- **Perfil sem role reconhecido**: se `profiles.role` estiver vazio ou não bater com nenhum alias conhecido, o usuário é redirecionado para `/sem-acesso` com uma explicação — não fica preso numa tela em branco.
