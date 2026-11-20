# Organizador Financeiro API

API do Organizador Financeiro Pessoal. O frontend está em um repositório separado e se comunica com esta API por HTTP, usando o contrato descrito em `openapi.yaml`.

## Estado atual

- Função `GET /api/health` para verificar a disponibilidade da API.
- OpenAPI inicial documentando essa rota.
- Sem conexão com banco de dados ou autenticação nesta etapa.

## Tecnologias

- Node.js
- TypeScript
- Vercel Functions
- OpenAPI

## Executar localmente

Requer Node.js, npm e Vercel CLI.

```bash
npm install
npx vercel dev