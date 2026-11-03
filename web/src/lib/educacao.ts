// Conteúdo dos módulos de educação financeira.
// O número de questões de cada módulo precisa bater com `modulos_educacao.total_questoes`
// (supabase/migrations/20261103020000_educacao_loja_conquistas.sql).

export type Bloco =
  | { tipo: 'texto'; titulo?: string; texto: string }
  | { tipo: 'exemplo'; titulo?: string; texto: string }
  | { tipo: 'dica'; texto: string }
  | { tipo: 'alerta'; texto: string }
  | { tipo: 'lista'; titulo?: string; itens: string[] }
  | { tipo: 'simulador'; simulador: 'regra-503020' | 'reserva' | 'juros' | 'inflacao' | 'divida' }

export interface Questao {
  q: string
  opts: string[]
  /** índice da opção correta em `opts` */
  c: number
  /** explicação mostrada depois da resposta */
  f: string
}

export interface Modulo {
  id: string
  titulo: string
  resumo: string
  nivel: 'Básico' | 'Intermediário'
  minutos: number
  emoji: string
  /** recompensa da primeira aprovação (a fonte da verdade é a tabela modulos_educacao) */
  xp: number
  moedas: number
  licao: Bloco[][] // cada item é uma "página" da lição
  questoes: Questao[]
}

export const APROVACAO = 0.7

export const MODULOS: Modulo[] = [
  // ────────────────────────────────────────────────────────────────────────
  {
    id: 'orcamento',
    titulo: 'Orçamento pessoal',
    resumo: 'Saber para onde o dinheiro vai é o primeiro passo para decidir para onde ele deve ir.',
    nivel: 'Básico',
    minutos: 6,
    emoji: '🧾',
    xp: 60,
    moedas: 15,
    licao: [
      [
        { tipo: 'texto', titulo: 'O que é um orçamento', texto: 'Orçamento é um plano: quanto entra no mês, quanto vai sair e para onde. Ele não serve para proibir gastos, e sim para que você escolha conscientemente onde colocar cada real.' },
        { tipo: 'lista', titulo: 'Três passos para começar', itens: [
          'Anote tudo que entrou e saiu no último mês, inclusive os gastos pequenos.',
          'Separe em gastos fixos (aluguel, transporte, assinaturas) e variáveis (lazer, delivery, roupas).',
          'Defina um limite por categoria para o próximo mês e acompanhe.',
        ] },
        { tipo: 'dica', texto: 'Conectar seu banco pelo Open Finance faz o passo 1 sozinho: o extrato entra direto no app.' },
      ],
      [
        { tipo: 'texto', titulo: 'A regra 50/30/20', texto: 'Uma forma simples de dividir a renda: 50% para necessidades (moradia, comida, transporte, contas), 30% para desejos (lazer, compras, streaming) e 20% para o futuro (reserva, investimentos, quitar dívidas).' },
        { tipo: 'simulador', simulador: 'regra-503020' },
        { tipo: 'dica', texto: 'É um ponto de partida, não uma lei. Quem mora com a família pode guardar mais; quem paga aluguel sozinho talvez precise ajustar as proporções.' },
      ],
      [
        { tipo: 'texto', titulo: 'Os gastos invisíveis', texto: 'Cafés, corridas de aplicativo, taxas de entrega e assinaturas esquecidas parecem pequenos sozinhos, mas somados podem virar uma das maiores categorias do mês.' },
        { tipo: 'exemplo', texto: 'R$ 12 de delivery quatro vezes por semana são cerca de R$ 200 por mês, ou R$ 2.400 por ano.' },
        { tipo: 'lista', titulo: 'Contra compras por impulso', itens: [
          'Espere 24 horas antes de comprar algo que não estava planejado.',
          'Pergunte quantas horas de trabalho aquilo custa.',
          'Revise as assinaturas a cada três meses e cancele as que não usa.',
        ] },
      ],
    ],
    questoes: [
      { q: 'Na regra 50/30/20, o que significam os 20%?', opts: ['Lazer e compras', 'Moradia e contas fixas', 'Futuro: reserva, investimentos ou quitar dívidas', 'Impostos'], c: 2, f: 'Os 20% vão para o seu "eu do futuro": reserva de emergência, investimentos ou pagamento de dívidas.' },
      { q: 'Qual é o primeiro passo para organizar as finanças?', opts: ['Investir na bolsa', 'Saber exatamente quanto entra e quanto sai', 'Cortar todo o lazer', 'Pedir aumento do limite do cartão'], c: 1, f: 'Sem saber para onde o dinheiro vai, não dá para decidir o que mudar. Registrar vem antes de cortar ou investir.' },
      { q: 'Qual destes é um gasto fixo?', opts: ['Ingresso de show', 'Aluguel', 'Roupa nova', 'Jantar fora'], c: 1, f: 'Gastos fixos se repetem todo mês com valor parecido, como aluguel, transporte e assinaturas.' },
      { q: 'Com renda de R$ 2.000, quanto a regra 50/30/20 sugere guardar?', opts: ['R$ 200', 'R$ 400', 'R$ 600', 'R$ 1.000'], c: 1, f: '20% de R$ 2.000 são R$ 400.' },
      { q: 'O que fazer para evitar compras por impulso?', opts: ['Comprar no crédito para pagar depois', 'Esperar 24 horas antes de compras não planejadas', 'Só comprar em promoção', 'Ignorar o preço e focar na qualidade'], c: 1, f: 'Um intervalo entre a vontade e a compra ajuda a separar desejo passageiro de necessidade real.' },
      { q: 'Um café de R$ 8 em todos os dias úteis custa, em um ano, aproximadamente:', opts: ['R$ 200', 'R$ 800', 'R$ 2.000', 'R$ 8.000'], c: 2, f: 'São cerca de 22 dias úteis por mês: 8 × 22 × 12 ≈ R$ 2.100. Pequenos gastos repetidos pesam.' },
    ],
  },
  // ────────────────────────────────────────────────────────────────────────
  {
    id: 'reserva',
    titulo: 'Reserva de emergência',
    resumo: 'O dinheiro que transforma um imprevisto em um incômodo, e não em uma dívida.',
    nivel: 'Básico',
    minutos: 5,
    emoji: '🛟',
    xp: 60,
    moedas: 15,
    licao: [
      [
        { tipo: 'texto', titulo: 'Para que serve', texto: 'Reserva de emergência é um dinheiro guardado só para imprevistos: perder o emprego ou o estágio, um problema de saúde, o celular que quebrou. Sem ela, a saída costuma ser o cartão ou um empréstimo, com juros altos.' },
        { tipo: 'texto', titulo: 'Quanto guardar', texto: 'A referência mais comum é de 3 a 6 meses dos seus gastos essenciais. Quem tem renda instável (freelance, autônomo) deve mirar no topo dessa faixa.' },
        { tipo: 'simulador', simulador: 'reserva' },
      ],
      [
        { tipo: 'texto', titulo: 'Onde deixar', texto: 'A reserva precisa de três coisas: segurança, liquidez (sacar no mesmo dia ou no dia seguinte) e render pelo menos perto da inflação.' },
        { tipo: 'lista', titulo: 'Boas opções', itens: [
          'Tesouro Selic: título público, baixo risco e resgate em até um dia útil.',
          'CDB com liquidez diária que pague perto de 100% do CDI, de banco coberto pelo FGC.',
          'Contas digitais que rendem 100% do CDI, também cobertas pelo FGC.',
        ] },
        { tipo: 'alerta', texto: 'Ações, criptomoedas e fundos de renda variável não servem para reserva: podem estar em queda justo quando você precisar sacar.' },
      ],
      [
        { tipo: 'texto', titulo: 'Como montar sem sofrer', texto: 'Comece com uma meta pequena, como um mês de gastos. Transfira um valor fixo assim que receber, antes de gastar com qualquer outra coisa ("pague-se primeiro"). Quando usar a reserva, a prioridade passa a ser repor.' },
        { tipo: 'dica', texto: 'Crie uma meta "Reserva de emergência" na tela Metas para acompanhar o progresso.' },
      ],
    ],
    questoes: [
      { q: 'Qual a referência mais usada para o tamanho da reserva?', opts: ['1 mês de gastos', '3 a 6 meses de gastos essenciais', '2 anos de salário', 'Qualquer valor serve'], c: 1, f: 'De 3 a 6 meses dos gastos essenciais. Quem tem renda instável deve mirar mais perto de 6.' },
      { q: 'Qual destes é adequado para a reserva?', opts: ['Ações de uma empresa', 'Criptomoedas', 'Tesouro Selic', 'Fundo imobiliário'], c: 2, f: 'O Tesouro Selic tem baixo risco e liquidez diária. Os outros podem cair justamente quando você precisar.' },
      { q: 'O que significa "liquidez"?', opts: ['Quanto o investimento rende', 'A facilidade de transformar o investimento em dinheiro disponível', 'O imposto cobrado', 'O valor mínimo para investir'], c: 1, f: 'Liquidez é a rapidez para sacar sem perder valor. Para reserva, quanto mais alta, melhor.' },
      { q: 'Gastos essenciais de R$ 1.500 por mês. Qual seria uma reserva de 4 meses?', opts: ['R$ 1.500', 'R$ 4.000', 'R$ 6.000', 'R$ 15.000'], c: 2, f: '4 × R$ 1.500 = R$ 6.000.' },
      { q: 'O que é "pagar-se primeiro"?', opts: ['Comprar algo para si antes das contas', 'Separar o valor a guardar logo que o dinheiro entra', 'Pagar o cartão antes do aluguel', 'Receber o salário adiantado'], c: 1, f: 'Guardar no início do mês evita que o valor seja consumido por gastos que vão aparecendo.' },
      { q: 'Você usou parte da reserva num imprevisto. E agora?', opts: ['Esquecer, ela já cumpriu o papel', 'Repor a reserva antes de novos objetivos', 'Investir o restante em ações', 'Pegar um empréstimo para completar'], c: 1, f: 'Repor a reserva vira a prioridade, para estar protegido no próximo imprevisto.' },
    ],
  },
  // ────────────────────────────────────────────────────────────────────────
  {
    id: 'juros-compostos',
    titulo: 'Juros compostos',
    resumo: 'Por que começar cedo, mesmo com pouco, faz tanta diferença.',
    nivel: 'Básico',
    minutos: 6,
    emoji: '📈',
    xp: 70,
    moedas: 20,
    licao: [
      [
        { tipo: 'texto', titulo: 'Juros sobre juros', texto: 'Nos juros simples, o rendimento é calculado sempre sobre o valor inicial. Nos compostos, o rendimento de cada mês passa a render também no mês seguinte. No começo a diferença é pequena; com o tempo, vira uma bola de neve.' },
        { tipo: 'exemplo', titulo: 'R$ 1.000 a 1% ao mês', texto: 'Juros simples: R$ 10 todo mês, R$ 1.120 depois de um ano. Juros compostos: R$ 1.126,83 depois de um ano, e R$ 3.300 depois de dez anos, contra R$ 2.200 nos simples.' },
      ],
      [
        { tipo: 'texto', titulo: 'Experimente', texto: 'Mude os valores e veja quanto do resultado final vem do que você colocou e quanto vem dos juros.' },
        { tipo: 'simulador', simulador: 'juros' },
        { tipo: 'dica', texto: 'O tempo pesa mais que o valor: começar aos 20 com pouco costuma render mais do que começar aos 30 com o dobro.' },
      ],
      [
        { tipo: 'texto', titulo: 'O outro lado', texto: 'Os juros compostos também funcionam contra você. Uma dívida no rotativo do cartão ou no cheque especial cresce do mesmo jeito, só que com taxas muito maiores do que qualquer investimento paga.' },
        { tipo: 'alerta', texto: 'Por isso quitar dívidas caras costuma ser o melhor "investimento" disponível.' },
      ],
    ],
    questoes: [
      { q: 'O que caracteriza os juros compostos?', opts: ['Rendimento sempre sobre o valor inicial', 'Rendimento sobre o valor inicial mais os juros já acumulados', 'Juros que só existem em empréstimos', 'Uma taxa fixa definida pelo governo'], c: 1, f: 'Nos juros compostos, os juros de cada período se somam ao saldo e passam a render também.' },
      { q: 'O que mais aumenta o efeito dos juros compostos?', opts: ['Tempo', 'Sacar o rendimento todo mês', 'Investir só uma vez por ano', 'Trocar de banco com frequência'], c: 0, f: 'Quanto mais tempo o dinheiro fica investido, mais os juros sobre juros se acumulam.' },
      { q: 'R$ 100 rendendo 10% ao ano por 2 anos, em juros compostos, viram:', opts: ['R$ 110', 'R$ 120', 'R$ 121', 'R$ 200'], c: 2, f: 'Ano 1: 100 × 1,1 = 110. Ano 2: 110 × 1,1 = 121.' },
      { q: 'Duas pessoas investem R$ 200 por mês na mesma taxa. Ana começa aos 20 e Bia aos 30. Aos 50:', opts: ['As duas têm o mesmo valor', 'Ana tem bem mais, mesmo tendo colocado só 50% a mais', 'Bia tem mais, porque começou com mais experiência', 'Depende só da sorte'], c: 1, f: 'Ana investiu por 30 anos e Bia por 20. Os 10 anos a mais de juros sobre juros fazem a diferença crescer muito além dos 50% a mais de aportes.' },
      { q: 'Por que dívidas no rotativo crescem tão rápido?', opts: ['Porque os juros compostos agem com taxas muito altas', 'Porque o banco cobra multa todo dia', 'Porque o valor é corrigido pelo dólar', 'Não crescem rápido'], c: 0, f: 'É o mesmo mecanismo dos investimentos, mas com taxas muito maiores e a seu desfavor.' },
      { q: 'Retirar todo mês o rendimento de um investimento:', opts: ['Acelera os juros compostos', 'Impede os juros compostos de agir', 'Não muda nada', 'É obrigatório'], c: 1, f: 'Se o rendimento é sacado, ele não fica para render no mês seguinte; o efeito vira o de juros simples.' },
    ],
  },
  // ────────────────────────────────────────────────────────────────────────
  {
    id: 'primeiro-emprego',
    titulo: 'Primeiro emprego e estágio',
    resumo: 'Entenda o holerite, o que é descontado e quais direitos entram no seu planejamento.',
    nivel: 'Básico',
    minutos: 7,
    emoji: '💼',
    xp: 70,
    moedas: 20,
    licao: [
      [
        { tipo: 'texto', titulo: 'Salário bruto e líquido', texto: 'O valor da proposta normalmente é o salário bruto. O que cai na conta é o líquido: o bruto menos os descontos, como INSS, Imposto de Renda (a partir de certa faixa), vale-transporte e plano de saúde, quando há coparticipação.' },
        { tipo: 'texto', titulo: 'INSS', texto: 'Na carteira assinada (CLT), o INSS é descontado com alíquotas progressivas, de 7,5% a 14% conforme a faixa salarial. Ele garante aposentadoria, auxílio-doença e outros benefícios.' },
        { tipo: 'dica', texto: 'Planeje seu orçamento com o salário líquido, nunca com o bruto.' },
      ],
      [
        { tipo: 'texto', titulo: 'Direitos de quem é CLT', texto: 'Além do salário, a CLT garante valores que vale incluir no planejamento do ano.' },
        { tipo: 'lista', itens: [
          '13º salário: um salário extra por ano, normalmente pago em duas parcelas no fim do ano.',
          'Férias remuneradas de 30 dias com um terço a mais do salário.',
          'FGTS: a empresa deposita 8% do salário por mês em uma conta em seu nome. Não sai do seu salário.',
        ] },
        { tipo: 'dica', texto: 'O 13º é uma boa chance de engordar a reserva ou quitar uma dívida, em vez de virar só compras de fim de ano.' },
      ],
      [
        { tipo: 'texto', titulo: 'Estágio é diferente', texto: 'O estágio segue a Lei do Estágio, não a CLT. O estagiário recebe bolsa e, em geral, auxílio-transporte, mas não tem direito obrigatório a 13º nem a FGTS.' },
        { tipo: 'lista', itens: [
          'Recesso remunerado de 30 dias a cada 12 meses de estágio (proporcional se for menos tempo).',
          'Jornada limitada, em geral até 6 horas por dia para estudantes de ensino superior.',
          'O contrato tem prazo: planeje-se para o fim do estágio.',
        ] },
      ],
    ],
    questoes: [
      { q: 'Qual valor usar para montar o orçamento?', opts: ['Salário bruto', 'Salário líquido', 'Bruto mais o FGTS', 'O valor da proposta'], c: 1, f: 'O líquido é o que realmente cai na conta e está disponível para gastar.' },
      { q: 'Quem paga o FGTS de um trabalhador CLT?', opts: ['O trabalhador, descontado do salário', 'A empresa, além do salário', 'O governo', 'Metade cada um'], c: 1, f: 'O FGTS é depositado pela empresa (8% do salário) e não é descontado do seu pagamento.' },
      { q: 'As férias de quem é CLT são pagas com:', opts: ['Metade do salário', 'O salário normal', 'O salário mais um terço', 'Dois salários'], c: 2, f: 'O pagamento das férias inclui o adicional de um terço do salário.' },
      { q: 'Estagiários têm direito obrigatório a:', opts: ['13º salário', 'FGTS', 'Recesso remunerado', 'Multa de 40% na saída'], c: 2, f: 'A Lei do Estágio garante recesso remunerado; 13º e FGTS não são obrigatórios para estagiários.' },
      { q: 'O que o INSS garante?', opts: ['Desconto em lojas', 'Aposentadoria e benefícios como auxílio-doença', 'Um salário extra no fim do ano', 'Nada, é só um imposto'], c: 1, f: 'A contribuição ao INSS dá acesso à aposentadoria e a benefícios previdenciários.' },
      { q: 'Uma boa forma de usar o 13º salário:', opts: ['Gastar tudo nas festas', 'Reforçar a reserva ou quitar dívidas caras', 'Deixar parado na conta corrente', 'Comprar algo parcelado em 12 vezes'], c: 1, f: 'Uma renda extra previsível é ótima para objetivos que exigem um valor maior de uma vez.' },
    ],
  },
  // ────────────────────────────────────────────────────────────────────────
  {
    id: 'investimentos',
    titulo: 'Primeiros investimentos',
    resumo: 'Renda fixa, renda variável, CDI e FGC: o vocabulário para começar com segurança.',
    nivel: 'Intermediário',
    minutos: 7,
    emoji: '🌱',
    xp: 80,
    moedas: 20,
    licao: [
      [
        { tipo: 'texto', titulo: 'Antes de investir', texto: 'A ordem que costuma funcionar: quitar dívidas caras, montar a reserva de emergência e só então investir para objetivos de médio e longo prazo.' },
        { tipo: 'texto', titulo: 'Renda fixa e renda variável', texto: 'Na renda fixa, as regras de rendimento são conhecidas na hora da aplicação (por exemplo, 100% do CDI ou Selic). Na renda variável, como ações e fundos imobiliários, o valor sobe e desce com o mercado: o potencial é maior, e o risco também.' },
      ],
      [
        { tipo: 'lista', titulo: 'Siglas que você vai ver', itens: [
          'Selic: a taxa básica de juros da economia, definida pelo Banco Central.',
          'CDI: taxa usada entre bancos, que anda muito perto da Selic. É a principal referência da renda fixa.',
          'CDB: um empréstimo que você faz ao banco. Ele te devolve com juros.',
          'Tesouro Direto: títulos públicos, ou seja, um empréstimo ao governo federal.',
          'FGC: Fundo Garantidor de Créditos. Cobre até R$ 250 mil por CPF por instituição em produtos como CDB, LCI, LCA e poupança.',
        ] },
        { tipo: 'dica', texto: 'O Tesouro Direto não é coberto pelo FGC, mas tem a garantia do governo federal, considerada a de menor risco no país.' },
      ],
      [
        { tipo: 'texto', titulo: 'Diversificar', texto: 'Distribuir o dinheiro entre produtos, emissores e prazos diferentes reduz o impacto de um problema isolado.' },
        { tipo: 'alerta', texto: 'Desconfie de promessas de rendimento alto e garantido. Retorno alto sempre vem com risco alto, e "garantido" fora da renda fixa regulada é sinal de golpe.' },
      ],
    ],
    questoes: [
      { q: 'O que é CDI?', opts: ['Um tipo de conta corrente', 'Uma taxa de juros entre bancos, referência para a renda fixa', 'Um imposto sobre investimentos', 'Um fundo de ações'], c: 1, f: 'O CDI (Certificado de Depósito Interbancário) é a taxa usada entre bancos e a principal referência de rentabilidade da renda fixa.' },
      { q: 'Até quanto o FGC garante por CPF e por instituição?', opts: ['R$ 25 mil', 'R$ 100 mil', 'R$ 250 mil', 'Não existe limite'], c: 2, f: 'O FGC cobre até R$ 250 mil por CPF por instituição financeira.' },
      { q: 'Ao comprar um CDB, você está:', opts: ['Comprando ações do banco', 'Emprestando dinheiro ao banco', 'Emprestando ao governo', 'Abrindo uma poupança'], c: 1, f: 'O CDB é um título de dívida emitido pelo banco: você empresta e recebe de volta com juros.' },
      { q: 'Qual a principal diferença entre renda fixa e variável?', opts: ['Não há diferença', 'Na renda fixa as regras de rendimento são conhecidas; a variável oscila com o mercado', 'A variável é sempre mais segura', 'A renda fixa não rende'], c: 1, f: 'Na renda fixa você sabe a regra de rendimento na aplicação. Na variável, o valor depende do mercado.' },
      { q: 'Qual a ordem mais recomendada para quem está começando?', opts: ['Ações, reserva, dívidas', 'Quitar dívidas caras, montar reserva, depois investir', 'Criptomoedas primeiro', 'Investir tudo e depois ver as dívidas'], c: 1, f: 'Dívidas caras costumam custar mais do que qualquer investimento rende, e a reserva protege o resto do plano.' },
      { q: 'Alguém oferece 5% ao mês garantido. O mais provável é:', opts: ['Uma ótima oportunidade', 'Um golpe ou um risco escondido', 'Um CDB comum', 'Um título do Tesouro'], c: 1, f: 'Nenhum investimento seguro paga isso. Retorno alto "garantido" é a marca registrada de pirâmides financeiras.' },
    ],
  },
  // ────────────────────────────────────────────────────────────────────────
  {
    id: 'inflacao',
    titulo: 'Inflação e poder de compra',
    resumo: 'Por que dinheiro parado perde valor e como comparar rendimentos de verdade.',
    nivel: 'Intermediário',
    minutos: 5,
    emoji: '🛒',
    xp: 70,
    moedas: 20,
    licao: [
      [
        { tipo: 'texto', titulo: 'O que é inflação', texto: 'Inflação é a alta geral dos preços. Com ela, o mesmo dinheiro compra menos coisas ao longo do tempo. No Brasil, o índice oficial é o IPCA, medido pelo IBGE.' },
        { tipo: 'simulador', simulador: 'inflacao' },
      ],
      [
        { tipo: 'texto', titulo: 'Rendimento real', texto: 'O rendimento que importa é o real: quanto o investimento rendeu acima da inflação. Se algo rende 6% num ano em que a inflação foi 5%, seu ganho real foi de cerca de 1%.' },
        { tipo: 'exemplo', texto: 'Dinheiro parado na conta corrente rende zero. Com inflação de 4% ao ano, R$ 1.000 compram, depois de um ano, o que R$ 960 compravam antes.' },
        { tipo: 'dica', texto: 'Existem títulos do Tesouro atrelados ao IPCA, que pagam a inflação mais uma taxa fixa. São úteis para objetivos de longo prazo.' },
      ],
    ],
    questoes: [
      { q: 'O que a inflação faz com o seu dinheiro?', opts: ['Aumenta o seu valor', 'Reduz o poder de compra', 'Não tem efeito', 'Só afeta empresas'], c: 1, f: 'Com preços mais altos, o mesmo valor compra menos.' },
      { q: 'Qual é o índice oficial de inflação no Brasil?', opts: ['CDI', 'Selic', 'IPCA', 'FGC'], c: 2, f: 'O IPCA, medido pelo IBGE, é o índice oficial de inflação.' },
      { q: 'Um investimento rendeu 8% num ano com inflação de 5%. O ganho real foi de aproximadamente:', opts: ['13%', '8%', '3%', '-3%'], c: 2, f: 'O ganho real é o que sobra acima da inflação: aproximadamente 8% − 5% = 3%.' },
      { q: 'Deixar dinheiro parado na conta corrente por anos:', opts: ['É seguro e mantém o valor', 'Faz o dinheiro perder poder de compra', 'Rende igual à poupança', 'Protege contra a inflação'], c: 1, f: 'Sem rendimento, a inflação vai corroendo o valor real do dinheiro.' },
      { q: 'Um título do Tesouro atrelado ao IPCA paga:', opts: ['Só a inflação', 'A inflação mais uma taxa fixa', 'Um valor fixo em reais', 'A variação do dólar'], c: 1, f: 'Os títulos IPCA+ pagam a inflação do período mais uma taxa definida na compra.' },
    ],
  },
  // ────────────────────────────────────────────────────────────────────────
  {
    id: 'credito',
    titulo: 'Crédito consciente',
    resumo: 'Cartão, parcelamento, rotativo e score: usar crédito a seu favor.',
    nivel: 'Intermediário',
    minutos: 6,
    emoji: '💳',
    xp: 80,
    moedas: 20,
    licao: [
      [
        { tipo: 'texto', titulo: 'Crédito não é renda', texto: 'O limite do cartão não é dinheiro extra: é um empréstimo de curto prazo que precisa ser pago na fatura. Use o cartão só para gastos que já cabem no seu orçamento do mês.' },
        { tipo: 'texto', titulo: 'O rotativo', texto: 'Se você paga só parte da fatura, o restante entra no rotativo, uma das linhas de crédito mais caras do país. Por lei, desde 2024 os juros e encargos do rotativo não podem passar de 100% do valor original da dívida, mas mesmo assim a conta pode dobrar.' },
        { tipo: 'alerta', texto: 'Pagar só o mínimo da fatura é o caminho mais rápido para uma dívida difícil de sair.' },
      ],
      [
        { tipo: 'texto', titulo: 'Parcelamento', texto: 'Parcelar "sem juros" pode valer a pena se o preço à vista for o mesmo. Muitas vezes, porém, existe desconto à vista, e aí o parcelado está embutindo juros.' },
        { tipo: 'texto', titulo: 'CET', texto: 'Ao comparar empréstimos, olhe o Custo Efetivo Total (CET), que soma juros, tarifas, seguros e impostos. A taxa de juros sozinha pode enganar.' },
        { tipo: 'dica', texto: 'Muitas parcelas pequenas ao mesmo tempo comprometem os próximos meses. Some todas antes de fazer a próxima.' },
      ],
      [
        { tipo: 'texto', titulo: 'Score de crédito', texto: 'O score é uma pontuação que bancos e lojas usam para estimar se você paga as contas em dia. Um score maior facilita aprovação e taxas melhores.' },
        { tipo: 'lista', titulo: 'O que ajuda o score', itens: [
          'Pagar contas e faturas em dia.',
          'Manter o Cadastro Positivo e seus dados atualizados.',
          'Evitar pedir crédito em muitos lugares ao mesmo tempo.',
        ] },
      ],
    ],
    questoes: [
      { q: 'O limite do cartão de crédito é:', opts: ['Uma renda extra', 'Um empréstimo que precisa ser pago na fatura', 'Dinheiro guardado pelo banco para você', 'Um investimento'], c: 1, f: 'O limite é crédito, não renda. Tudo volta na fatura.' },
      { q: 'O que acontece ao pagar só o mínimo da fatura?', opts: ['Nada, o resto é perdoado', 'O restante entra no rotativo, com juros muito altos', 'O banco aumenta seu limite', 'O valor é dividido sem juros'], c: 1, f: 'O saldo restante vai para o rotativo, uma das linhas de crédito mais caras.' },
      { q: 'O que é o CET?', opts: ['Custo Efetivo Total: juros mais tarifas, seguros e impostos', 'Um tipo de cartão', 'A taxa básica de juros', 'O limite do cheque especial'], c: 0, f: 'O CET mostra o custo real de um empréstimo. É o número certo para comparar ofertas.' },
      { q: 'Uma loja oferece 10% de desconto à vista ou 10× "sem juros". O parcelado:', opts: ['É sempre a melhor opção', 'Embute o custo do desconto que você deixou de ganhar', 'É mais barato', 'Aumenta seu score automaticamente'], c: 1, f: 'Se há desconto à vista, o preço parcelado já inclui um custo. Compare os dois valores totais.' },
      { q: 'O que mais ajuda a aumentar o score?', opts: ['Fazer muitos pedidos de crédito', 'Pagar contas em dia', 'Usar todo o limite do cartão', 'Ter várias contas bancárias'], c: 1, f: 'Histórico de pagamentos em dia é o fator que mais pesa no score.' },
      { q: 'Desde 2024, os juros e encargos do rotativo do cartão:', opts: ['Foram proibidos', 'Não podem passar de 100% do valor original da dívida', 'Passaram a ser fixos em 1% ao mês', 'Deixaram de existir para estudantes'], c: 1, f: 'A lei limitou o total de juros e encargos do rotativo a 100% do valor original. Ainda assim, é um crédito caríssimo.' },
    ],
  },
  // ────────────────────────────────────────────────────────────────────────
  {
    id: 'dividas',
    titulo: 'Saindo das dívidas',
    resumo: 'Um plano concreto para organizar, negociar e quitar o que você deve.',
    nivel: 'Intermediário',
    minutos: 6,
    emoji: '🧗',
    xp: 80,
    moedas: 20,
    licao: [
      [
        { tipo: 'lista', titulo: 'Primeiro, a foto completa', itens: [
          'Liste todas as dívidas: credor, saldo, taxa de juros e parcela.',
          'Pare de criar dívidas novas enquanto organiza as antigas.',
          'Veja quanto do orçamento dá para direcionar todo mês para quitar.',
        ] },
        { tipo: 'texto', titulo: 'Dois métodos', texto: 'Avalanche: paga o mínimo de todas e coloca o extra na dívida de juros mais altos. Economiza mais dinheiro. Bola de neve: coloca o extra na menor dívida primeiro. Economiza menos, mas as vitórias rápidas ajudam a manter a motivação.' },
      ],
      [
        { tipo: 'simulador', simulador: 'divida' },
        { tipo: 'texto', titulo: 'Negociar', texto: 'Credores costumam aceitar descontos grandes em dívidas atrasadas, principalmente em mutirões de renegociação. Antes de aceitar, confira se a parcela cabe no seu orçamento: um acordo quebrado volta a acumular juros.' },
        { tipo: 'dica', texto: 'Trocar uma dívida cara por uma mais barata (como um consignado ou um empréstimo pessoal com CET menor) pode ajudar, desde que você não volte a usar o crédito caro.' },
      ],
    ],
    questoes: [
      { q: 'No método avalanche, o dinheiro extra vai para:', opts: ['A menor dívida', 'A dívida com juros mais altos', 'A dívida mais antiga', 'Dividido igualmente'], c: 1, f: 'Atacar a dívida mais cara primeiro reduz o total de juros pago.' },
      { q: 'A principal vantagem do método bola de neve é:', opts: ['Pagar menos juros no total', 'Vitórias rápidas que mantêm a motivação', 'Não precisar listar as dívidas', 'Aumentar o score imediatamente'], c: 1, f: 'Quitar dívidas pequenas rápido gera sensação de progresso, o que ajuda a manter o plano.' },
      { q: 'Antes de fechar um acordo de renegociação, é essencial:', opts: ['Aceitar a primeira proposta', 'Confirmar que a parcela cabe no orçamento', 'Pegar outro empréstimo para dar entrada', 'Esperar a dívida prescrever'], c: 1, f: 'Um acordo que não cabe no bolso tende a ser quebrado, e a dívida volta a crescer.' },
      { q: 'Qual o primeiro passo para sair das dívidas?', opts: ['Listar todas com saldo, taxa e parcela', 'Ignorar as menores', 'Investir para pagar depois', 'Cancelar o CPF'], c: 0, f: 'Sem a foto completa, não dá para escolher o que pagar primeiro.' },
      { q: 'Trocar uma dívida cara por uma mais barata faz sentido quando:', opts: ['Você continua usando o crédito caro', 'O CET da nova dívida é menor e você para de usar o crédito caro', 'A parcela nova é maior que sua renda', 'Nunca faz sentido'], c: 1, f: 'Portabilidade ou troca de dívida só funciona se o custo for menor e o hábito que gerou a dívida mudar.' },
    ],
  },
  // ────────────────────────────────────────────────────────────────────────
  {
    id: 'golpes',
    titulo: 'Pix e golpes digitais',
    resumo: 'Os golpes mais comuns e o que fazer se acontecer com você.',
    nivel: 'Básico',
    minutos: 6,
    emoji: '🛡️',
    xp: 80,
    moedas: 25,
    licao: [
      [
        { tipo: 'texto', titulo: 'Como os golpes funcionam', texto: 'Quase todo golpe digital mistura pressa e confiança: alguém se passa por banco, loja, parente ou empresa conhecida e cria uma urgência para você agir sem pensar.' },
        { tipo: 'lista', titulo: 'Os mais comuns', itens: [
          'Falsa central do banco: ligam dizendo que há uma compra suspeita e pedem senha, código ou transferência para uma "conta segura".',
          'Parente com número novo: mensagem pedindo um Pix urgente.',
          'Boleto ou QR Code falso, com o nome do beneficiário diferente do esperado.',
          'Lojas e promoções boas demais em redes sociais.',
          'Falso emprego ou tarefa paga que pede um depósito para começar.',
        ] },
      ],
      [
        { tipo: 'lista', titulo: 'Regras que evitam a maioria', itens: [
          'Banco nunca pede senha, código recebido por SMS nem transferência para "proteger" sua conta.',
          'Confira sempre o nome do recebedor antes de confirmar um Pix.',
          'Na dúvida, desligue e ligue você para o número oficial do banco ou da pessoa.',
          'Ative a verificação em duas etapas no WhatsApp e nos apps importantes.',
          'Ajuste o limite de Pix noturno para um valor baixo.',
        ] },
      ],
      [
        { tipo: 'texto', titulo: 'Se acontecer', texto: 'Aja rápido: avise seu banco pelos canais oficiais e peça a contestação pelo MED, o Mecanismo Especial de Devolução do Pix, que pode bloquear o dinheiro na conta de quem recebeu. Registre um boletim de ocorrência; em muitos estados ele pode ser feito pela internet.' },
        { tipo: 'alerta', texto: 'Quanto antes você avisar o banco, maior a chance de o dinheiro ainda estar na conta do golpista.' },
      ],
    ],
    questoes: [
      { q: 'Alguém liga dizendo ser do seu banco e pede o código que chegou por SMS. Você:', opts: ['Passa o código, é o banco', 'Desliga e liga você mesmo para o número oficial', 'Passa só metade do código', 'Pede para mandar por e-mail'], c: 1, f: 'Bancos não pedem códigos nem senhas. Desligue e ligue para o canal oficial.' },
      { q: 'Antes de confirmar um Pix, o que conferir?', opts: ['Só o valor', 'O nome do recebedor', 'A cor do QR Code', 'Nada, Pix é instantâneo'], c: 1, f: 'O nome do recebedor aparece antes da confirmação. Se não for quem você espera, cancele.' },
      { q: 'Um "parente" com número novo pede um Pix urgente. O melhor a fazer:', opts: ['Transferir rápido para ajudar', 'Ligar para o número antigo ou confirmar por outro meio', 'Mandar metade do valor', 'Pedir o CPF e transferir'], c: 1, f: 'Confirme por outro canal antes. A urgência é justamente o que o golpista quer.' },
      { q: 'O que é o MED do Pix?', opts: ['Um tipo de Pix agendado', 'Um mecanismo para pedir a devolução em caso de golpe ou fraude', 'Uma taxa cobrada pelo banco', 'Um limite noturno'], c: 1, f: 'O Mecanismo Especial de Devolução permite que o banco bloqueie e tente devolver valores enviados em golpes.' },
      { q: 'Uma vaga paga por tarefas simples pede um depósito para você começar. Isso é:', opts: ['Normal em empregos online', 'Um sinal clássico de golpe', 'Um investimento', 'Um seguro obrigatório'], c: 1, f: 'Empregos legítimos não cobram para você começar a trabalhar.' },
      { q: 'Qual ação reduz o prejuízo se seu celular for roubado?', opts: ['Ter limite de Pix noturno baixo', 'Deixar a senha anotada na capa', 'Usar a mesma senha em todos os apps', 'Desativar a biometria'], c: 0, f: 'Limites baixos, especialmente à noite, reduzem quanto um criminoso consegue movimentar.' },
    ],
  },
  // ────────────────────────────────────────────────────────────────────────
  {
    id: 'open-finance',
    titulo: 'Open Finance e seus dados',
    resumo: 'Como funciona o compartilhamento de dados entre bancos e como manter o controle.',
    nivel: 'Intermediário',
    minutos: 5,
    emoji: '🔗',
    xp: 70,
    moedas: 20,
    licao: [
      [
        { tipo: 'texto', titulo: 'O que é', texto: 'O Open Finance é o sistema regulado pelo Banco Central que permite compartilhar seus dados financeiros entre instituições autorizadas, sempre com o seu consentimento. É assim que o Meu DinDin consegue mostrar saldos e extratos de outros bancos.' },
        { tipo: 'lista', titulo: 'Como funciona o consentimento', itens: [
          'Você escolhe quais dados compartilhar e com quem.',
          'A autorização é feita no app ou site do seu banco, não no app que vai receber os dados.',
          'Você define por quanto tempo o compartilhamento vale, inclusive sem data para acabar, e pode cancelar quando quiser.',
        ] },
      ],
      [
        { tipo: 'texto', titulo: 'Vantagens', texto: 'Ver tudo em um lugar, receber ofertas de crédito com base no seu histórico real e comparar produtos com mais facilidade.' },
        { tipo: 'alerta', texto: 'Ninguém legítimo pede sua senha do banco por mensagem, ligação ou formulário para "ativar o Open Finance". A autorização acontece sempre no ambiente do próprio banco.' },
        { tipo: 'dica', texto: 'Você pode ver e cancelar os compartilhamentos ativos na área de Open Finance do app do seu banco, e também desconectar pela tela Contas daqui.' },
      ],
    ],
    questoes: [
      { q: 'Quem regula o Open Finance no Brasil?', opts: ['A Receita Federal', 'O Banco Central', 'Cada banco individualmente', 'Ninguém'], c: 1, f: 'O Open Finance é regulado pelo Banco Central.' },
      { q: 'Onde você autoriza o compartilhamento dos seus dados?', opts: ['Respondendo a um e-mail', 'No app ou site do seu próprio banco', 'Por ligação telefônica', 'Enviando sua senha para o app que vai receber os dados'], c: 1, f: 'A autorização acontece no ambiente do banco que tem os dados. Sua senha nunca é passada para o outro app.' },
      { q: 'Depois de autorizar o compartilhamento, você pode:', opts: ['Nunca mais cancelar', 'Cancelar quando quiser, no app do banco ou no app que recebe os dados', 'Cancelar só depois de 12 meses', 'Cancelar só indo à agência'], c: 1, f: 'O consentimento pode ser revogado a qualquer momento, pelos canais digitais do banco ou do app que recebe os dados.' },
      { q: 'Uma mensagem pede sua senha para "ativar o Open Finance". Isso é:', opts: ['O procedimento normal', 'Golpe', 'Obrigatório por lei', 'Uma atualização do banco'], c: 1, f: 'O Open Finance nunca exige que você passe sua senha para ninguém.' },
      { q: 'Uma vantagem do Open Finance para você:', opts: ['Bancos podem mexer no seu dinheiro sem avisar', 'Ver contas de vários bancos em um só lugar', 'Pagar menos impostos', 'Desbloquear o limite do cartão'], c: 1, f: 'Com o compartilhamento de dados, apps como este organizam suas finanças de vários bancos em um só lugar.' },
    ],
  },
]

export const moduloPorId = (id: string) => MODULOS.find((m) => m.id === id)

/** Embaralha as opções de uma questão mantendo a resposta certa. */
export function embaralhar(q: Questao): Questao {
  const idx = q.opts.map((_, i) => i)
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }
  return { ...q, opts: idx.map((i) => q.opts[i]), c: idx.indexOf(q.c) }
}
