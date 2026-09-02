# SEGUE Vistorias

Painel de gestão de vistorias para a **SEGUE Imobiliária** — React + Tailwind CSS + Supabase.

## Telas

- **Login (`/login`)** — split-screen: formulário de acesso à esquerda (e-mail/senha via `supabase.auth.signInWithPassword`, com visualizador de senha) e apresentação do produto à direita. Rota pública; redireciona para `/` após login bem-sucedido, e para `/login` sempre que não houver sessão válida.
- **Agenda** — calendário mensal com badges de vistorias coloridas por status, painel do dia selecionado, filtros por vistoriador/tipo e botão "Agendar Vistoria". Acesso: Administrador e Gestão.
- **Vistorias** — listagem em formato de tabela, com busca (código, endereço, bairro, cidade, inquilino/proprietário) e botão "+ Agendar Vistoria". Acesso: Administrador.
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

Disponível nos dois lugares onde uma vistoria aparece como card/linha — **Agenda** (painel do dia) e **Vistorias → Lista**:

- **Visualizar / Baixar Laudo** (ícone de download): só aparece quando `status === 'finalizada'` ou `sincronizado === true`. Vem primeiro no menu `⋮` da lista de Vistorias.
- **Excluir** (ícone de lixeira, texto em vermelho): só aparece para Administrador — logo após "Visualizar / Baixar Laudo" no menu. Abre `ConfirmDialog` com o texto "Tem certeza que deseja apagar esta vistoria? Todos os ambientes, itens e fotos associados serão excluídos permanentemente." — ao confirmar, `useVistorias().removeVistoria` faz um `DELETE` físico na tabela `vistorias` (diferente de `deleteVistoria`, que só cancela) e remove a linha do estado local na hora, sem esperar o Realtime. O `DELETE` já propaga em cascata pro banco inteiro (`vistoria_ambientes` → `vistoria_itens`/`vistoria_fotos`, todos com `on delete cascade` desde o schema original) — apagar a vistoria já apaga tudo associado a ela.
- **Editar** (ícone de lápis): permitido para Administrador, Gestão, ou quem agendou a vistoria (`vistorias.criado_por`). Abre o mesmo `VistoriaModal` usado para agendar, pré-preenchido com Tipo, Data, Hora, Vistoriador responsável e Observações — o imóvel fica travado (não editável) porque não estava na lista de campos editáveis pedida. Ao salvar, faz um `UPDATE` (`useVistorias().updateVistoria`) em vez de criar uma vistoria nova.
- `criado_por` é uma coluna nova em `vistorias` (uuid → `profiles.id`), preenchida automaticamente com o usuário logado no momento do agendamento. As regras de "quem pode editar/excluir" vivem em `src/lib/permissions.js` (`canEditVistoria`, `canDeleteVistoria`) e são espelhadas na policy de `UPDATE` do Postgres em `schema.sql` (o `DELETE` já era restrito ao Administrador desde a policy criada para a hierarquia de roles).

**A tela Vistorias não tem mais alternância Lista ↔ Kanban** — ficou só no formato de tabela. `KanbanBoard.jsx` continua no repositório (não deletei o arquivo), só não é mais importado por `Vistorias.jsx`; é reaproveitável se quiser reintroduzir uma visão em quadro no futuro.

## Execução de vistoria (checklist do Vistoriador)

O fluxo de campo do Vistoriador é uma navegação em **2 níveis**:

- **Nível 1 — Ambientes**: cards com o nome do ambiente, barra de progresso e "X/Y itens avaliados", botão **Vistoriar Ambiente**. O seletor "+ Adicionar" ambiente (Sala, Cozinha, Quarto, Banheiro, Varanda ou "Outro" customizado) já carrega, na hora, os **12 itens padrão** como linhas reais no banco — é por isso que o card nasce mostrando "0/12" mesmo antes de entrar nele.
- **Nível 2 — Itens do ambiente**: ao tocar em "Vistoriar Ambiente", a tela troca para a lista de itens daquele ambiente (Piso, Rodapé, Parede, Teto, Porta, Janela, Interruptores e Tomadas, Luminária, Armário, Bancada da Pia, Torneira, Tanque), cada um com seletor de **Condição** (`Ótimo`/`Bom`/`Regular`/`Ruim`), seletor de **Funcionamento** (`Sim`/`Não`, útil para eletros/eletrônicos), campo de observação e upload de foto **por item**, com limite de **30 fotos por item** (contador "X/30" sempre visível). O botão **+ Adicionar Outro Item** cria itens personalizados na hora. **← Voltar para Lista de Ambientes** retorna ao Nível 1.

### Informações Gerais do Imóvel

Card fixo no topo do Nível 1 (`InformacoesGeraisCard`, antes da lista de ambientes) — é sobre a vistoria como um todo, não sobre um ambiente específico, então fica fora da navegação em 2 níveis:

- **Estado de Limpeza**: `Limpo` / `Empoeirado` / `Sujo`
- **Energia Elétrica**: `Ligada` / `Desligada`
- **Água**: `Ligada` / `Desligada`
- **Gás**: `Ligado` / `Desligado`

Cada seleção grava direto em `vistorias` (`updateInfoGeral(campo, valor)` no hook — um `UPDATE` de uma coluna só por vez, sem passar por ambiente/item) assim que tocada, sem precisar de um botão "salvar" separado. Vira somente leitura quando a vistoria está encerrada, igual ao resto do checklist. No laudo em PDF, esses quatro valores aparecem numa caixa própria "INFORMAÇÕES DO IMÓVEL", logo abaixo do cabeçalho e antes do Resumo Executivo.

### Câmera nativa (WebRTC) para as fotos do checklist

O botão "Foto" de cada item abre `CameraCaptureModal` — câmera em tela cheia via `navigator.mediaDevices.getUserMedia`, não o seletor de arquivo do sistema:


- **Disparo consecutivo**: cada toque no botão de captura desenha o frame atual do `<video>` num `<canvas>` oculto, gera um `Blob` e empilha numa lista local — a câmera continua aberta. Só ao tocar em **Concluir** as fotos capturadas na sessão são enviadas de uma vez (`onUpload` chamado em sequência para cada uma).
- **Zoom 1x/2x/3x**: tenta a constraint nativa da câmera (`track.applyConstraints({ advanced: [{ zoom }] })`) quando o hardware/navegador suporta; sempre aplica também um `scale()` via CSS no `<video>` como zoom digital — funciona mesmo em dispositivos sem zoom óptico controlável.
- **Flash/lanterna**: usa a constraint `torch`; o botão só aparece quando `track.getCapabilities().torch` existir (a maioria dos notebooks não tem — é normal ficar oculto fora de celular).
- **Contador e "Concluir"**: topo do modal mostra fotos capturadas na sessão e quantas ainda cabem até o limite de 30; "Concluir" fecha a câmera e dispara o upload.
- **Fallback de galeria**: se `getUserMedia` falhar (permissão negada, navegador sem suporte, contexto não-seguro sem HTTPS), o modal mostra a mensagem de erro com um botão "Escolher da galeria", que cai no `<input type="file">` tradicional — a câmera custom nunca deixa o vistoriador travado sem conseguir anexar foto nenhuma.

**Atenção**: `getUserMedia` exige contexto seguro — funciona em `https://` e em `localhost`, mas **não funciona em HTTP puro** (comum em preview de rede local tipo `http://192.168.x.x`). Isso não é uma limitação do código, é uma exigência de segurança do próprio navegador.

### Encerramento e laudo em PDF

Ao clicar em "Finalizar e Salvar Vistoria" (modal de encerramento, que agora também tem um campo de **Observações finais**), `finalizarVistoria` grava:

```js
{
  status: 'finalizada',        // ver nota abaixo — não 'Concluída'
  finalizada_em: <timestamp>,
  concluida_em: <mesmo timestamp>,   // redundante, por retrocompatibilidade
  assinatura_url: <URL da assinatura no Storage>,
  observacoes_finais: <texto do campo novo, ou null>,
  laudo_preenchido: <snapshot JSON de ambientes/itens/fotos>
}
```

**Por que `status` continua `'finalizada'` e não virou `'Concluída'`**: essa é a string que toda a aplicação já usa pra decidir o que é "vistoria encerrada" — a aba Concluídas em Minhas Vistorias, as cores do Kanban, o `StatusBadge`, e a própria variável `isEncerrada` desta tela. Trocar o valor faria a vistoria "desaparecer" desses lugares (nenhum filtro reconheceria o texto novo), mesmo com o dado certo salvo no banco. A palavra já aparece como **"Finalizada"** pro usuário final — mesma ideia de "Concluída", sem quebrar nada.

Depois de finalizar, a tela **não navega mais embora automaticamente** — fica na própria vistoria, agora em modo somente leitura, porque é aqui que mora o botão do laudo.

**Estrutura do laudo em PDF** (`src/lib/laudoPdf.jsx`, gerado 100% no navegador via `@react-pdf/renderer`, sem depender de servidor — layout baseado num modelo de laudo real de mercado, adaptado à paleta e aos dados da SEGUE Vistorias):

1. **Cabeçalho — card único, espelhado com o de baixo**: marca "SEGUE Vistorias" (quadrado arredondado com o ícone de lupa em branco + wordmark, cores `#a64324`/`#261912` — ver seção do logotipo abaixo) fora do card, e logo abaixo um único card com fundo `#f1ede5`, borda sutil e cantos arredondados (`seccaoCard` — a mesma classe de estilo usada pelo card de Informações do Imóvel, garantindo simetria visual entre os dois): Endereço completo em destaque no topo, depois uma linha de 3 colunas (Tipo de Vistoria / Data-hora de Início / Data-hora de Finalização) separadas por divisores finos, e por fim uma linha de 2 colunas (Vistoriador Responsável / **Total de Fotos** — contagem dinâmica, soma só as fotos que efetivamente aparecem no corpo do laudo). O campo Solicitante foi removido do quadro — como não era usado em mais nenhum outro lugar do app, também tirei o join `solicitante:criado_por` da busca da vistoria em `useVistoriaExecucao`, evitando uma consulta desnecessária.
2. **Card "Informações do Imóvel" — idêntico ao de cima**: mesmo `seccaoCard` (fundo, borda, espaçamento), título "INFORMAÇÕES DO IMÓVEL" no topo, e uma única linha com até 4 colunas bem distribuídas (Estado de Limpeza / Energia / Água / Gás), também separadas por divisores finos — só entram na linha os campos que o vistoriador de fato preencheu; se nenhum estiver preenchido, o card inteiro some. Rótulos sempre em caixa alta pequena na cor `#593825`, valores sempre em negrito na cor `#261912` — o mesmo padrão tipográfico nos dois cards.
3. **Introdução + legenda de condição** — parágrafo introdutório e a legenda "Parâmetros de Avaliação / Condição dos Itens" (ÓTIMO/BOM/REGULAR/RUIM, com as cores oficiais).
4. **Resumo executivo** — cards com total de ambientes, "X/Y itens avaliados", e a contagem de itens em cada condição (Ótimo/Bom/Regular/Ruim), coloridos com a mesma paleta usada no checklist.
5. **Detalhamento por ambiente — filtrado, numerado e agrupado por item, fotos inline**: só ambientes com pelo menos um item avaliado aparecem no laudo (numerados sequencialmente, sem buraco: "1. Sala", "2. Cozinha"...); dentro deles, só os itens com condição efetivamente preenchida — **itens "Não avaliado" nunca aparecem no corpo do laudo**, e cada um ganha numeração hierárquica ("1.1 Piso", "1.2 Parede", "2.1 Bancada da Pia"...). Para cada item, nessa ordem exata — título numerado em negrito; linha de status (bolinha colorida indicando a condição + "Condição: {label}" + "· Funcionamento: {Sim/Não/N/A}" quando informado); observação como parágrafo indentado; e, logo em seguida, a **grade com as fotos exclusivas daquele item** (até 3 por linha — a própria largura da página só comporta 3 caixas de 158pt antes de quebrar linha). Não existe galeria global ao final do ambiente: cada item carrega suas fotos coladas nele, e um item sem fotos simplesmente não reserva espaço nenhum pra grade — segue direto pro próximo item. Cada foto é clicável (`<Link src={foto.url}>`, a URL pública original, não a versão embutida) e abre a imagem em alta resolução numa nova aba do navegador. A marca d'água de data/hora já está queimada nos pixels desde o upload, então nenhum redesenho é necessário aqui.

   **O Resumo Executivo (item 4 acima) continua contando TODOS os itens, avaliados ou não** — filtrar ali também esconderia justamente o que esse card existe pra revelar (progresso/pendências). O filtro do item "Não avaliado" se aplica só ao corpo detalhado do laudo, onde só faz sentido mostrar o que foi de fato vistoriado.
6. **Encerramento** — observações finais (se preenchidas), um termo de responsabilidade original (não copiado do modelo de referência — apenas inspirado na estrutura), e o bloco de assinatura com a imagem capturada + data de conclusão.

### Seção "Introdução" no laudo

Logo após a caixa "Informações do Imóvel" e antes do Resumo Executivo, o laudo agora tem uma seção **Introdução** (`Introducao()` em `laudoPdf.jsx`): um parágrafo explicando o propósito do relatório, seguido de "Parâmetros de Avaliação / Condição dos Itens" — uma legenda com bolinha colorida + descrição de cada condição (ÓTIMO/BOM/REGULAR/RUIM), usando as mesmas cores oficiais de `ESTADOS_ITEM`. A nomenclatura (masculina — Ótimo/Bom/Regular/Ruim) é a mesma usada em todo o resto do laudo e do app, padronizada a partir de `ESTADOS_ITEM.label`.

### Exibição condicional do Funcionamento — checagem estrita

A linha de status de cada item já omitia "Funcionamento" quando o campo estava vazio (`item.funcionamento ? ... : ''`), mas isso só protegia contra `null`/`undefined`/string vazia — qualquer outro valor que não fosse exatamente `'sim'` ou `'nao'` (por exemplo, um resíduo de dado antigo ou um valor fora do esperado) ainda passava pela checagem de "truthy" e caía no fallback `'N/A'` de `labelFuncionamento()`, imprimindo "Funcionamento: N/A" indevidamente. Troquei por `funcionamentoFoiSelecionado(valor)`, que só considera preenchido quando o valor é **exatamente** `'sim'` ou `'nao'` — qualquer outra coisa (incluindo um eventual "N/A" salvo por engano) faz a linha de Funcionamento não aparecer, nunca chegando a chamar `labelFuncionamento()` de dentro da renderização visível.

### Nova paleta das condições (bolinhas do laudo e badges do app)

Atualizada em `ESTADOS_ITEM` (`src/lib/vistoriaExecucao.js`) — fonte única usada tanto no seletor de condição do checklist quanto nas bolinhas do laudo em PDF:

| Condição | Cor      |
|----------|----------|
| Ótimo    | `#2563EB` (azul) |
| Bom      | `#16A34A` (verde) |
| Regular  | `#CA8A04` (amarelo) |
| Ruim     | `#DC2626` (vermelho) |

Antes, "Ótimo" e "Bom" usavam dois tons de verde bem parecidos (`#16A34A` e `#65A30D`) — difícil de distinguir à primeira vista. A troca pra azul/verde deixa as quatro condições visualmente inconfundíveis.

### Por que as fotos apareciam em branco no PDF

`imageProcessing.js` comprime as fotos em **WebP** quando o navegador suporta (a maioria hoje). O `@react-pdf/renderer`, porém, só decodifica **PNG e JPEG** nativamente — qualquer imagem `.webp` vira uma caixa em branco no PDF, mesmo com a URL certa, sem nenhum problema de CORS envolvido. A correção, em `laudoPdf.jsx`:

- `converterImagemParaPngDataUrl(url)` busca a foto pela URL pública, decodifica no `<canvas>` (o navegador decodifica WebP perfeitamente pra exibição — só reaproveitamos esse decode) e reembala como PNG em `data:` URI. Isso também elimina qualquer fetch assíncrono durante a montagem do PDF em si.
- `prepararDadosParaPdf()` roda essa conversão pra toda foto de todo item (e pra assinatura) **antes** de montar o `<Document>`, em paralelo por ambiente/item. Cada foto guarda `_pdfSrc` (o PNG embutido, o que de fato é desenhado) mantendo `url` intacta (usada só no link clicável).
- Se uma conversão específica falhar (rede, CORS, foto removida), a foto não trava o laudo inteiro — aparece uma caixa "Foto indisponível — abrir original abaixo" com o link clicável ainda funcionando por baixo.
- `coletarFotosDoItem()` combina as fotos vindas do join com `vistoria_fotos` **e** quaisquer URLs presentes só em `item.fotos_urls` sem uma linha correspondente em `vistoria_fotos` (o cenário de rede de segurança de uma entrega anterior, quando o `insert` na tabela falha mas a URL sobrevive no array) — evitando que essas fotos fiquem de fora do laudo.

Ao clicar em "Imprimir / Baixar Laudo PDF" (visível só quando a vistoria está encerrada), o PDF é baixado direto no dispositivo do vistoriador (via link temporário) **e** enviado ao Storage, gravando a URL em `vistorias.laudo_pdf_url` — essa segunda parte é melhor esforço: se falhar, o download já feito não é desfeito, só fica sem o link permanente salvo no banco.

**Por que `@react-pdf/renderer` em vez de `html2pdf.js`/`window.print()`**: das três opções que você deu, essa foi a única que gera um `Blob` de verdade no navegador — necessário pra poder subir o arquivo pro Storage e preencher `laudo_pdf_url`. `window.print()` delega pro diálogo de impressão do sistema operacional e nunca dá acesso a esse Blob (o "Salvar como PDF" acontece do lado de fora do JavaScript), então não daria pra popular essa coluna automaticamente.

**Isso é uma dependência nova** (`@react-pdf/renderer`, adicionada em `package.json`) — este ambiente não tem acesso à internet pra rodar `npm install` e testar a geração de ponta a ponta, então rode `npm install` localmente antes de testar o botão pela primeira vez.



### Galeria de fotos: navegação global, nome do PDF e campos condicionais

**Lightbox com navegação entre todas as fotos da vistoria**: tocar em qualquer miniatura do checklist (edição ou somente leitura) abre `PhotoLightbox` — uma **instância única, hospedada em `VistoriaExecucao.jsx`**, não uma por item. `todasFotos` é uma lista achatada (via `useMemo`) com todas as fotos de todos os ambientes/itens da vistoria, em ordem, cada uma carregando `ambienteId`/`itemId`/`ambienteNome`/`itemNome`. Layout atual:
- **Overlay** escuro semi-transparente com `backdrop-blur` — a tela do checklist por trás fica levemente visível e borrada, não totalmente escondida.
- **Header**: título centralizado "Visualizador de Fotos do Laudo - {Ambiente · Item}" e botão "✕ Voltar para o Laudo" no canto direito.
- **❮ Anterior / Próxima ❯**: setas grandes nas laterais, com texto (some em telas muito estreitas, fica só o ícone) — e `←`/`→` do teclado — navegam por **todas** as fotos da vistoria sem fechar o modal, cruzando de um item/ambiente pro próximo automaticamente. Só aparecem quando há pra onde ir (primeira foto não mostra "Anterior", última não mostra "Próxima").
- **Footer**: contador centralizado "Foto X de Y", data de envio de um lado, botão "Remover foto" do outro (só quando a vistoria não está encerrada — `isEncerrada` controla isso globalmente agora, em vez de cada `FotoUploader` decidir por conta própria).
- Fechar: **✕**, clique em qualquer parte do overlay fora da foto, ou tecla **ESC** — os três já existiam e continuam funcionando.
- A remoção rápida pelo **✕** discreto no canto da miniatura continua local em `FotoUploader` (não precisa de navegação, então não subiu pro nível global). Em qualquer um dos dois caminhos (✕ discreto ou "Remover foto" no lightbox), `removeFotoItem` apaga a linha em `vistoria_fotos`, remove a URL do array `vistoria_itens.fotos_urls` (mantendo os dois em sincronia) e atualiza o estado local na hora — o contador "X/30" reflete a contagem nova automaticamente.

**Isso é o visualizador do app, não o arquivo PDF exportado**: um PDF estático não tem como abrir um modal React — um link clicável dentro de um PDF sempre navega pra URL, em qualquer leitor (Chrome, Adobe, etc.), isso não é algo que dê pra trocar por software. A experiência interativa completa (setas, contador, fechar com ESC) só existe aqui, no app; dentro do PDF em si, a foto continua abrindo a URL original numa nova aba.

**Nome automático do arquivo do laudo**: `montarNomeArquivoLaudo()` (`src/lib/vistoriaExecucao.js`) monta `"Vistoria {Tipo} - CI {Código} - {Endereço}.pdf"` sem acentos (ex.: "Saída" vira "Saida", batendo com o exemplo pedido) e sem caracteres inválidos de nome de arquivo. **Atenção**: não existe uma coluna própria de "nome do edifício" em `imoveis` (só `endereco`, `bairro`, `cidade`, `codigo_imovel`) — o endereço completo é usado no lugar de "Ed. Nautilus" no exemplo. Se quiser o nome curto do prédio de verdade no arquivo, é preciso cadastrar isso em algum campo próprio (posso adicionar se quiser).

**Exibição estritamente condicional**: `Funcionamento` e `Observações` já só apareciam no laudo quando preenchidos (isso já valia desde a introdução da lista por item). O que estava faltando: a caixa "Informações do Imóvel" — agora `InformacoesImovel` filtra os 4 campos (Limpeza/Energia/Água/Gás) e só mostra badge pro que o vistoriador de fato preencheu (nada de badge com "—"); se os quatro estiverem vazios, a seção inteira some do laudo.

### Tratamento das fotos antes do upload (marca d'água, redimensionamento e compressão)

Todo upload — vindo da câmera custom ou do fallback de galeria — passa por `processarArquivoParaUpload()` (`src/lib/imageProcessing.js`) antes de subir pro Storage:

1. **Marca d'água de data/hora**: desenha a foto num `<canvas>` e escreve a data/hora **atual** (formato `27/08/2026 16:18`) no canto superior esquerdo — fonte pequena e branca, com uma caixa de fundo escuro semi-transparente e sombra sutil por trás, legível em qualquer foto sem cobrir demais os detalhes do imóvel. Como o processamento roda logo após a captura, "data/hora atual" na prática já corresponde ao momento da captura.
2. **Redimensionamento**: se a largura original passar de 1280px, encolhe proporcionalmente até 1280px (nunca amplia uma foto menor).
3. **Compressão**: converte pra WebP a 70% de qualidade (`canvas.toBlob`); se o navegador não suportar WebP, cai automaticamente para JPEG a 70%.

Se qualquer etapa falhar (navegador sem `createImageBitmap`, canvas bloqueado, etc.), `processarArquivoParaUpload` nunca lança — devolve a foto **original sem tratamento** em vez de travar o upload, e registra o erro exato no console.

**Vínculo no banco**: cada foto processada é enviada ao bucket, e a URL pública resultante é gravada em **dois lugares em paralelo**:
1. Uma linha em `vistoria_fotos`, com o payload completo (retrocompatibilidade): `{ vistoria_id, ambiente_id, item_id, foto_url, url }` — `foto_url` e `url` sempre com o mesmo valor.
2. Acrescentada ao array `vistoria_itens.fotos_urls`.

A miniatura aparece na tela **imediatamente** assim que o upload ao Storage termina, independente do resultado dessas duas gravações — se o `insert` em `vistoria_fotos` falhar (ex.: coluna nova ainda não propagada no cache do PostgREST), a foto não some: `fotos_urls` funciona como rede de segurança (a URL sobrevive lá mesmo sem a linha em `vistoria_fotos`), a miniatura continua visível com um selo "não sincronizado", e o erro exato vai pro console — nunca lança exceção que interrompa o restante do lote de fotos sendo enviado.

**Limitação assumida**: para fotos tiradas pela câmera do app, a marca d'água reflete o momento real da captura. Para fotos escolhidas da galeria (imagens já existentes no aparelho), o app usa a data/hora do momento em que a foto foi *anexada* no checklist, não a data EXIF original do arquivo — ler o EXIF de verdade exigiria uma biblioteca externa, fora do escopo pedido.

### Resiliência a nomes de coluna alternativos

`useVistoriaExecucao.js` grava o nome do ambiente/item e o estado em **duas colunas cada** — `ambiente`+`nome` (em `vistoria_ambientes`), `item`+`nome` e `estado`+`status` (em `vistoria_itens`) — para funcionar mesmo que seu banco use um nome de coluna diferente do outro. Isso é redundância deliberada (as duas colunas do par sempre recebem o mesmo valor); `schema.sql` já cria as colunas extras. Se algum `insert`/`update` falhar mesmo assim (sem internet em campo, coluna realmente ausente, etc.), a mensagem exata do Supabase vai pro `console.error` e o ambiente/item aparece na tela com um selo **"não sincronizado"** — a interface não trava, mas esses itens só existem localmente até a próxima gravação bem-sucedida (não sobrevivem a um recarregamento de página).

**Importante — o que eu não implementei de propósito**: itens novos (padrão ou personalizados) sempre nascem com estado `null` ("não avaliado"), nunca pré-preenchidos como "Ótimo"/"Bom". Preencher automaticamente um item como avaliado antes do vistoriador sequer olhar pra ele forjaria dado num documento que pode virar base de laudo ou disputa de caução — isso é uma escolha de integridade dos dados, não uma lacuna técnica.

**Mudança de escala (2ª vez)**: a condição do item mudou de `Bom/Regular/Avariado/Ausente` para `Ótimo/Bom/Regular/Ruim` (nomenclatura padronizada no masculino). Vale notar que o conceito de **"Ausente"** (item que simplesmente não existe no imóvel) não tem equivalente direto na nova escala — se isso for relevante pro seu fluxo (ex.: um armário que deveria existir mas não existe), o campo Observações continua disponível para registrar isso em texto. Como a escala já mudou duas vezes, `schema.sql` agora **remove** a constraint `CHECK` de `estado` em vez de trocá-la de novo — a validação de valores válidos passa a viver só no front (`ESTADOS_ITEM`), evitando outro ciclo de erro de constraint a cada ajuste futuro de rótulo.

Tabelas envolvidas — rode novamente `supabase/schema.sql` (é idempotente) para aplicar:

- `vistoria_ambientes` — um ambiente vistoriado (`vistoria_id`, `ambiente`, `nome`).
- `vistoria_itens` — cada item de um ambiente (`ambiente_id`, `item`/`nome`, `estado`/`status` — opcional, `null` até ser avaliado, sem CHECK —, `funcionamento`, `observacao`, `fotos_urls` — array espelhando as URLs de `vistoria_fotos`). Não tem mais unicidade por nome: itens são linhas próprias, criadas de verdade ao adicionar o ambiente (os 12 padrão) ou via "+ Adicionar Outro Item".
- `vistoria_fotos` — colunas: `ambiente_id` (obrigatório), `item_id`, `vistoria_id` e `foto_url` (espelha `url`) — payload completo enviado a cada insert, para retrocompatibilidade com diferentes nomes de coluna.
- `vistorias` ganhou `assinatura_url`, `finalizada_em`, `laudo_preenchido` (jsonb) e, mais recentemente, `estado_limpeza`/`energia`/`agua`/`gas` (Informações Gerais do Imóvel — ver seção acima). `laudo_preenchido` recebe, **a cada alteração no checklist**, um snapshot JSON da estrutura completa (ambientes → itens → fotos), útil para consulta/exportação sem precisar recompor os joins. Essa sincronização roda em segundo plano (efeito colateral "melhor esforço": se falhar, só avisa no console, nunca trava a tela).

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

## Cadastro de imóvel (dentro do agendamento de vistoria)

O formulário de "Novo imóvel" fica embutido em `VistoriaModal.jsx` (colapsável, acionado pelo link "+ Novo imóvel" ao lado do seletor de Imóvel) — não é uma tela própria, é um atalho pra cadastrar o imóvel sem sair do fluxo de agendar a vistoria.

**Campos, nesta ordem**: Identificação/Código → CEP (com busca automática) → Endereço/Rua e Número lado a lado → Bairro e Cidade lado a lado → Destinação (`Residencial`/`Comercial`) e Tipo de Imóvel (`Apartamento`/`Casa`/`Loja`/`Sala`/`Cobertura`/`Garden`/`Lote`/`Galpão`) lado a lado → botão "Salvar imóvel". Os campos **Proprietário** e **Inquilino** foram removidos do formulário — as colunas `proprietario_nome`/`inquilino_nome` continuam existindo em `imoveis` (não foram apagadas do banco, só pararam de ser coletadas aqui), então imóveis cadastrados antes dessa mudança mantêm esses dados intactos. `numero`/`destinacao`/`tipo_imovel` são colunas novas, sem `CHECK` (mesma lição de sempre: validação só no front).

**Busca automática por CEP (ViaCEP)**: `formatarCep()` aplica a máscara `00000-000` enquanto o usuário digita; assim que os 8 dígitos estiverem completos, `handleCepChange` busca `https://viacep.com.br/ws/{cep}/json/` e preenche Endereço, Bairro e Cidade automaticamente — o usuário ainda pode editar os três campos depois, a busca só poupa digitação. Se o CEP não existir (`dados.erro`) ou a requisição falhar (rede instável, ViaCEP fora do ar), aparece um aviso abaixo do campo e o formulário continua usável normalmente pra preenchimento manual — nunca trava a tela. O valor do CEP também é salvo na coluna `imoveis.cep` (nova).



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

## Sincronização do laudo para o Solicitante

Depois de finalizar a vistoria, o vistoriador vê dois botões no card "Esta vistoria já foi encerrada": **"Imprimir / Baixar Laudo PDF"** (baixa uma cópia local, como já existia) e **"Sincronizar Vistoria"** (novo) — ambos ficam lado a lado.

"Sincronizar Vistoria" gera o laudo, sobe pro Storage, grava `laudo_pdf_url` e marca `vistorias.sincronizado = true`; ao terminar, mostra a mensagem de sucesso "Vistoria sincronizada com sucesso! O laudo já está disponível para o solicitante." (`sincronizarVistoria()` em `useVistoriaExecucao.js`). Diferente de `salvarLaudoPdf` (melhor esforço, nunca lança), esta função **lança em caso de erro** — é a ação principal do botão, então uma falha precisa aparecer de verdade, não ser engolida silenciosamente. Se a vistoria já foi sincronizada antes, um aviso "✓ Esta vistoria já foi sincronizada" aparece mesmo sem clicar de novo.

**Por que não usei `status: 'Concluída'`, de novo**: mesma razão já explicada em `finalizarVistoria` — essa string quebraria a filtragem por status em todo o app (aba Concluídas, Kanban, badge). `sincronizado` é uma coluna booleana própria, independente de `status`, que resolve a necessidade real (sinalizar "o laudo está pronto pro solicitante") sem interferir em nada que já dependia do valor `'finalizada'`.

**Acesso ao laudo pelo Administrador (`/vistorias`)**: a lista (`VistoriaListView.jsx`) agora mostra um ícone de download ao lado do badge de Status — e a mesma ação também aparece no menu `⋮` como "Visualizar / Baixar Laudo" — sempre que `status === 'finalizada'` **ou** `sincronizado === true` (não precisa dos dois; qualquer um já libera). Clicar busca os dados completos do checklist sob demanda (`buscarDadosParaLaudo()`, em `src/lib/laudoData.js` — reproduz a mesma consulta em 3 passos do `useVistoriaExecucao`, só que como função avulsa, sem estado de React, porque a lista não pode pré-carregar o checklist inteiro de toda vistoria de uma vez), gera o PDF e abre numa nova aba.

Um detalhe técnico da implementação: a aba nova é aberta **de forma síncrona**, no exato momento do clique (`window.open('', '_blank')`, antes de qualquer `await`) — só depois disso a busca e a geração do PDF acontecem, e o resultado é jogado na aba já aberta (`novaAba.location.href = urlObjeto`). Se a aba fosse aberta só depois do PDF pronto, a maioria dos navegadores bloquearia como pop-up, já que a chamada não aconteceria mais "durante" o gesto de clique do usuário.

**Sobre "remover restrição de visualização baseada no ID do usuário"**: verifiquei as políticas de RLS de `vistoria_ambientes`/`vistoria_itens`/`vistoria_fotos` e o hook `useVistorias.js` antes de mexer — não existe nenhuma restrição dessas hoje. Todas as políticas de `select` dessas três tabelas já incluem `is_admin() or is_gestao() or ...`, e `useVistorias()` sem um `vistoriadorId` explícito (como é usado em `/vistorias`) já traz todas as vistorias, de qualquer vistoriador. Não havia nada pra remover — o Administrador já tinha acesso completo; só faltava a interface pra usar esse acesso, que é o que essa entrega adiciona.

**Kanban removido da tela Vistorias** nesta mesma leva de mudanças — ver "A tela Vistorias não tem mais alternância Lista ↔ Kanban" logo acima na seção "Editar e excluir vistoria".



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

### Logotipo — quadrado com ícone de lupa

O ícone dentro do quadrado arredondado (`bg-brand-accent`) é uma **lupa** (`Search` da `lucide-react`), branca, centralizada — aparece em 3 lugares na interface, todos trocados juntos: `Sidebar.jsx` (nav desktop), `Layout.jsx` (topbar mobile) e `Login.jsx` (tela de acesso). Antes dessa troca era o ícone `Building2` (prédio) — não havia uma letra "S" na interface, só no laudo em PDF.

No laudo em PDF, `@react-pdf/renderer` não tem acesso a bibliotecas de ícones (não dá pra simplesmente importar `Search` da lucide-react ali) — então o mesmo desenho foi reproduzido manualmente em SVG puro (`IconeLupaPdf` em `laudoPdf.jsx`, usando `Svg`/`Circle`/`Line` do próprio `@react-pdf/renderer`): um círculo e uma linha diagonal, traço branco, sem preenchimento — a mesma forma do ícone `Search`, só que desenhada à mão em vez de importada. Antes disso, o quadrado do laudo tinha a letra "S" em texto.

**Não existe um logo próprio nas telas de resumo/encerramento da vistoria** (`VistoriaExecucao.jsx`) — essas telas são renderizadas dentro do mesmo `Layout`/`Sidebar` que envolve todo o app, então a marca já aparece ali através da navbar/topbar persistente, sem precisar de uma cópia própria embutida na página.

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
