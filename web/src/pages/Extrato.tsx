import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { api } from '../lib/api'
import { somar } from '../lib/analise'
import { dinheiro, intervaloMes } from '../lib/format'
import { useDados, useMes } from '../lib/hooks'
import { ListaTransacoes, NovaTransacao } from '../components/Transacoes'
import { Carregando, SeletorMes, useToast, Vazio } from '../components/ui'
import { Moedas } from '../components/Illustracoes'
import { ExportarExtrato } from '../components/ExportarExtrato'

export function Extrato() {
  const avisar = useToast()
  const { mes, ano, mover } = useMes()
  const [nova, setNova] = useState(false)
  const [tipo, setTipo] = useState<'todas' | 'receita' | 'despesa'>('todas')
  const [busca, setBusca] = useState('')
  const [categoria, setCategoria] = useState('')
  const { dados, recarregar } = useDados(async () => {
    const [ts, contas] = await Promise.all([api.transacoes(intervaloMes(mes, ano)), api.contas()])
    return { ts, contas }
  }, [mes, ano])

  const filtradas = useMemo(() => (dados?.ts ?? []).filter((t) =>
    (tipo === 'todas' || t.tipo === tipo) &&
    (!categoria || t.categoria === categoria) &&
    (!busca || `${t.descricao} ${t.categoria}`.toLowerCase().includes(busca.toLowerCase()))), [dados, tipo, categoria, busca])

  if (!dados) return <Carregando />
  const categorias = [...new Set(dados.ts.map((t) => t.categoria))].sort()
  const saldo = somar(filtradas, 'receita') - somar(filtradas, 'despesa')

  return (
    <div className="pagina pagina-estreita">
      <header className="pagina-topo">
        <h1 className="titulo-pagina">Extrato</h1>
        <div className="topo-direita">
          <SeletorMes mes={mes} ano={ano} mover={mover} />
          <ExportarExtrato contas={dados.contas} mes={mes} ano={ano} />
        </div>
      </header>

      <div className="filtros">
        <div className="segmentado" role="radiogroup" aria-label="Tipo">
          {(['todas', 'despesa', 'receita'] as const).map((t) => (
            <button key={t} role="radio" aria-checked={tipo === t} className={tipo === t ? 'ativo' : ''} onClick={() => setTipo(t)}>
              {t === 'todas' ? 'Todas' : t === 'despesa' ? 'Saídas' : 'Entradas'}
            </button>
          ))}
        </div>
        <label className="busca">
          <Search size={16} aria-hidden="true" />
          <input type="search" placeholder="Buscar" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar no extrato" />
        </label>
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Categoria">
          <option value="">Todas as categorias</option>
          {categorias.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div className="resumo-linha">
        <span>{filtradas.length} {filtradas.length === 1 ? 'movimentação' : 'movimentações'}</span>
        <span>Resultado <b className={saldo >= 0 ? 'receita' : ''}>{dinheiro(saldo)}</b></span>
      </div>

      {filtradas.length ? (
        <div className="painel">
          <ListaTransacoes itens={filtradas} contas={dados.contas} onExcluir={async (t) => {
            await api.excluirTransacao(t.id); avisar('Transação excluída.'); recarregar()
          }} />
        </div>
      ) : (
        <Vazio ilustracao={<Moedas />} titulo="Nada por aqui" texto={dados.ts.length ? 'Nenhuma movimentação com esses filtros.' : 'Registre uma transação ou conecte seu banco na tela Contas.'} />
      )}

      <button className="fab" onClick={() => setNova(true)} aria-label="Nova transação"><Plus size={26} /></button>
      <NovaTransacao aberto={nova} onFechar={() => setNova(false)} onSalvo={recarregar} contas={dados.contas} />
    </div>
  )
}
