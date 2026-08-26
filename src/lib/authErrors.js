// Traduz os erros crus do Supabase Auth para mensagens que fazem
// sentido para quem está tentando entrar no SEGUE Vistorias.
export function mapAuthError(error) {
  if (!error) return 'Não foi possível entrar agora. Tente novamente em instantes.'

  const msg = (error.message || '').toLowerCase()

  if (msg.includes('invalid login credentials') || msg.includes('invalid email or password')) {
    return 'E-mail ou senha incorretos. Verifique os dados e tente novamente.'
  }

  if (msg.includes('email not confirmed')) {
    return 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada antes de entrar.'
  }

  if (msg.includes('rate limit') || msg.includes('too many requests')) {
    return 'Muitas tentativas em pouco tempo. Aguarde um instante e tente novamente.'
  }

  if (msg.includes('user not found')) {
    return 'E-mail ou senha incorretos. Verifique os dados e tente novamente.'
  }

  // Falhas de rede geralmente não vêm com error.message útil — podem
  // ser TypeError ("Failed to fetch") ou erros sem status HTTP.
  if (
    msg.includes('network') ||
    msg.includes('fetch') ||
    msg.includes('failed to fetch') ||
    error.name === 'TypeError'
  ) {
    return 'Erro ao conectar à sessão. Verifique sua internet e tente novamente.'
  }

  if (error.status === 400 || msg.includes('invalid')) {
    return 'E-mail ou senha incorretos. Verifique os dados e tente novamente.'
  }

  return 'Não foi possível entrar agora. Tente novamente em instantes.'
}
