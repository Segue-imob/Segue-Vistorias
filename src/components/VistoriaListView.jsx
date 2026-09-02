import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { MoreVertical, MapPin, Pencil, Trash2, FileDown, Loader2 } from 'lucide-react'
import { useState } from 'react'
import StatusBadge from './StatusBadge'
import { STATUS_ORDER, getStatusMeta } from '../lib/constants'
import { buscarDadosParaLaudo } from '../lib/laudoData'
import { gerarLaudoPdfBlob } from '../lib/laudoPdf'

/**
 * Laudo disponível pro Solicitante quando a vistoria foi finalizada
 * pelo vistoriador (`status === 'finalizada'`) OU já foi sincronizada
 * explicitamente (`sincronizado === true`) — qualquer um dos dois já
 * é suficiente, não precisa dos dois ao mesmo tempo. Não existe
 * restrição de acesso por ID de usuário aqui: esta tela já é do
 * Administrador (RLS libera is_admin() em todas as tabelas do
 * checklist), então qualquer vistoria elegível mostra a opção.
 */
function podeVerLaudo(v) {
  return v.status === 'finalizada' || v.sincronizado === true
}

export default function VistoriaListView({ vistorias, onChangeStatus, onEdit, onDelete, canEdit, canDelete }) {
  const [openMenuId, setOpenMenuId] = useState(null)
  const [carregandoLaudoId, setCarregandoLaudoId] = useState(null)
  const [erroLaudo, setErroLaudo] = useState(null) // { id, mensagem }

  const handleVerLaudo = async (v) => {
    setOpenMenuId(null)
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
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-brand-border/70 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <th className="px-4 py-3">Imóvel</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">Data / hora</th>
            <th className="px-4 py-3">Vistoriador</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3" />
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
                  <div className="flex items-center gap-2">
                    <StatusBadge status={v.status} />
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
                  </div>
                  {erroLaudo?.id === v.id && (
                    <p className="mt-1 text-[10px] font-medium text-red-500">{erroLaudo.mensagem}</p>
                  )}
                </td>
                <td className="relative px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => setOpenMenuId(openMenuId === v.id ? null : v.id)}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-brand-cream"
                  >
                    <MoreVertical size={16} />
                  </button>
                  {openMenuId === v.id && (
                    <div className="absolute right-4 z-10 mt-1 w-56 rounded-lg border border-brand-border/70 bg-white py-1 shadow-modal">
                      {temLaudo && (
                        <button
                          type="button"
                          onClick={() => handleVerLaudo(v)}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium text-slate-600 hover:bg-brand-cream"
                        >
                          <FileDown size={13} /> Visualizar / Baixar Laudo
                        </button>
                      )}
                      {podeEditar && (
                        <button
                          type="button"
                          onClick={() => {
                            onEdit(v)
                            setOpenMenuId(null)
                          }}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium text-slate-600 hover:bg-brand-cream"
                        >
                          <Pencil size={13} /> Editar vistoria
                        </button>
                      )}
                      {podeExcluir && (
                        <button
                          type="button"
                          onClick={() => {
                            onDelete(v)
                            setOpenMenuId(null)
                          }}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={13} /> Excluir vistoria
                        </button>
                      )}
                      {(temLaudo || podeEditar || podeExcluir) && <div className="my-1 border-t border-brand-border/70" />}
                      {STATUS_ORDER.map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => {
                            onChangeStatus(v.id, status)
                            setOpenMenuId(null)
                          }}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium text-slate-600 hover:bg-brand-cream"
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: getStatusMeta(status).color }}
                          />
                          Mover para {getStatusMeta(status).label}
                        </button>
                      ))}
                    </div>
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
