// Motor de análise do Meu DinDin, compilado para WebAssembly com AssemblyScript.
// Roda no navegador: os dados financeiros não saem do aparelho para estas contas.
// Build: `npm run wasm` (gera src/wasm/motor.wasm e os bindings em src/wasm/motor.js)

// ── Previsão: suavização exponencial de Holt (nível + tendência) ───────────
// Escolhe alpha e beta por busca em grade, minimizando o erro quadrático um passo à frente.
// Retorno: [alpha, beta, desvioDoErro, previsao_1, ..., previsao_h]
export function holt(serie: Float64Array, horizonte: i32): Float64Array {
  const n = serie.length
  const saida = new Float64Array(3 + horizonte)
  if (n == 0) return saida
  if (n < 3) {
    let soma = 0.0
    for (let i = 0; i < n; i++) soma += serie[i]
    const media = soma / <f64>n
    for (let h = 0; h < horizonte; h++) saida[3 + h] = media
    return saida
  }

  let melhorSSE = Infinity
  let melhorA = 0.5
  let melhorB = 0.1
  for (let ia = 1; ia <= 19; ia++) {
    const a = <f64>ia * 0.05
    for (let ib = 1; ib <= 19; ib++) {
      const b = <f64>ib * 0.05
      let nivel = serie[0]
      let tend = serie[1] - serie[0]
      let sse = 0.0
      for (let t = 1; t < n; t++) {
        const prev = nivel + tend
        const erro = serie[t] - prev
        sse += erro * erro
        const novoNivel = a * serie[t] + (1.0 - a) * (nivel + tend)
        tend = b * (novoNivel - nivel) + (1.0 - b) * tend
        nivel = novoNivel
      }
      if (sse < melhorSSE) { melhorSSE = sse; melhorA = a; melhorB = b }
    }
  }

  let nivel = serie[0]
  let tend = serie[1] - serie[0]
  for (let t = 1; t < n; t++) {
    const novoNivel = melhorA * serie[t] + (1.0 - melhorA) * (nivel + tend)
    tend = melhorB * (novoNivel - nivel) + (1.0 - melhorB) * tend
    nivel = novoNivel
  }
  saida[0] = melhorA
  saida[1] = melhorB
  saida[2] = Math.sqrt(melhorSSE / <f64>(n - 1))
  for (let h = 0; h < horizonte; h++) {
    // gasto não fica negativo
    saida[3 + h] = Math.max(0.0, nivel + <f64>(h + 1) * tend)
  }
  return saida
}

// ── Estatística robusta ────────────────────────────────────────────────────
function mediana(v: Float64Array): f64 {
  const n = v.length
  if (n == 0) return 0.0
  const c = v.slice(0)
  c.sort()
  return n % 2 == 1 ? c[n >> 1] : (c[(n >> 1) - 1] + c[n >> 1]) / 2.0
}

/**
 * Z-score robusto por grupo (categoria): 0,6745 · (x − mediana) / MAD.
 * Grupos com menos de 4 valores recebem z = 0 (pouco histórico para julgar).
 */
export function zRobusto(valores: Float64Array, grupos: Int32Array, nGrupos: i32): Float64Array {
  const n = valores.length
  const z = new Float64Array(n)
  for (let g = 0; g < nGrupos; g++) {
    let qtd = 0
    for (let i = 0; i < n; i++) if (grupos[i] == g) qtd++
    if (qtd < 4) continue
    const doGrupo = new Float64Array(qtd)
    let k = 0
    for (let i = 0; i < n; i++) if (grupos[i] == g) doGrupo[k++] = valores[i]
    const med = mediana(doGrupo)
    const desvios = new Float64Array(qtd)
    for (let i = 0; i < qtd; i++) desvios[i] = Math.abs(doGrupo[i] - med)
    let mad = mediana(desvios)
    // se mais da metade dos valores é igual, usa 10% da mediana como escala mínima
    if (mad < 1e-9) mad = Math.max(med * 0.1, 1.0)
    for (let i = 0; i < n; i++) if (grupos[i] == g) z[i] = 0.6745 * (valores[i] - med) / mad
  }
  return z
}

/** [média, desvio padrão, mediana, percentil 90] */
export function resumo(v: Float64Array): Float64Array {
  const s = new Float64Array(4)
  const n = v.length
  if (n == 0) return s
  let soma = 0.0
  for (let i = 0; i < n; i++) soma += v[i]
  const media = soma / <f64>n
  let q = 0.0
  for (let i = 0; i < n; i++) q += (v[i] - media) * (v[i] - media)
  const c = v.slice(0)
  c.sort()
  s[0] = media
  s[1] = n > 1 ? Math.sqrt(q / <f64>(n - 1)) : 0.0
  s[2] = mediana(v)
  s[3] = c[<i32>Math.min(<f64>(n - 1), Math.floor(<f64>n * 0.9))]
  return s
}

// ── Naive Bayes multinomial para sugerir categorias ────────────────────────
// Os tokens chegam como inteiros (hash calculado no JS). O modelo fica na memória do módulo.
let nb_classes: i32 = 0
let nb_buckets: i32 = 0
let nb_contagem = new Float64Array(0) // classes × buckets
let nb_totalPorClasse = new Float64Array(0)
let nb_docsPorClasse = new Float64Array(0)
let nb_docs: f64 = 0
let nb_vocab: f64 = 1 // buckets com pelo menos uma ocorrência
const NB_ALFA: f64 = 0.1 // suavização de Lidstone

/**
 * Treina do zero. `inicioDoc[d]` aponta para o primeiro token do documento d em `tokens`;
 * o último documento vai até o fim do array. `rotulos[d]` é a classe do documento.
 */
export function nbTreinar(tokens: Int32Array, inicioDoc: Int32Array, rotulos: Int32Array, nClasses: i32, nBuckets: i32): void {
  nb_classes = nClasses
  nb_buckets = nBuckets
  nb_contagem = new Float64Array(nClasses * nBuckets)
  nb_totalPorClasse = new Float64Array(nClasses)
  nb_docsPorClasse = new Float64Array(nClasses)
  const nDocs = inicioDoc.length
  nb_docs = <f64>nDocs
  for (let d = 0; d < nDocs; d++) {
    const c = rotulos[d]
    nb_docsPorClasse[c] += 1.0
    const fim = d + 1 < nDocs ? inicioDoc[d + 1] : tokens.length
    for (let i = inicioDoc[d]; i < fim; i++) {
      const b = tokens[i] % nBuckets
      nb_contagem[c * nBuckets + b] += 1.0
      nb_totalPorClasse[c] += 1.0
    }
  }
  let v = 0
  for (let b = 0; b < nBuckets; b++) {
    let soma = 0.0
    for (let c = 0; c < nClasses; c++) soma += nb_contagem[c * nBuckets + b]
    if (soma > 0) v++
  }
  nb_vocab = <f64>max(v, 1)
}

/**
 * Probabilidade de cada classe para um documento (soma 1). Suavização de Lidstone sobre o vocabulário visto.
 * Palavras nunca vistas no treino são ignoradas, para não puxar a resposta para as classes com menos exemplos.
 * Se nenhuma palavra for conhecida, devolve tudo zero.
 */
export function nbPrever(tokens: Int32Array): Float64Array {
  const p = new Float64Array(nb_classes)
  if (nb_classes == 0) return p
  const conhecidos = new Int32Array(tokens.length)
  let nConhecidos = 0
  for (let i = 0; i < tokens.length; i++) {
    const b = tokens[i] % nb_buckets
    let soma = 0.0
    for (let c = 0; c < nb_classes; c++) soma += nb_contagem[c * nb_buckets + b]
    if (soma > 0) conhecidos[nConhecidos++] = b
  }
  if (nConhecidos == 0) return p
  let maior = -Infinity
  for (let c = 0; c < nb_classes; c++) {
    let lp = Math.log((nb_docsPorClasse[c] + 1.0) / (nb_docs + <f64>nb_classes))
    const denom = nb_totalPorClasse[c] + NB_ALFA * nb_vocab
    for (let i = 0; i < nConhecidos; i++) {
      lp += Math.log((nb_contagem[c * nb_buckets + conhecidos[i]] + NB_ALFA) / denom)
    }
    p[c] = lp
    if (lp > maior) maior = lp
  }
  let soma = 0.0
  for (let c = 0; c < nb_classes; c++) { p[c] = Math.exp(p[c] - maior); soma += p[c] }
  for (let c = 0; c < nb_classes; c++) p[c] /= soma
  return p
}
