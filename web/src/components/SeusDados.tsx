import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, History, Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import { baixar } from '../lib/exportar'
import { hojeIso } from '../lib/format'
import type { RegistroAuditoria } from '../lib/types'
import { Campo, Modal, useToast } from './ui'

const NOME_TABELA: Record<string, string> = {
  transacoes: 'Transação', contas: 'Conta', metas: 'Meta', orcamentos: 'Orçamento',
  investimentos: 'Investimento', of_conexoes: 'Conexão bancária', profiles: 'Perfil',
}
const VERBO: Record<RegistroAuditoria['operacao'], string> = { INSERT: 'criad', UPDATE: 'alterad', DELETE: 'apagad' }
const MASCULINO = new Set(['orcamentos', 'investimentos', 'profiles'])

function resumo(r: RegistroAuditoria) {
  const d = (r.depois ?? r.antes ?? {}) as Record<string, unknown>
  if (r.tabela === 'profiles' && r.depois && 'termos_versao' in r.depois) return `Termos de uso aceitos (versão ${String(r.depois.termos_versao)})`
  const nome = (d.descricao || d.nome || d.categoria || d.instituicao || d.tipo || '') as string
  const valor = typeof d.valor === 'number' ? ` · R$ ${d.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''
  const verbo = VERBO[r.operacao] + (MASCULINO.has(r.tabela) ? 'o' : 'a')
  return `${NOME_TABELA[r.tabela] ?? r.tabela} ${verbo}${nome ? `: ${nome}` : ''}${valor}`
}

/** Direitos do titular dos dados: baixar tudo, ver o histórico de alterações e excluir a conta. */
export function SeusDados() {
  const avisar = useToast()
  const nav = useNavigate()
  const [historico, setHistorico] = useState<RegistroAuditoria[] | null>(null)
  const [excluir, setExcluir] = useState(false)
  const [confirmacao, setConfirmacao] = useState('')
  const [ocupado, setOcupado] = useState(false)

  async function exportar() {
    setOcupado(true)
    try {
      const dados = await api.exportarMeusDados()
      baixar(JSON.stringify(dados, null, 2), `meus-dados-meudindin-${hojeIso()}.json`, 'application/json')
      avisar('Seus dados foram baixados.')
    } catch (e) { avisar(e instanceof Error ? e.message : 'Não foi possível exportar.', 'erro') }
    finally { setOcupado(false) }
  }

  async function confirmarExclusao() {
    setOcupado(true)
    try {
      await api.excluirMinhaConta(confirmacao)
      nav('/boas-vindas')
    } catch (e) { avisar(e instanceof Error ? e.message : 'Não foi possível excluir a conta.', 'erro') }
    finally { setOcupado(false) }
  }

  return (
    <section className="painel">
      <header className="painel-topo"><h2>Seus dados</h2><a href="/termos" target="_blank" rel="noopener">Termos e privacidade</a></header>
      <p className="sutil">Só você acessa seus dados. Você pode levá-los com você ou apagar tudo a qualquer momento.</p>
      <div className="dados-acoes">
        <button className="btn btn-secundario" onClick={exportar} disabled={ocupado}><Download size={17} aria-hidden="true" /> Baixar meus dados</button>
        <button className="btn btn-secundario" onClick={async () => setHistorico(await api.historico(50))}><History size={17} aria-hidden="true" /> Ver histórico de alterações</button>
      </div>
      {historico && (
        historico.length === 0 ? <p className="sutil">Nenhuma alteração registrada ainda.</p> : (
          <ul className="historico">
            {historico.map((r) => (
              <li key={r.id}>
                <span>{resumo(r)}</span>
                <small>{new Date(r.quando).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}{r.autor === 'sistema' ? ' · automático' : ''}</small>
              </li>
            ))}
          </ul>
        )
      )}
      <button className="link-simples perigo excluir-conta" onClick={() => setExcluir(true)}><Trash2 size={15} aria-hidden="true" /> Excluir minha conta</button>

      <Modal titulo="Excluir conta" aberto={excluir} onFechar={() => { setExcluir(false); setConfirmacao('') }} estreito>
        <div className="form">
          <p>Isso apaga permanentemente suas transações, contas, metas, investimentos, conquistas e o histórico, e encerra as conexões com bancos. Não dá para desfazer.</p>
          <p className="sutil">Se quiser guardar uma cópia, baixe seus dados antes.</p>
          <Campo rotulo='Digite EXCLUIR para confirmar'>
            <input value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} autoComplete="off" />
          </Campo>
          <button className="btn btn-perigo btn-largo" disabled={confirmacao !== 'EXCLUIR' || ocupado} onClick={confirmarExclusao}>
            {ocupado ? 'Excluindo…' : 'Excluir minha conta'}
          </button>
        </div>
      </Modal>
    </section>
  )
}
