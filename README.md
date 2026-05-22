# 💰 Meu DinDin — ASP.NET Core 8 + SPA

Aplicativo web de gestão financeira para jovens adultos (18–25 anos), com gamificação, onboarding personalizado e recomendações inteligentes.

## 📁 Estrutura do projeto

```
MeuDinDin/
├── Controllers/
│   ├── AuthController.cs          # /api/auth — login, registro, perfil
│   ├── TransacoesController.cs    # /api/transacoes
│   ├── MetasController.cs         # /api/metas
│   ├── InvestimentosController.cs # /api/investimentos
│   ├── GamificacaoController.cs   # /api/gamificacao
│   └── RecomendacoesController.cs # /api/recomendacoes
├── Data/
│   └── AppDbContext.cs            # EF Core + SQLite + seed
├── DTOs/
│   ├── AuthDtos.cs
│   └── FinanceiroDtos.cs
├── Migrations/
│   ├── InitialCreate.cs
│   └── AppDbContextModelSnapshot.cs
├── Models/
│   ├── Usuario.cs
│   ├── Transacao.cs
│   ├── Meta.cs
│   ├── Investimento.cs
│   └── Gamificacao.cs             # Desafio, Medalha, OnboardingResposta
├── Services/
│   ├── AuthService.cs
│   ├── TransacaoService.cs
│   ├── MetaService.cs
│   ├── InvestimentoService.cs
│   ├── GamificacaoService.cs
│   └── RecomendacaoService.cs
├── wwwroot/
│   ├── meu_dindin.html            # SPA — frontend completo
│   └── api.js                     # Camada de integração JS ↔ API C#
├── Program.cs
├── appsettings.json
├── appsettings.Development.json
└── MeuDinDin.csproj
```

## 🚀 Como rodar (passo a passo)

### Pré-requisitos
- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8)
- Visual Studio 2022+ **ou** VS Code com extensão C#

### 1. Restaurar dependências
```bash
dotnet restore
```

### 2. Criar o banco de dados (SQLite — automático na primeira execução)
```bash
# Opção A: EnsureCreated automático (já configurado no Program.cs)
dotnet run

# Opção B: Usar Migrations manualmente
dotnet ef database update
```

### 3. Rodar o servidor
```bash
dotnet run
# Ou em modo watch (hot reload):
dotnet watch run
```

### 4. Acessar o app
- **Frontend:** http://localhost:5000/meu_dindin.html
- **Swagger UI:** http://localhost:5000/swagger

## 🔑 Fluxo de autenticação

```
1. POST /api/auth/register  → { nome, email, senha }
                            ← { token, usuarioId, ... }

2. POST /api/auth/onboarding → { respostas: [...] }
   (Bearer token no header)

3. Todas as rotas subsequentes exigem:
   Authorization: Bearer <token>
```

O token JWT dura **30 dias** e é armazenado no `localStorage` pelo `api.js`.

## 📡 Endpoints da API

### Auth
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/register` | Criar conta |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/onboarding` | Salvar respostas do quiz inicial |
| GET | `/api/auth/perfil` | Obter perfil do usuário |
| PUT | `/api/auth/perfil` | Atualizar perfil |
| PUT | `/api/auth/senha` | Alterar senha |

### Transações
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/transacoes?mes=5&ano=2026` | Listar por mês |
| GET | `/api/transacoes` | Listar todas |
| POST | `/api/transacoes` | Adicionar |
| DELETE | `/api/transacoes/{id}` | Remover |
| GET | `/api/transacoes/resumo?mes=5&ano=2026` | Resumo financeiro |
| GET | `/api/transacoes/evolucao?meses=5` | Evolução mensal |

### Metas
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/metas` | Listar |
| POST | `/api/metas` | Criar |
| PATCH | `/api/metas/{id}/valor` | Atualizar progresso |
| DELETE | `/api/metas/{id}` | Remover |

### Investimentos
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/investimentos` | Listar aportes |
| GET | `/api/investimentos/resumo` | Resumo por tipo |
| POST | `/api/investimentos` | Novo aporte |
| DELETE | `/api/investimentos/{id}` | Remover |

### Gamificação
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/gamificacao` | XP, nível, desafios, medalhas |
| GET | `/api/gamificacao/desafios` | Listar desafios |
| POST | `/api/gamificacao/desafios/{id}/avancar` | Avançar dia do desafio |
| GET | `/api/gamificacao/medalhas` | Listar medalhas |
| POST | `/api/gamificacao/loja/resgatar` | Resgatar recompensa |

### Recomendações
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/recomendacoes?mes=5&ano=2026` | Recomendações personalizadas |

## 🗄️ Banco de dados

O projeto usa **SQLite** por padrão (arquivo `meudindin.db` na raiz).

Para trocar para **SQL Server** em produção:

```csharp
// Program.cs — substituir:
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseSqlServer(builder.Configuration.GetConnectionString("Default")));
```

```json
// appsettings.json
"ConnectionStrings": {
  "Default": "Server=.;Database=MeuDinDin;Trusted_Connection=True;"
}
```

E instalar o pacote:
```bash
dotnet add package Microsoft.EntityFrameworkCore.SqlServer
```

## 🎮 Sistema de gamificação

| Ação | XP ganho |
|------|----------|
| Registrar transação | +10 XP |
| Criar meta | +25 XP |
| Novo aporte | +50 XP |
| Concluir quiz | +50 XP |
| Concluir desafio | XP variável (100–300) |

| Nível | XP necessário | Título |
|-------|---------------|--------|
| 1 | 0 | Novato |
| 2 | 100 | Poupador |
| 3 | 300 | Economizador |
| 4 | 600 | Planejador |
| 5 | 1.000 | Financista |
| 6 | 1.500 | Gestor |
| 7 | 2.200 | Economista |
| 8 | 3.000 | Investidor |
| 9 | 4.000 | Especialista |
| 10 | 5.200 | Guru |
| 11 | 6.600 | Mestre DinDin |

## ♿ Acessibilidade

- 250+ atributos ARIA no frontend
- Alto contraste, texto grande e redução de animações (persistidos no perfil)
- Atalho `Alt + A` para painel de acessibilidade
- Leitura em voz alta via Web Speech API
- Painel de Libras expansível

## 🔐 Segurança

- Senhas com BCrypt (cost factor 11)
- JWT com expiração de 30 dias (configurável em `appsettings.json`)
- Todas as rotas de dados exigem `[Authorize]`
- Cada usuário só acessa seus próprios dados (filtro por `UsuarioId` em todos os serviços)
- Troque a `Jwt:Key` em produção por uma chave segura de 32+ caracteres

## 📦 Pacotes utilizados

| Pacote | Versão | Uso |
|--------|--------|-----|
| `Microsoft.EntityFrameworkCore.Sqlite` | 8.0.0 | ORM + banco |
| `Microsoft.AspNetCore.Authentication.JwtBearer` | 8.0.0 | Autenticação JWT |
| `BCrypt.Net-Next` | 4.0.3 | Hash de senhas |
| `Swashbuckle.AspNetCore` | 6.5.0 | Swagger UI |