// Ilustrações originais em SVG, no espírito flat das referências (mostarda, azul-marinho, pêssego).
import { useId } from 'react'

const C = { ink: '#1F1D1A', mostarda: '#F5B400', mostardaEscuro: '#D99A00', navy: '#24408E', pele: '#F2C59B', cabelo: '#4A3226', sombra: '#E8DCC6' }

/** Cofrinho que enche de líquido conforme `nivel` (0–1). Acima de 0.9 o líquido fica mostarda-escuro. */
export function Cofrinho({ nivel, tamanho = 180 }: { nivel: number; tamanho?: number }) {
  const uid = useId().replace(/:/g, '')
  const n = Math.max(0, Math.min(1, nivel))
  // corpo ocupa y 30..130 → altura 100
  const topo = 130 - n * 100
  const cor = n >= 0.9 ? C.mostardaEscuro : C.mostarda
  return (
    <svg width={tamanho} height={tamanho * 0.8} viewBox="0 0 200 160" role="img" aria-label={`Cofrinho ${Math.round(n * 100)}% cheio`}>
      <defs>
        <clipPath id={`corpo-${uid}`}>
          <ellipse cx="95" cy="80" rx="70" ry="50" />
          <ellipse cx="30" cy="84" rx="16" ry="14" />
        </clipPath>
      </defs>
      <ellipse cx="98" cy="150" rx="70" ry="6" fill={C.sombra} />
      {/* pernas */}
      <rect x="50" y="112" width="20" height="32" rx="8" fill={C.mostarda} stroke={C.ink} strokeWidth="3" />
      <rect x="118" y="112" width="20" height="32" rx="8" fill={C.mostarda} stroke={C.ink} strokeWidth="3" />
      {/* corpo vazio */}
      <ellipse cx="95" cy="80" rx="70" ry="50" fill="#FFFDF7" />
      <ellipse cx="30" cy="84" rx="16" ry="14" fill="#FFFDF7" />
      {/* líquido */}
      <g clipPath={`url(#corpo-${uid})`}>
        <path className="liquido" d={`M0 ${topo} Q 50 ${topo - 6} 100 ${topo} T 200 ${topo} V 170 H 0 Z`} fill={cor} />
        <path d={`M0 ${topo} Q 50 ${topo - 6} 100 ${topo} T 200 ${topo}`} fill="none" stroke="#FFE07A" strokeWidth="3" opacity=".8" />
      </g>
      {/* contornos */}
      <ellipse cx="95" cy="80" rx="70" ry="50" fill="none" stroke={C.ink} strokeWidth="3.5" />
      <ellipse cx="30" cy="84" rx="16" ry="14" fill="none" stroke={C.ink} strokeWidth="3.5" />
      <circle cx="25" cy="82" r="2.6" fill={C.ink} />
      <circle cx="34" cy="82" r="2.6" fill={C.ink} />
      <path d="M58 38 L70 14 L82 34" fill="#FFFDF7" stroke={C.ink} strokeWidth="3.5" strokeLinejoin="round" />
      <circle cx="62" cy="62" r="4" fill={C.ink} />
      <rect x="82" y="30" width="30" height="6" rx="3" fill={C.ink} />
      <path d="M165 76 q 14 -4 10 -14 q -4 -8 -10 0" fill="none" stroke={C.ink} strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

/** Pessoa carregando uma moeda grande — tela de boas-vindas. */
export function PessoaMoeda({ tamanho = 200 }: { tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho * 1.2} viewBox="0 0 200 240" aria-hidden="true">
      <ellipse cx="100" cy="228" rx="64" ry="7" fill={C.sombra} />
      {/* pernas */}
      <path d="M86 168 L74 214" stroke={C.pele} strokeWidth="14" strokeLinecap="round" />
      <path d="M112 168 L128 212" stroke={C.pele} strokeWidth="14" strokeLinecap="round" />
      <path d="M62 218 q 10 -10 22 -2 l -2 6 h -22 z" fill={C.navy} />
      <path d="M120 216 q 12 -10 24 0 l -2 6 h -22 z" fill={C.navy} />
      {/* saia/corpo */}
      <path d="M72 120 h 58 l 10 56 h -78 z" fill={C.navy} />
      <path d="M78 74 q 22 -10 46 0 l 6 48 h -58 z" fill={C.navy} />
      {/* cabeça */}
      <path d="M98 70 v -10" stroke={C.pele} strokeWidth="12" />
      <circle cx="100" cy="42" r="20" fill={C.pele} />
      <path d="M80 44 q -2 -28 24 -26 q 22 4 16 22 q -10 -10 -22 -8 q -6 20 -18 34 q -6 -10 0 -22z" fill={C.cabelo} />
      {/* moeda */}
      <circle cx="96" cy="120" r="40" fill={C.mostarda} stroke={C.mostardaEscuro} strokeWidth="5" />
      <circle cx="96" cy="120" r="29" fill="none" stroke={C.mostardaEscuro} strokeWidth="2.5" opacity=".7" />
      <text x="96" y="134" textAnchor="middle" fontFamily="DM Serif Display, Georgia, serif" fontSize="40" fill={C.mostardaEscuro}>$</text>
      {/* braços abraçando a moeda */}
      <path d="M70 96 q -16 24 6 46" stroke={C.pele} strokeWidth="11" fill="none" strokeLinecap="round" />
      <path d="M128 92 q 18 26 -4 50" stroke={C.pele} strokeWidth="11" fill="none" strokeLinecap="round" />
    </svg>
  )
}

/** Mão que acena (ok) ou mostra polegar para baixo (erro de login). */
export function Mao({ erro = false }: { erro?: boolean }) {
  return (
    <svg className={`mao ${erro ? 'mao-erro' : ''}`} width="150" height="130" viewBox="0 0 150 130" aria-hidden="true">
      <path d="M150 70 L92 64 Q 80 63 76 72" stroke={C.pele} strokeWidth="26" fill="none" strokeLinecap="round" />
      {erro ? (
        <g fill={C.pele}>
          <rect x="34" y="50" width="54" height="40" rx="14" />
          <rect x="44" y="84" width="16" height="40" rx="8" />
          <rect x="30" y="44" width="40" height="12" rx="6" />
          <rect x="30" y="58" width="40" height="12" rx="6" />
          <rect x="30" y="72" width="38" height="12" rx="6" />
        </g>
      ) : (
        <g fill={C.pele}>
          <rect x="40" y="50" width="50" height="40" rx="16" />
          <rect x="40" y="12" width="11" height="46" rx="5.5" transform="rotate(-14 45 35)" />
          <rect x="54" y="6" width="11" height="48" rx="5.5" transform="rotate(-4 59 30)" />
          <rect x="68" y="8" width="11" height="46" rx="5.5" transform="rotate(6 73 31)" />
          <rect x="80" y="18" width="10" height="40" rx="5" transform="rotate(16 85 38)" />
          <rect x="22" y="62" width="30" height="11" rx="5.5" transform="rotate(30 37 67)" />
        </g>
      )}
    </svg>
  )
}

/** Pilha de moedas — usada nos estados vazios. */
export function Moedas({ tamanho = 96 }: { tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho * 0.75} viewBox="0 0 120 90" aria-hidden="true">
      <ellipse cx="60" cy="84" rx="44" ry="5" fill={C.sombra} />
      {[66, 54, 42, 30].map((y, i) => (
        <g key={y} transform={`translate(${i % 2 ? 4 : 0} 0)`}>
          <rect x="32" y={y} width="52" height="12" fill={C.mostardaEscuro} stroke={C.ink} strokeWidth="2.5" />
          <ellipse cx="58" cy={y} rx="26" ry="7" fill={C.mostarda} stroke={C.ink} strokeWidth="2.5" />
        </g>
      ))}
    </svg>
  )
}
