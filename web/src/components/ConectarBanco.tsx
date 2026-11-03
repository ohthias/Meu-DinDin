import { lazy, Suspense, useState } from 'react'
import { Link2, ShieldCheck } from 'lucide-react'
import { api, sandbox } from '../lib/api'
import { Modal, useToast } from './ui'

// O widget da Pluggy só é baixado quando a pessoa decide conectar um banco.
const PluggyConnect = lazy(() => import('react-pluggy-connect').then((m) => ({ default: m.PluggyConnect })))

/**
 * Botão "Conectar banco" — abre o fluxo de consentimento do Open Finance.
 * Com `itemId`, reabre uma conexão existente para atualizar credenciais.
 */
export function ConectarBanco({ itemId, rotulo = 'Conectar banco', variante = 'primario', onConcluido }: {
  itemId?: string; rotulo?: string; variante?: 'primario' | 'secundario'; onConcluido?: () => void
}) {
  const avisar = useToast()
  const [explicacao, setExplicacao] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [abrindo, setAbrindo] = useState(false)

  async function sincronizar(id: string) {
    const fechar = avisar('Atualizando informações das contas…', 'carregando')
    try {
      const r = await api.ofSincronizar(id)
      fechar()
      avisar(r.status === 'UPDATED' ? `Pronto: ${r.contas} contas e ${r.transacoes} transações importadas.` : 'Conexão recebida. Os dados chegam em alguns minutos.')
      onConcluido?.()
    } catch (e) {
      fechar()
      avisar(e instanceof Error ? e.message : 'Não foi possível sincronizar.', 'erro')
    }
  }

  async function continuar() {
    setExplicacao(false)
    if (api.demo) return sincronizar('demo-item')
    setAbrindo(true)
    try {
      setToken(await api.ofConnectToken(itemId))
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Não foi possível iniciar a conexão.', 'erro')
    } finally {
      setAbrindo(false)
    }
  }

  return (
    <>
      <button className={`btn ${variante === 'primario' ? 'btn-primario' : 'btn-secundario'}`} disabled={abrindo}
        onClick={() => (itemId ? continuar() : setExplicacao(true))}>
        <Link2 size={18} aria-hidden="true" /> {abrindo ? 'Abrindo…' : rotulo}
      </button>

      <Modal titulo="Conectar seu banco" aberto={explicacao} onFechar={() => setExplicacao(false)} estreito>
        <div className="of-explica">
          <ShieldCheck size={40} className="of-escudo" aria-hidden="true" />
          <p>Você escolhe seu banco, faz login no ambiente dele e autoriza o compartilhamento de <strong>saldos e extratos</strong>. O Meu DinDin não vê nem guarda sua senha.</p>
          <ul>
            <li>Só leitura: ninguém movimenta dinheiro por aqui.</li>
            <li>Você pode desconectar a qualquer momento na tela Contas.</li>
            <li>Regulado pelo Banco Central (Open Finance Brasil).</li>
          </ul>
          {api.demo && <p className="sutil">No modo demonstração, um banco fictício é conectado.</p>}
          <button className="btn btn-primario btn-largo" onClick={continuar}>Escolher meu banco</button>
        </div>
      </Modal>

      {token && (
        <Suspense fallback={null}>
          <PluggyConnect
            connectToken={token}
            includeSandbox={sandbox}
            updateItem={itemId}
            language="pt"
            onSuccess={({ item }) => { setToken(null); sincronizar(item.id) }}
            onError={(e) => { avisar(e.message ?? 'Erro ao conectar com o banco.', 'erro') }}
            onClose={() => setToken(null)}
          />
        </Suspense>
      )}
    </>
  )
}
