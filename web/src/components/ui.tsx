import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { MESES } from '../lib/format'

// ── Toasts ─────────────────────────────────────────────────────────────────
type Toast = { id: number; texto: string; tipo: 'ok' | 'erro' | 'carregando' }
const ToastCtx = createContext<{ avisar: (texto: string, tipo?: Toast['tipo']) => () => void }>({ avisar: () => () => {} })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const avisar = useCallback((texto: string, tipo: Toast['tipo'] = 'ok') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, texto, tipo }])
    const fechar = () => setToasts((t) => t.filter((x) => x.id !== id))
    if (tipo !== 'carregando') setTimeout(fechar, 3800)
    return fechar
  }, [])
  return (
    <ToastCtx.Provider value={{ avisar }}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tipo}`}>
            <span>{t.texto}</span>
            {t.tipo === 'carregando' && <span className="spinner" aria-hidden="true" />}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
export const useToast = () => useContext(ToastCtx).avisar

// ── Modal ──────────────────────────────────────────────────────────────────
export function Modal({ titulo, aberto, onFechar, children, estreito }: {
  titulo: string; aberto: boolean; onFechar: () => void; children: ReactNode; estreito?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (aberto && !d.open) d.showModal()
    if (!aberto && d.open) d.close()
  }, [aberto])
  return (
    <dialog ref={ref} className={`modal ${estreito ? 'modal-estreito' : ''}`} onClose={onFechar}
      onClick={(e) => { if (e.target === ref.current) onFechar() }} aria-labelledby="modal-titulo">
      {aberto && (
        <div className="modal-corpo">
          <header className="modal-topo">
            <h2 id="modal-titulo">{titulo}</h2>
            <button className="icone-btn" onClick={onFechar} aria-label="Fechar"><X size={20} /></button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  )
}

// ── Campo de formulário ────────────────────────────────────────────────────
export function Campo({ rotulo, erro, children, dica }: { rotulo: string; erro?: string | null; dica?: string; children: ReactNode }) {
  return (
    <label className={`campo ${erro ? 'campo-erro' : ''}`}>
      <span className="campo-rotulo">{rotulo}</span>
      {children}
      {erro ? <span className="campo-msg erro" role="alert">{erro}</span> : dica ? <span className="campo-msg">{dica}</span> : null}
    </label>
  )
}

// ── Seletor de mês ("MAIO ⌄" das referências) ───────────────────────────────
export function SeletorMes({ mes, ano, mover }: { mes: number; ano: number; mover: (d: number) => void }) {
  const atual = new Date()
  const ehAtual = mes === atual.getMonth() + 1 && ano === atual.getFullYear()
  return (
    <div className="seletor-mes" role="group" aria-label="Mês">
      <button className="icone-btn" onClick={() => mover(-1)} aria-label="Mês anterior">‹</button>
      <span>{MESES[mes - 1]}{ano !== atual.getFullYear() ? ` ${ano}` : ''}</span>
      <button className="icone-btn" onClick={() => mover(1)} disabled={ehAtual} aria-label="Próximo mês">›</button>
    </div>
  )
}

export function Barra({ valor, total, cor }: { valor: number; total: number; cor?: string }) {
  const p = total > 0 ? Math.min(100, (valor / total) * 100) : 0
  return (
    <div className="barra" role="progressbar" aria-valuenow={Math.round(p)} aria-valuemin={0} aria-valuemax={100}>
      <div style={{ width: `${p}%`, background: cor }} />
    </div>
  )
}

export function Vazio({ ilustracao, titulo, texto, acao }: { ilustracao?: ReactNode; titulo: string; texto: string; acao?: ReactNode }) {
  return (
    <div className="vazio">
      {ilustracao}
      <h3>{titulo}</h3>
      <p>{texto}</p>
      {acao}
    </div>
  )
}

export function Carregando() {
  return <div className="carregando" aria-label="Carregando"><span className="spinner" /></div>
}
