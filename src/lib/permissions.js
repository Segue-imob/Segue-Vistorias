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
