import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Pencil, Trash2, FileDown, Loader2, MapPin } from 'lucide-react'
import { useState } from 'react'
import StatusBadge from './StatusBadge'
import { buscarDadosParaLaudo } from '../lib/laudoData'
import { gerarLaudoPdfBlob } from '../lib/laudoPdf'

/**
 * Laudo disponível pro Solicitante quando a vistoria foi finalizada
 * pelo vistoriador (`status === 'finalizada'`) OU já foi sincronizada
 * explicitamente (`sincronizado === true`) — qualquer um dos dois já
 * é suficiente, não precisa dos dois ao mesmo tempo.
 */
function podeVerLaudo(v) {
  return v.status === 'finalizada' || v.sincronizado === true
}

/**
 * Ações diretas na linha da tabela (sem menu ⋮). O status da
 * vistoria não tem mais controle manual aqui — muda só por ação do
 * sistema: "agendada" na criação (VistoriaModal), "aceita" quando o
 * vistoriador abre a vistoria em campo (VistoriaExecucao.jsx), e
 * "finalizada" ao finalizar o checklist (finalizarVistoria).
 */
export default function VistoriaListView({ vistorias, onEdit, onDelete, canEdit, canDelete }) {
  const [carregandoLaudoId, setCarregandoLaudoId] = useState(null)
  const [erroLaudo, setErroLaudo] = useState(null) // { id, mensagem }

  const handleVerLaudo = async (v) => {
    // Abre a aba já na hora do clique (síncrono) — se esperasse a
    // busca/geração do PDF terminar pra só então chamar window.open,
    // a maioria dos navegadores bloquearia como pop-up, já que a
    // chamada não aconteceria mais "durante" o gesto do usuário.
    const novaAba = window.open('', '_blank')
    setCarregandoLaudoId(v.id)
    setErroLaudo(null)
    try {
      const { vistoria, ambientes } = await buscarDadosParaLaudo(v.id)
      const blob = await gerarLaudoPdfBlob(vistoria, ambientes)
      const urlObjeto = URL.createObjectURL(blob)
      if (novaAba) {
        novaAba.location.href = urlObjeto
      }
    } catch (err) {
      console.error('[VistoriaListView] Erro ao gerar o laudo:', err.message, err)
      setErroLaudo({ id: v.id, mensagem: err.message || 'Erro ao gerar o laudo.' })
      novaAba?.close()
    } finally {
      setCarregandoLaudoId(null)
    }
  }

  if (vistorias.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm font-medium text-slate-500">Nenhuma vistoria encontrada</p>
        <p className="mt-1 text-xs text-slate-400">Ajuste a busca ou agende uma nova vistoria.</p>
      </div>
    )
  }

  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead>
          <tr className="border-b border-brand-border/70 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <th className="px-4 py-3">Imóvel</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">Data / hora</th>
            <th className="px-4 py-3">Vistoriador</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Ações</th>
          </tr>
        </thead>
        <tbody>
          {vistorias.map((v) => {
            const podeEditar = canEdit(v)
            const podeExcluir = canDelete
            const temLaudo = podeVerLaudo(v)
            const carregandoEsteLaudo = carregandoLaudoId === v.id

            return (
              <tr key={v.id} className="border-b border-brand-border/50 last:border-0 hover:bg-brand-cream/60">
                <td className="px-4 py-3">
                  <p className="font-semibold text-brand-900">{v.imoveis?.codigo_imovel}</p>
                  <p className="flex items-center gap-1 text-xs text-slate-500">
                    <MapPin size={11} /> {v.imoveis?.endereco}
                  </p>
                </td>
                <td className="px-4 py-3 text-slate-700">{v.tipo}</td>
                <td className="px-4 py-3 text-slate-700">
                  {v.data_agendamento
                    ? format(new Date(v.data_agendamento), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                    : '—'}
                </td>
                <td className="px-4 py-3 text-slate-700">{v.vistoriador?.nome || '—'}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={v.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {temLaudo && (
                      <button
                        type="button"
                        onClick={() => handleVerLaudo(v)}
                        disabled={carregandoEsteLaudo}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-brand-cream hover:text-brand-accent disabled:opacity-50"
                        title="Visualizar / Baixar Laudo PDF"
                      >
                        {carregandoEsteLaudo ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <FileDown size={15} />
                        )}
                      </button>
                    )}
                    {podeEditar && (
                      <button
                        type="button"
                        onClick={() => onEdit(v)}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-brand-cream hover:text-brand-accent"
                        title="Editar vistoria"
                      >
                        <Pencil size={15} />
                      </button>
                    )}
                    {podeExcluir && (
                      <button
                        type="button"
                        onClick={() => onDelete(v)}
                        className="rounded-md p-1.5 text-red-500 hover:bg-red-50"
                        title="Excluir vistoria"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                  {erroLaudo?.id === v.id && (
                    <p className="mt-1 text-[10px] font-medium text-red-500">{erroLaudo.mensagem}</p>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
