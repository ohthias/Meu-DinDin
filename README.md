# Meu DinDin

Gestão financeira para jovens adultos (18–25 anos): extrato, orçamento por categoria, metas, investimentos e gamificação — agora com **Vite + React**, **Supabase** e **Open Finance**.

```
web/                      App Vite + React + TypeScript
  wasm/motor.ts           Motor de análise em AssemblyScript → WebAssembly
api/
  MeuDinDin.Api/          API de análise em C# (.NET 10, Swagger)
  MeuDinDin.Api.Tests/    Testes xUnit (mesmos casos dos testes do app)
  openapi.json            Contrato OpenAPI usado para gerar o cliente TypeScript
supabase/
  migrations/             Schema, RLS, gatilhos de XP/medalhas, RPCs
  functions/
    open-finance/         Connect token, sincronização e desconexão (Pluggy)
    open-finance-webhook/ Re-sincroniza quando o banco atualiza dados
Meu-Dindin/               Backend .NET + SQLite antigo (substituído, mantido para referência)
```

```
            ┌──────────── navegador ─────────────┐
            │  React + motor WebAssembly (ML)    │
            └──┬──────────────┬───────────────┬──┘
     dados (RLS)│   análise    │ token do       │ Open Finance
               ▼   (opcional) ▼ usuário        ▼
          Supabase ◄──── API C# ────► Banco Central (SGS)
          Postgres/Auth   Swagger        Selic · CDI · IPCA
               ▲
          Edge Functions ◄──── Pluggy (Open Finance)
```

## O que mudou

| Antes | Agora |
|---|---|
| SPA em um HTML de 2.100 linhas + `script.js` | Vite + React + TS, uma tela por rota, carregadas sob demanda |
| ASP.NET + EF Core + SQLite local | Supabase (Postgres + Auth + Realtime) |
| JWT próprio + BCrypt | Supabase Auth (cadastro, login, recuperação de senha) |
| Regras de XP/medalhas em C# | Gatilhos e funções `security definer` no Postgres |
| Transações só manuais | Contas e extratos importados via Open Finance |

Isolamento entre usuários é garantido por **Row Level Security** em todas as tabelas. Colunas de gamificação (XP, nível, moedas) não podem ser alteradas pelo cliente — só pelas funções do banco. Contas e transações vindas do Open Finance são somente leitura para o app.

## Rodando

### 1. Só a interface (modo demonstração)

```bash
cd web
npm install
npm run dev
```

Sem variáveis do Supabase o app usa dados de exemplo em memória — dá para navegar por todas as telas e simular a conexão de um banco.

### 2. Com Supabase

```bash
# na raiz do repositório
npx supabase login
npx supabase link --project-ref <seu-projeto>
npx supabase db push            # aplica supabase/migrations
```

Crie `web/.env.local` a partir de `web/.env.example`:

```
VITE_SUPABASE_URL=https://<seu-projeto>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

Para desenvolvimento local completo: `npx supabase start` sobe Postgres, Auth e Edge Functions em Docker.

### 3. Open Finance

O Open Finance Brasil só é acessível por instituições autorizadas pelo Banco Central, então a integração passa por um agregador regulado — aqui, a **[Pluggy](https://pluggy.ai)**. O fluxo:

1. O app pede um *connect token* à Edge Function `open-finance` (as credenciais da Pluggy nunca vão para o navegador).
2. O widget Pluggy Connect abre; a pessoa escolhe o banco e autoriza o compartilhamento no ambiente do próprio banco.
3. A função busca contas e transações dos últimos 90 dias e grava em `contas` e `transacoes` (upsert pelo ID externo, então sincronizar de novo não duplica).
4. O webhook mantém os dados atualizados em segundo plano; o app recebe as mudanças via Realtime.

Configuração:

```bash
npx supabase secrets set \
  PLUGGY_CLIENT_ID=... \
  PLUGGY_CLIENT_SECRET=... \
  PLUGGY_WEBHOOK_SECRET=$(openssl rand -hex 16)

# opcional, para atualização automática:
npx supabase secrets set PLUGGY_WEBHOOK_URL="https://<projeto>.supabase.co/functions/v1/open-finance-webhook?secret=<o mesmo segredo>"

npx supabase functions deploy open-finance
npx supabase functions deploy open-finance-webhook --no-verify-jwt
npx supabase functions deploy minha-conta
```

Com `VITE_OPEN_FINANCE_SANDBOX=true` o widget mostra o banco de testes da Pluggy (usuário `user-ok`, senha `password-ok`).

Quer trocar de agregador (Belvo, Klavi, etc.)? Toda a chamada externa está em `supabase/functions/_shared/pluggy.ts`; o restante do app só conhece as tabelas `of_conexoes`, `contas` e `transacoes`.

## Exportação de extratos

Botão **Exportar** no Extrato e no detalhe de cada conta, por mês, últimos 3 meses, ano ou datas escolhidas, de todas as contas ou de uma só.

| Formato | Uso |
|---|---|
| PDF | Relatório com entradas, saídas, resultado, gastos por categoria e lista completa |
| CSV | Separador `;`, vírgula decimal e BOM UTF-8: abre direto no Excel em português |
| OFX 1.0.2 | Importação em GnuCash, Money e outros gerenciadores |

A exportação roda no navegador. A API em C# também expõe CSV e OFX em `GET /api/v1/extratos/exportar`, com o mesmo layout, para integrações.

## Investimentos

- **Produtos:** Poupança, Tesouro Selic, Tesouro Prefixado, Tesouro IPCA+, CDB, LCI e LCA, cada um com taxa contratada (% do CDI, % a.a. ou IPCA + %), emissor, vencimento e liquidez.
- **Carteira:** valor bruto estimado até hoje, IR pela tabela regressiva (isento em poupança, LCI e LCA), valor líquido, quanto dá para resgatar em um dia e divisão entre pós-fixado, inflação e prefixado comparada a uma referência educativa do perfil.
- **Resgate:** encerra a aplicação e lança a entrada no extrato.
- **Simular objetivo:** quanto guardar por mês em cada produto para chegar a um valor líquido no prazo, com gráfico da evolução.
- **Indicadores:** Selic, CDI e IPCA 12 meses vêm do Banco Central pela API em C#. Sem a API, valem os valores de referência (Selic 13,75% do Copom de 16/09/2026; IPCA 4,58% em 12 meses até setembro/2026).

As estimativas não incluem IOF, taxa de custódia da B3 nem TR.

## Análise e machine learning

A tela **Análise** junta seis leituras sobre o seu histórico:

| Análise | Como funciona |
|---|---|
| Saúde financeira (0–100) | Seis critérios explicáveis: quanto você guarda, reserva de emergência, orçamento, acompanhamento, uso do cartão e investimentos |
| Fechamento do mês | O que já saiu mais o que costuma sair do dia de hoje ao fim do mês nos 3 meses anteriores |
| Previsão do próximo mês | Suavização exponencial de Holt (nível + tendência) por categoria, com faixa de 80% |
| Gastos fora do padrão | Z-score robusto (mediana e MAD) por categoria nos últimos 12 meses |
| Gastos que se repetem | Mesma descrição em 3+ meses com variação de valor abaixo de 10% |
| Categorização automática | Naive Bayes sobre as palavras da descrição, treinado com exemplos iniciais e com o seu histórico |

A categorização também aparece ao registrar uma despesa: a categoria é sugerida enquanto você digita.

### WebAssembly

Holt, z-score robusto e Naive Bayes rodam em um módulo WebAssembly de ~10 KB escrito em AssemblyScript (`web/wasm/motor.ts`). As contas acontecem no navegador, então os dados não saem do aparelho para isso. O módulo só é baixado quando a tela de análise ou o diálogo de nova transação abre.

```bash
cd web
npm run wasm   # recompila src/wasm/motor.wasm (o build já faz isso)
npm test       # inclui testes que comparam o WASM com uma implementação de referência em JS
```

## API de análise em C# (Swagger)

Serviço opcional em `api/MeuDinDin.Api`. Ele lê os dados do Supabase com o token do próprio usuário, então o RLS continua valendo e a API não precisa de chave de serviço.

| Rota | O que faz |
|---|---|
| `GET /api/v1/indicadores` | Selic, CDI e IPCA do Banco Central (SGS), com cache; não exige login |
| `GET /api/v1/investimentos/carteira` | Carteira com bruto, IR, líquido e divisão por classe |
| `POST /api/v1/investimentos/simular` | Aporte mensal necessário por produto |
| `GET /api/v1/analise/saude` | Pontuação de saúde financeira |
| `GET /api/v1/analise/previsao` | Previsão de gastos do próximo mês |
| `GET /api/v1/extratos/exportar` | Extrato em CSV ou OFX |

O Swagger UI fica em `/swagger`. Ele documenta:

- resumo e descrição de cada rota;
- comentários XML dos modelos;
- enums como texto;
- erros no padrão Problem Details;
- autenticação Bearer, com o botão *Authorize* lembrando o token entre recargas;
- `operationId` com o nome de cada rota.

O app consome a API por um cliente tipado gerado a partir do contrato OpenAPI (`openapi-typescript` + `openapi-fetch`). Se a API mudar e o cliente não for regenerado, o `tsc` acusa a diferença.

```bash
# API
cd api/MeuDinDin.Api
dotnet user-secrets set "Supabase:Url" "https://<projeto>.supabase.co"
dotnet user-secrets set "Supabase:AnonKey" "<anon key>"
dotnet run                      # http://localhost:5080/swagger
dotnet test ../MeuDinDin.Api.Tests

# App apontando para a API
echo "VITE_ANALISE_API_URL=http://localhost:5080" >> web/.env.local
cd web && npm run gerar:api:vivo   # regenera o cliente a partir do Swagger em execução
```

Projetos Supabase com chaves de assinatura assimétricas são validados pelas chaves públicas (JWKS). Para projetos com segredo JWT legado, configure `Supabase:JwtSecret`.

Sem `VITE_ANALISE_API_URL` o app continua funcionando completo. A carteira e a pontuação são calculadas no navegador com as mesmas regras, e os indicadores ficam nos valores de referência.

## Regras de negócio: acesso e envio de dados

As regras valem no banco (`supabase/migrations/20261103040000_regras_de_negocio.sql`). App, API e Edge Functions são só clientes dele, então nenhum deles consegue contorná-las. O app repete as validações em `web/src/lib/regras.ts` para mostrar o erro antes de enviar. Os limites ficam na tabela `config_regras` e podem ser ajustados sem nova migration.

### Acesso

| Regra | Onde |
|---|---|
| Cada pessoa só lê e altera os próprios dados | RLS em todas as tabelas |
| Uma transação só pode ser ligada a uma conta da mesma pessoa (antes, o `conta_id` aceitava a conta de qualquer um) | gatilho `trg_validar_transacao` |
| Dono, origem e identificador externo de um registro nunca mudam | gatilho `trg_campos_imutaveis` |
| Dados vindos do banco (Open Finance) são só leitura; transações manuais não entram em contas do Open Finance | RLS + gatilho |
| Sem aceitar a versão atual dos termos, não dá para gravar nada nem conectar banco | `exigir_termos()`, tela de aceite, Edge Function |
| XP, nível, moedas e itens só mudam por funções do banco | permissões por coluna |
| De uma notificação, só o campo "lida" pode ser alterado | permissão por coluna |
| A API em C# lê com o token da pessoa, sem chave de serviço | `SupabaseRest` |

### Envio de dados

| Dado | Regras |
|---|---|
| Perfil | Nome com 2 a 60 caracteres; idade mínima de 16 anos |
| Transação manual | Valor entre R$ 0,01 e R$ 1.000.000; data entre 5 anos atrás e hoje; categoria compatível com o tipo; descrição de até 120 caracteres, sem caracteres de controle; forma de pagamento da lista |
| Conta manual | Nome de 1 a 40 caracteres; até 20 contas; não pode ser ligada a uma conexão bancária |
| Meta | Até R$ 10 milhões; prazo entre hoje e 50 anos; o valor guardado nunca passa do valor da meta; até 20 metas em andamento |
| Orçamento | Só categorias de despesa; até R$ 1 milhão; até 12 meses antes ou depois do mês atual |
| Investimento | Indexador compatível com o produto (Tesouro Selic só Selic etc.); taxa numa faixa possível; vencimento depois da aplicação; aplicação resgatada não muda mais |

### Limites de uso

| Limite | Valor |
|---|---|
| Transações manuais por dia | 300 |
| Transações, metas e aportes que dão XP por dia | 10, 3 e 3 (criar e apagar não gera XP infinito) |
| Bancos conectados | 10 |
| Intervalo entre sincronizações manuais do mesmo banco | 2 minutos |
| API de análise | 120 requisições por minuto e 20 exportações por hora, por pessoa |

### Transparência e direitos do titular (LGPD)

- **Histórico de alterações:** a tabela `auditoria` registra o que a pessoa criou, alterou ou apagou, e toda mudança em conexões bancárias. Ninguém consegue gravar ou editar o histórico pelo app. Ele é guardado por 365 dias; agende `limpar_auditoria()` no pg_cron.
- **Baixar meus dados:** em Perfil → Seus dados, um JSON com tudo, gerado por `exportar_meus_dados()`.
- **Excluir minha conta:** Edge Function `minha-conta`. Ela encerra as conexões no agregador de Open Finance antes de apagar o usuário; se não conseguir, não apaga, para o compartilhamento não continuar ativo. O banco remove todos os dados em cascata.
- **Termos:** página pública em `/termos`, aceite no cadastro e nova solicitação de aceite sempre que `versao_termos` subir.

Os erros de regra usam o código `P0422` e chegam ao app com a mensagem em português.

## Telas

Início · Contas (por banco conectado + contas manuais) · Detalhe da conta · Extrato (com exportação) · Orçamento (cofrinho que enche, alerta ao passar de 90%) · Análise · Metas · Investir · Aprender · Conquistas (desafios, medalhas e loja) · Perfil (dados, perfil financeiro, acessibilidade).

## Educação financeira

Dez módulos em duas trilhas. Cada um tem uma lição curta em páginas, um quiz com explicação a cada resposta e opções embaralhadas a cada tentativa. Cinco módulos trazem simuladores interativos.

| Básico | Intermediário |
|---|---|
| Orçamento pessoal (simulador 50/30/20) | Primeiros investimentos |
| Reserva de emergência (simulador de reserva) | Inflação e poder de compra (simulador) |
| Juros compostos (simulador) | Crédito consciente |
| Primeiro emprego e estágio | Saindo das dívidas (avalanche × bola de neve) |
| Pix e golpes digitais | Open Finance e seus dados |

Os quatro módulos da versão anterior foram reescritos com lição antes do quiz, uma questão a mais e explicações revisadas. O conteúdo fica em `web/src/lib/educacao.ts`. A recompensa e o número de questões ficam em `modulos_educacao`, então os dois precisam andar juntos.

Aprovação com 70% de acertos. XP e moedas só na primeira aprovação, mais um bônus na primeira nota máxima. Refazer serve para revisar.

## Gamificação

| Ação | XP | Moedas |
|---|---|---|
| Registrar transação manual | +10 | |
| Criar meta | +25 | |
| Registrar aporte | +50 | |
| Concluir questionário inicial | +50 | |
| Conectar banco via Open Finance | +75 | |
| Concluir módulo de educação | +60 a +80 | +15 a +25 |
| Nota máxima no módulo (1ª vez) | +20 | +10 |
| Concluir desafio | +100 a +300 | metade do XP |
| Medalha | | +50 |
| Subir de nível | | +30 por nível |

Os 11 níveis (Novato → Mestre DinDin) são os mesmos da versão anterior.

**Desafios** têm dois modos. Os de check-in (sem delivery, semana sem supérfluos) dependem de você marcar o dia, e pular um dia zera a sequência. Os automáticos são calculados pelos seus dados: dias seguidos registrando, mês com 10% guardados, módulos concluídos e categorias com orçamento.

**Medalhas** (12) são concedidas pelo banco quando a condição acontece: sequência de 7 dias, 3 meses no azul, meta completa, primeiro módulo, todos os módulos, nota máxima, primeira compra na loja e outras.

**Loja**: os itens têm efeito de verdade no app.

| Item | Efeito |
|---|---|
| Temas noturno, menta e lavanda | Mudam as cores do app inteiro |
| Avatares | Substituem a inicial no topo |
| Moldura dourada | Anel em volta do avatar |
| Congelar sequência | Salva um desafio de check-in se você pular um dia |
| XP em dobro (24 h) | Dobra todo XP ganho no período |

Compras, equipar itens, concluir módulos e check-ins passam por funções no banco que validam saldo, posse e regras. O app não consegue alterar XP, moedas ou itens diretamente.

## Limitações conhecidas

- A nota do quiz é calculada no navegador. O banco limita o que pode ser ganho (módulo existente, acertos dentro do total, recompensa uma vez só), mas não confere resposta por resposta.
- O `api/openapi.json` foi escrito à mão a partir do código da API. Rode `npm run gerar:api:vivo` com a API no ar para trocar pelo contrato gerado pelo Swagger.
