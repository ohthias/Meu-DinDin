# Meu DinDin 💰

Sistema web de gestão financeira pessoal desenvolvido como trabalho universitário, com o objetivo de auxiliar usuários no controle de receitas, despesas, metas financeiras e acompanhamento da saúde financeira de forma simples, moderna e intuitiva.

## 📚 Sobre o Projeto

O **Meu DinDin** foi desenvolvido para aplicar conceitos de:

* Programação Orientada a Objetos (POO)
* Desenvolvimento Web com ASP.NET Core
* Arquitetura em camadas
* Banco de dados relacional
* APIs REST
* Autenticação com JWT
* Boas práticas de UX/UI
* Organização e manutenção de software

O sistema busca oferecer uma experiência prática para gerenciamento financeiro pessoal, permitindo maior organização e educação financeira dos usuários.

## 🚀 Tecnologias Utilizadas

* C#
* ASP.NET Core
* Entity Framework Core
* SQL Server
* JWT Authentication
* Razor Pages / MVC
* Swagger
* HTML5
* CSS3
* JavaScript

## 🏗️ Arquitetura do Projeto

O projeto foi estruturado seguindo o modelo de separação por responsabilidades:

```txt
📦 MeuDinDin
 ┣ 📂 Controllers
 ┣ 📂 Models
 ┣ 📂 Services
 ┣ 📂 Data
 ┣ 📂 Views
 ┣ 📂 wwwroot
 ┗ 📂 Migrations
```

### Camadas

| Camada               | Responsabilidade                    |
| -------------------- | ----------------------------------- |
| Presentation         | Interface e interação com o usuário |
| Application/Services | Regras de negócio                   |
| Domain/Models        | Entidades e objetos do sistema      |
| Data                 | Persistência e acesso ao banco      |

## ✨ Funcionalidades

* Cadastro e login de usuários
* Autenticação utilizando JWT
* Controle de receitas
* Controle de despesas
* Definição de metas financeiras
* Dashboard financeiro
* Relatórios básicos
* Organização por categorias
* Persistência em banco de dados

## 🔒 Segurança

O sistema implementa práticas básicas de segurança, incluindo:

* Criptografia de senhas
* Autenticação via token JWT
* Validação de entrada de dados
* Controle de acesso por usuário

## ⚙️ Como Executar o Projeto

### Pré-requisitos

* .NET SDK 8.0+
* SQL Server
* Visual Studio 2022 ou VS Code

### 1. Clone o repositório

```bash
git clone https://github.com/ohthias/Meu-DinDin.git
```

### 2. Acesse a pasta do projeto

```bash
cd Meu-DinDin
```

### 3. Configure a connection string

No arquivo:

```txt
appsettings.json
```

Configure sua conexão com o SQL Server:

```json
"ConnectionStrings": {
  "DefaultConnection": "Server=SEU_SERVIDOR;Database=MeuDinDin;Trusted_Connection=True;TrustServerCertificate=True;"
}
```

### 4. Execute as migrations

```bash
dotnet ef database update
```

### 5. Execute o projeto

```bash
dotnet run
```

## 📖 Documentação da API

Após iniciar o projeto, a documentação Swagger estará disponível em:

```txt
https://localhost:xxxx/swagger
```

## 🎯 Objetivo Acadêmico

Este projeto foi desenvolvido como atividade universitária com foco em:

* Aplicação prática de engenharia de software
* Desenvolvimento full stack
* Estruturação de sistemas escaláveis
* Integração entre front-end e back-end
* Modelagem de banco de dados
* Experiência do usuário


## 👨‍💻 Autor

Desenvolvido por Matheus Gabriel

* GitHub: [ohthias](https://github.com/ohthias)