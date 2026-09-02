// ------------------------------------------------------------------
// Fonte única de verdade para a hierarquia de permissões do app,
// baseada na coluna `role` da tabela `profiles`.
//
// A coluna `role` pode conter tanto a forma canônica em minúsculas
// ('admin', 'gestao', 'vistoriador') quanto o rótulo em português
// ('Administrador', 'Gestão', 'Vistoriador') — normalizeRole() aceita
// as duas formas, então cadastros antigos continuam funcionando.
// ------------------------------------------------------------------

export const ROLES = {
  ADMIN: 'admin',
  GESTAO: 'gestao',
  VISTORIADOR: 'vistoriador'
}

const ROLE_ALIASES = {
  admin: ROLES.ADMIN,
  administrador: ROLES.ADMIN,
  gestao: ROLES.GESTAO,
  gestor: ROLES.GESTAO,
  vistoriador: ROLES.VISTORIADOR
}

const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Administrador',
  [ROLES.GESTAO]: 'Gestão',
  [ROLES.VISTORIADOR]: 'Vistoriador'
}

/** Remove acentos e normaliza caixa: "Gestão" -> "gestao" */
function stripAccents(value) {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/** Converte qualquer variação salva no banco para o valor canônico interno. */
export function normalizeRole(rawRole) {
  if (!rawRole) return null
  return ROLE_ALIASES[stripAccents(rawRole)] || null
}

export function getRoleLabel(rawRole) {
  const canonical = normalizeRole(rawRole)
  return ROLE_LABELS[canonical] || 'Perfil não configurado'
}

export function isAdmin(role) {
  return normalizeRole(role) === ROLES.ADMIN
}
export function isGestao(role) {
  return normalizeRole(role) === ROLES.GESTAO
}
export function isVistoriador(role) {
  return normalizeRole(role) === ROLES.VISTORIADOR
}

// ------------------------------------------------------------------
// Regras de acesso declarativas — cada chave é usada tanto pelas
// rotas (ProtectedRoute) quanto pela Sidebar e pelos botões.
// ------------------------------------------------------------------
export const PERMISSIONS = {
  // Páginas
  viewAgenda: (role) => isAdmin(role) || isGestao(role),
  viewVistorias: (role) => isAdmin(role),
  viewMinhasVistorias: (role) => isVistoriador(role),
  viewUsuarios: (role) => isAdmin(role),
  // Abrir a tela de Execução/Checklist de uma vistoria específica
  // (/minhas-vistorias/:id): o Vistoriador dono dela, ou o Administrador
  // (para acompanhamento/QA — a checagem de "é o vistoriador certo?"
  // continua acontecendo na consulta em si, via vistoriador_id).
  viewVistoriaExecucao: (role) => isVistoriador(role) || isAdmin(role),
  // Página `/vistorias/:id/laudo` — visualização do laudo em PDF ou
  // em HTML/React (fallback). Aberta na hierarquia inteira; a RLS já
  // restringe o vistoriador aos dados da própria vistoria.
  viewLaudo: (role) => isAdmin(role) || isGestao(role) || isVistoriador(role),

  // Ações
  scheduleVistoria: (role) => isAdmin(role) || isGestao(role),
  manageUsuarios: (role) => isAdmin(role),
  // Alterar status livremente (menu da lista / drag-and-drop do Kanban)
  changeAnyStatus: (role) => isAdmin(role),
  // Aceitar/Confirmar/Finalizar a própria vistoria atribuída
  updateOwnVistoriaStatus: (role) => isVistoriador(role) || isAdmin(role),
  // Pode aparecer no select "Vistoriador responsável" ao agendar
  canBeVistoriadorResponsavel: (role) => isAdmin(role) || isVistoriador(role)
}

/** Para onde mandar o usuário logo após o login, de acordo com o role. */
export function getHomeRouteForRole(role) {
  if (isAdmin(role) || isGestao(role)) return '/agenda'
  if (isVistoriador(role)) return '/minhas-vistorias'
  return '/sem-acesso'
}

// ------------------------------------------------------------------
// Editar/Excluir vistoria dependem não só do role, mas também de QUEM
// é o usuário logado (o solicitante original) — por isso ficam fora
// do mapa PERMISSIONS (que assume só o role como entrada).
// ------------------------------------------------------------------

/** Excluir vistoria (remoção física) é restrito ao Administrador. */
export function canDeleteVistoria(role) {
  return isAdmin(role)
}

/**
 * Editar vistoria é permitido para Administrador, Gestão, ou o
 * solicitante original (quem agendou, coluna `vistorias.criado_por`).
 */
export function canEditVistoria(vistoria, profile, role) {
  if (!vistoria) return false
  if (isAdmin(role) || isGestao(role)) return true
  return Boolean(profile?.id) && vistoria.criado_por === profile.id
}
