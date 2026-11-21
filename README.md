# Organizador Financeiro API

API do Organizador Financeiro Pessoal. O frontend fica em um repositório separado e se comunica com esta API por HTTP. O contrato está documentado em `openapi.yaml`.

**Versão:** 0.2.0
A versão do projeto é mantida no `package.json`.

## Funcionalidades atuais

- `GET /api/health`: verifica a API e a conexão com o MongoDB Atlas.
- Login, consulta da sessão e logout.
- Cadastro restrito por convite de uso único, válido por sete dias.
- Administração de usuários: listar, ativar e desativar contas.
- Sessões com validade de sete dias; desativar um usuário revoga as sessões dele.
- Senhas armazenadas com hash `scrypt`; tokens de convite e sessão são armazenados como hashes.

O envio de convites por e-mail ainda não está implementado. O admin cria o convite e compartilha o token com o usuário.

As rotas de contas financeiras ainda não foram implementadas.

## Rotas

| Método | Rota | Acesso |
| --- | --- | --- |
| `GET` | `/api/health` | Público |
| `POST` | `/api/auth/login` | Público |
| `GET` | `/api/auth/me` | Sessão autenticada |
| `POST` | `/api/auth/logout` | Sessão autenticada |
| `POST` | `/api/auth/register` | Token de convite válido |
| `POST` | `/api/admin/invites` | Admin |
| `GET` | `/api/admin/users` | Admin |
| `PATCH` | `/api/admin/users` | Admin |

## Tecnologias

- Node.js
- TypeScript
- Vercel Functions
- MongoDB Atlas e MongoDB Node.js Driver
- OpenAPI

## Variáveis de ambiente

A API espera as variáveis:

- `MONGODB_URI`: URI de conexão do cluster MongoDB Atlas.
- `MONGODB_DATABASE`: nome do banco, atualmente `organizador_financeiro`.

Configure-as no ambiente **Development** do projeto Vercel para executar `npx vercel dev`. O arquivo `.env.local` e as credenciais não devem ser enviados ao repositório.

## Executar localmente

Requer Node.js, npm e Vercel CLI.

```bash
npm install
npx vercel dev