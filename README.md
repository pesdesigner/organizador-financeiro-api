# Organizador Financeiro API

API do Organizador Financeiro Pessoal. O frontend fica em um repositório separado e se comunica com esta API por HTTP, seguindo o contrato definido em `openapi.yaml`.

**Versão atual:** 0.1.0  
A versão é mantida no `package.json`.

## Estado atual

- `GET /api/health` verifica a disponibilidade da API e a conexão com o MongoDB.
- Conexão com o MongoDB Atlas usando o driver oficial para Node.js.
- Contrato inicial da API documentado em `openapi.yaml`.
- Autenticação por convite e rotas de contas ainda não implementadas.

## Tecnologias

- Node.js
- TypeScript
- Vercel Functions
- MongoDB Atlas
- MongoDB Node.js Driver
- OpenAPI

## Variáveis de ambiente

A API precisa destas variáveis:

- `MONGODB_URI`: URI de conexão do cluster MongoDB Atlas.
- `MONGODB_DATABASE`: nome do banco, atualmente `organizador_financeiro`.

Configure-as no ambiente **Development** do projeto Vercel para usar com `npx vercel dev`. Não inclua credenciais no README nem versione o arquivo `.env.local`. O `vercel dev` usa as variáveis de Development do projeto. [Documentação da Vercel](https://vercel.com/docs/environment-variables)

## Executar localmente

Requer Node.js, npm e Vercel CLI.

```bash
npm install
npx vercel dev
```