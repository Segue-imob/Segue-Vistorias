import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ExternalLink } from 'lucide-react'
import {
  AGUA_OPCOES,
  ENERGIA_OPCOES,
  ESTADO_LIMPEZA_OPCOES,
  FUNCIONAMENTO_OPCOES,
  GAS_OPCOES,
  getEstadoItemMeta,
  getLabelOpcao
} from '../../lib/vistoriaExecucao'

function formatarDataHora(iso) {
  if (!iso) return '—'
  try {
    return format(new Date(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
  } catch {
    return '—'
  }
}

/** Carimbo sobreposto na miniatura — com segundos, formato exato pedido. */
function formatarCarimboFoto(iso) {
  if (!iso) return null
  try {
    return format(new Date(iso), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })
  } catch {
    return null
  }
}

function labelFuncionamento(valor) {
  return FUNCIONAMENTO_OPCOES.find((f) => f.value === valor)?.label
}

/**
 * Corpo do laudo — usado tanto pela página `/vistorias/:id/laudo`
 * quanto pelo `LaudoModal` (aberto direto na lista de Vistorias).
 * Duas situações:
 * 1. `vistoria.laudo_pdf_url` já existe -> mostra o PDF já gerado
 *    num `<iframe>` (+ link "abrir em nova aba").
 * 2. Não existe ainda -> renderiza o laudo em HTML/React, a partir
 *    de `ambientesParaExibir` (já filtrado por quem chama, via
 *    `filtrarAmbientesParaLaudo` em src/lib/laudoData.js).
 *
 * `onOpenFoto` é chamado com a foto (já enriquecida com
 * ambienteNome/itemNome) ao clicar numa miniatura — quem chama decide
 * como abrir o lightbox (a lista de navegação entre fotos também vive
 * em quem chama, via `construirTodasFotosDoLaudo`).
 */
export default function LaudoConteudo({ vistoria, ambientesParaExibir, totalFotos, onOpenFoto }) {
  const imovel = vistoria.imoveis || {}
  const endereco = [imovel.endereco, imovel.bairro, imovel.cidade].filter(Boolean).join(', ')

  if (vistoria.laudo_pdf_url) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-brand-900">PDF já sincronizado</p>
          <a
            href={vistoria.laudo_pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold text-brand-accent hover:underline"
          >
            <ExternalLink size={13} /> Abrir em nova aba
          </a>
        </div>
        <iframe
          src={vistoria.laudo_pdf_url}
          title="Laudo em PDF"
          className="h-[70vh] w-full rounded-lg border border-brand-border"
        />
        <p className="text-xs text-slate-400">
          Se o PDF não aparecer acima (alguns navegadores bloqueiam a pré-visualização), use "Abrir em nova aba".
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <p className="text-xs text-slate-400">
        Esta vistoria ainda não tem um PDF salvo — exibindo o laudo montado na hora, direto dos dados atuais.
      </p>

      {/* ---- Cabeçalho ---- */}
      <div className="card space-y-3 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Endereço completo</p>
        <p className="text-lg font-bold text-brand-900">{endereco || '—'}</p>
        <div className="grid grid-cols-1 gap-3 border-t border-brand-border pt-3 sm:grid-cols-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Tipo de vistoria</p>
            <p className="text-sm font-semibold text-brand-900">{vistoria.tipo || '—'}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Data/hora de início</p>
            <p className="text-sm font-semibold text-brand-900">{formatarDataHora(vistoria.data_agendamento)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Data/hora de finalização
            </p>
            <p className="text-sm font-semibold text-brand-900">
              {formatarDataHora(vistoria.finalizada_em || vistoria.concluida_em)}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 border-t border-brand-border pt-3 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Vistoriador responsável
            </p>
            <p className="text-sm font-semibold text-brand-900">{vistoria.vistoriador?.nome || '—'}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Total de fotos</p>
            <p className="text-sm font-semibold text-brand-900">{totalFotos}</p>
          </div>
        </div>
      </div>

      {/* ---- Informações do imóvel ---- */}
      {(() => {
        const badges = [
          { rotulo: 'Estado de limpeza', bruto: vistoria.estado_limpeza, opcoes: ESTADO_LIMPEZA_OPCOES },
          { rotulo: 'Energia', bruto: vistoria.energia, opcoes: ENERGIA_OPCOES },
          { rotulo: 'Água', bruto: vistoria.agua, opcoes: AGUA_OPCOES },
          { rotulo: 'Gás', bruto: vistoria.gas, opcoes: GAS_OPCOES }
        ]
          .filter((c) => c.bruto)
          .map((c) => ({ rotulo: c.rotulo, valor: getLabelOpcao(c.opcoes, c.bruto) }))
        if (badges.length === 0) return null
        return (
          <div className="card p-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Informações do imóvel
            </p>
            <div className="flex flex-wrap gap-2">
              {badges.map((b) => (
                <span key={b.rotulo} className="rounded-full bg-brand-cream px-3 py-1.5 text-xs">
                  <span className="font-semibold text-brand-700">{b.rotulo}:</span>{' '}
                  <span className="font-bold text-brand-900">{b.valor}</span>
                </span>
              ))}
            </div>
          </div>
        )
      })()}

      {/* ---- Ambientes / itens / fotos ---- */}
      {ambientesParaExibir.length === 0 ? (
        <div className="card p-6 text-center text-sm text-slate-500">
          Nenhum item avaliado nesta vistoria até o momento.
        </div>
      ) : (
        ambientesParaExibir.map((ambiente, ambIndex) => (
          <div key={ambiente.id} className="card space-y-4 p-4">
            <p className="rounded-md bg-brand-900 px-3 py-1.5 text-sm font-bold text-white">
              {ambIndex + 1}. {ambiente.ambiente || ambiente.nome}
            </p>
            {(ambiente.vistoria_itens || []).map((item, itemIndex) => {
              const meta = getEstadoItemMeta(item.estado)
              const nomeItem = item.item || item.nome
              const funcLabel = labelFuncionamento(item.funcionamento)
              return (
                <div key={item.id} className="border-b border-brand-border/60 pb-3 last:border-0 last:pb-0">
                  <p className="text-sm font-bold text-brand-900">
                    {ambIndex + 1}.{itemIndex + 1} {nomeItem}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5 text-sm text-brand-900">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: meta ? meta.color : '#bfb8ae' }}
                    />
                    {meta ? `Condição: ${meta.label}` : 'Não avaliado'}
                    {funcLabel && <span className="text-slate-500">· Funcionamento: {funcLabel}</span>}
                  </div>
                  {item.observacao && <p className="mt-1 pl-4 text-xs text-slate-500">{item.observacao}</p>}
                  {(item.vistoria_fotos || []).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2 pl-4">
                      {(item.vistoria_fotos || []).map((foto) => (
                        <button
                          key={foto.id}
                          type="button"
                          onClick={() =>
                            onOpenFoto({
                              ...foto,
                              ambienteNome: ambiente.ambiente || ambiente.nome,
                              itemNome: nomeItem
                            })
                          }
                          className="relative h-24 w-32 shrink-0 overflow-hidden rounded-lg border border-brand-border"
                        >
                          <img src={foto.url} alt="Foto do item" className="h-full w-full object-cover" />
                          {foto.created_at && (
                            <span className="pointer-events-none absolute left-1.5 top-1.5 z-10 rounded bg-white/90 px-1.5 py-0.5 text-[9px] font-semibold leading-tight text-slate-900 shadow-sm">
                              {formatarCarimboFoto(foto.created_at)}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))
      )}

      {/* ---- Encerramento ---- */}
      {(vistoria.observacoes_finais || vistoria.assinatura_url) && (
        <div className="card space-y-3 p-4">
          {vistoria.observacoes_finais && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Observações finais</p>
              <p className="text-sm text-slate-700">{vistoria.observacoes_finais}</p>
            </div>
          )}
          {vistoria.assinatura_url && (
            <div className="border-t border-brand-border pt-3">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Assinatura do vistoriador
              </p>
              <img src={vistoria.assinatura_url} alt="Assinatura do vistoriador" className="h-20 object-contain" />
              <p className="mt-1 text-xs text-slate-500">
                Vistoria concluída em: {formatarDataHora(vistoria.finalizada_em || vistoria.concluida_em)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
