// ------------------------------------------------------------------
// Processamento de fotos do checklist antes do upload: marca d'água
// de data/hora, redimensionamento (máx. 1280px de largura) e
// compressão (WebP quando suportado, senão JPEG) — tudo via
// HTML5 Canvas, sem nenhuma lib externa.
// ------------------------------------------------------------------

const LARGURA_MAXIMA = 1280
const QUALIDADE = 0.7

function formatarTimestamp(data = new Date()) {
  const dd = String(data.getDate()).padStart(2, '0')
  const mm = String(data.getMonth() + 1).padStart(2, '0')
  const yyyy = data.getFullYear()
  const hh = String(data.getHours()).padStart(2, '0')
  const min = String(data.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`
}

/**
 * Decodifica um Blob/File em algo desenhável no canvas.
 * `imageOrientation: 'from-image'` respeita o EXIF de rotação de
 * fotos vindas da galeria (sem isso, algumas fotos tiradas na
 * vertical apareceriam deitadas depois de processadas).
 */
export async function blobParaImagemDesenhavel(blob) {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(blob, { imageOrientation: 'from-image' })
    } catch {
      return await createImageBitmap(blob)
    }
  }
  // Fallback para navegadores sem createImageBitmap.
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(blob)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = (err) => {
      URL.revokeObjectURL(url)
      reject(err)
    }
    img.src = url
  })
}

let suporteWebpCache = null
function suportaWebp() {
  if (suporteWebpCache !== null) return suporteWebpCache
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    suporteWebpCache = canvas.toDataURL('image/webp').startsWith('data:image/webp')
  } catch {
    suporteWebpCache = false
  }
  return suporteWebpCache
}

/**
 * Desenha a marca d'água de data/hora no canto superior esquerdo:
 * fundo escuro semi-transparente (não cobre totalmente os detalhes
 * por baixo) + sombra sutil + texto branco pequeno, legível em
 * qualquer foto de fundo claro ou escuro.
 */
function desenharMarcaDagua(ctx, largura, texto) {
  const fontSize = Math.max(11, Math.round(largura * 0.022))
  const paddingX = 8
  const paddingY = 5
  const margem = 8

  ctx.font = `600 ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`
  ctx.textBaseline = 'top'

  const largTexto = ctx.measureText(texto).width
  const boxLargura = largTexto + paddingX * 2
  const boxAltura = fontSize + paddingY * 2

  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
  ctx.beginPath()
  if (ctx.roundRect) {
    ctx.roundRect(margem, margem, boxLargura, boxAltura, 4)
  } else {
    ctx.rect(margem, margem, boxLargura, boxAltura)
  }
  ctx.fill()

  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)'
  ctx.shadowBlur = 2
  ctx.fillStyle = '#ffffff'
  ctx.fillText(texto, margem + paddingX, margem + paddingY)
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
}

/**
 * Pipeline completo: decodifica -> redimensiona (mantendo proporção,
 * só encolhe, nunca amplia) -> marca d'água -> comprime.
 * Retorna { blob, mime, width, height }. Nunca lança: se algo falhar
 * no meio do caminho, quem chama decide o fallback (ver
 * processarArquivoParaUpload em FotoUploader.jsx).
 */
export async function processarFotoParaUpload(sourceBlob, { data = new Date() } = {}) {
  const imagem = await blobParaImagemDesenhavel(sourceBlob)
  const larguraOriginal = imagem.width
  const alturaOriginal = imagem.height

  const escala = larguraOriginal > LARGURA_MAXIMA ? LARGURA_MAXIMA / larguraOriginal : 1
  const largura = Math.round(larguraOriginal * escala)
  const altura = Math.round(alturaOriginal * escala)

  const canvas = document.createElement('canvas')
  canvas.width = largura
  canvas.height = altura
  const ctx = canvas.getContext('2d')
  ctx.drawImage(imagem, 0, 0, largura, altura)

  if (typeof imagem.close === 'function') imagem.close()

  desenharMarcaDagua(ctx, largura, formatarTimestamp(data))

  const mime = suportaWebp() ? 'image/webp' : 'image/jpeg'
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, QUALIDADE))

  if (!blob) throw new Error('Falha ao gerar o arquivo comprimido a partir do canvas.')

  return { blob, mime, width: largura, height: altura }
}

/**
 * Wrapper de conveniência: processa e já devolve um File pronto pra
 * upload, com extensão coerente com o mime final. Nunca lança —
 * se o processamento falhar por qualquer motivo, devolve o arquivo
 * ORIGINAL sem tratamento (o vistoriador não fica sem conseguir
 * anexar a foto por causa de um problema no canvas).
 */
export async function processarArquivoParaUpload(file) {
  try {
    const { blob, mime } = await processarFotoParaUpload(file)
    const extensao = mime === 'image/webp' ? 'webp' : 'jpg'
    const nomeBase = (file.name || `foto-${Date.now()}`).replace(/\.[^/.]+$/, '')
    return new File([blob], `${nomeBase}.${extensao}`, { type: mime })
  } catch (err) {
    console.error(
      "[imageProcessing] Falha ao aplicar marca d'água/compressão — enviando a foto original sem tratamento:",
      err.message,
      err
    )
    return file
  }
}
