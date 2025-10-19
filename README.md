# 🌾 AgroMark - Sistema Administrativo-Financeiro

**Disciplina:** ESW424 - Prática de Engenharia de Software (2025/02)  
**Professor:** João Dionisio Paraiba  
**Aluno:** Marques Vinícius Melo Martins

## 📋 Sobre o Projeto

O AgroMark é um sistema administrativo-financeiro voltado ao agronegócio. Na **Etapa 1** entregamos o fluxo de upload de notas fiscais (PDF) e extração estruturada via Google Gemini. A **Etapa 2** (peso 60%) adiciona persistência relacional com PostgreSQL + Prisma, verificação automática de cadastros e lançamento de movimentos financeiros com parcelas, classificações e controle de status (inativar/reativar).

## 🛠️ Tecnologias Utilizadas

- **Backend:** Node.js, Express, Prisma ORM
- **Banco:** PostgreSQL (Docker/Compose)
- **Frontend:** React (CRA) + Tailwind CSS
- **IA:** Google Gemini 2.5 Flash
- **Outros:** Multer/PDF-Parse (upload NF), Helmet, CORS, Rate limiting
- **Infra Etapa 2:** Dockerfiles (backend/frontend) + docker-compose para backend, frontend e banco

## ✨ Funcionalidades da Etapa 2

- **Upload + Extração (Etapa 1 mantida):** upload do PDF, extração formatada/JSON via Gemini.
- **Verificação em Banco:** botão “Verificar no Banco” consulta Postgres e exibe badges “EXISTE — ID” ou “NÃO EXISTE” para fornecedor, faturado e classificação de despesa.
- **Criação Condicional:** botão “Criar/Atualizar e Lançar” cria cadastros faltantes, registra movimento APAGAR, parcelas e classificações (N:N) em transação Prisma.
- **Soft-delete por status:** Pessoas e classificações possuem `status` (ATIVO/INATIVO). Endpoints PATCH para inativar/reativar.
- **Seeds:** Classificações padrão da Etapa 1 pré-cadastradas.
- **Validações e rate limiting:** Normalização/validação de CPF/CNPJ, retorno 400/409 adequado, proteção em `/api/create/*` e `/api/movimentos`.
- **Dockerização completa:** Containers independentes para Postgres, backend (com `prisma migrate deploy` no start) e frontend (build estático via Nginx).

## 🚀 Setup Local (Desenvolvimento)

### 1. Pré-requisitos

- [Node.js](https://nodejs.org/) 18+
- [PostgreSQL](https://www.postgresql.org/) (local ou dentro do Docker Compose)
- [Git](https://git-scm.com/)

### 2. Instalação

```bash
# Clone o repositório
git clone https://github.com/marquesvinicius/agromark.git
cd agromark

# Instale dependências
npm --prefix backend install
npm --prefix frontend install
```

### 3. Configuração do Ambiente (backend/.env)

Crie `backend/.env` com base em `backend/env.example`:

```env
NODE_ENV=development
PORT=5000

# Ajuste o host conforme sua instalação do Postgres
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/agromark?schema=public
GEMINI_API_KEY=SUA_CHAVE_GEMINI_AQUI
MAX_FILE_SIZE=10485760
```

> **Atenção:** a chave da Gemini **não** deve ser utilizada em health-checks. O endpoint `/api/readiness-llm` é separado, com cache e executado apenas manualmente.

### 4. Banco de Dados (modo dev)

```bash
# Gerar cliente Prisma
dnpm --prefix backend run prisma:generate

# Criar/aplicar migrações (modo dev)
npm --prefix backend run prisma:migrate

# Inserir seeds (classificações de despesa)
npm --prefix backend run prisma:seed
```

### 5. Executar ambiente dev

```bash
npm --prefix backend run dev   # Backend → http://localhost:5000
npm --prefix frontend start    # Frontend → http://localhost:3000
```

### 6. Comandos úteis

- `npm --prefix backend run prisma:migrate` → cria/aplica migrações em dev.
- `npm --prefix backend run prisma:seed` → executa seeds.
- `npm --prefix backend run prisma:generate` → atualiza client após alterar schema.
- `npm --prefix backend run prisma:deploy` → aplica migrações em produção.
- `npx prisma studio --schema backend/prisma/schema.prisma` → abre Prisma Studio.

## 🐳 Ambiente Docker (produção local)

Ideal para correção do professor.

### Passo a passo

1. **Instale Docker Desktop:** <https://www.docker.com/products/docker-desktop/>
2. **Crie `backend/.env`:** copie `backend/env.example`, edite `GEMINI_API_KEY`.
3. **Suba os containers:**

```bash
docker compose up --build
```

4. **Acesse:**
   - Frontend: <http://localhost:3000>
   - Backend/API: <http://localhost:5000/api>

### Serviços no compose

- `postgres`: banco com volume persistente `pgdata` e healthcheck.
- `backend`: Express + Prisma; roda `prisma migrate deploy` automaticamente no start.
- `frontend`: build React servido via Nginx; proxy `/api` para o backend.

### Comandos úteis

- Subir: `docker compose up --build`
- Parar: `docker compose down`
- Parar e remover dados: `docker compose down -v`
- Ver logs: `docker compose logs -f backend`
- Prisma Studio (via container backend):
  ```bash
  docker compose exec backend npx prisma studio
  ```

## 📊 Endpoints REST (Etapa 2)

Todos retornam JSON.

### Verificação agregada

```bash
curl -X POST http://localhost:5000/api/check/all \
  -H "Content-Type: application/json" \
  -d '{
    "fornecedor": {"cnpj":"12.345.678/0001-90","razaoSocial":"IGUAÇU MAQUINAS LTDA"},
    "faturado":   {"cpf":"999.999.999-99","nomeCompleto":"BELTRANO DA SILVA"},
    "classificacaoDespesa":"MANUTENÇÃO E OPERAÇÃO",
    "numeroNota":"000123456","dataEmissao":"2025-01-15",
    "parcelas":[{"dataVencimento":"2025-02-15","valor":1250.00}],
    "valorTotal":1250.00,
    "itensDescricao":["Óleo diesel"]
  }'
```

### Demais endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/check/fornecedor` | Verifica fornecedor por CNPJ |
| POST | `/api/check/faturado` | Verifica faturado por CPF/CNPJ |
| POST | `/api/check/despesa` | Verifica classificação de despesa |
| POST | `/api/create/necessary` | Cria fornecedor/faturado/classificação se não existirem |
| POST | `/api/movimentos` | Cria movimento, parcelas e vínculos N:N (transação Prisma) |
| PATCH | `/api/pessoas/:id/inativar` | Marca pessoa como INATIVA |
| PATCH | `/api/pessoas/:id/reativar` | Marca pessoa como ATIVA |
| PATCH | `/api/classificacoes/:id/inativar` | Inativa classificação |
| PATCH | `/api/classificacoes/:id/reativar` | Reativa classificação |
| GET | `/api/upload/categories` | Lista classificações de despesa ativas |
| GET | `/api/health` | Health check leve (sem IA) |
| GET | `/api/readiness-llm` | Teste manual/cacheado da LLM |

## 🧱 Modelo de Dados (Prisma)

- `Pessoa`: tipos FORNECEDOR/FATURADO/CLIENTE; documento único por tipo; status ATIVO/INATIVO.
- `Classificacao`: tipos DESPESA/RECEITA; descrição única por tipo; status.
- `MovimentoContas`: tipo APAGAR/ARECEBER (usamos APAGAR); ligação com fornecedor/faturado; valor total; status; N:N com classificações.
- `ParcelaContas`: 1..N parcelas por movimento; identificação única (`numeroNF-parcela-NN`); controle de saldo e status da parcela.
- `MovimentoClassificacao`: tabela de junção (N:N) com chave composta.

Seeds inserem as classificações utilizadas na Etapa 1.

## 🖥️ Interface (Etapa 2)

- Layout da Etapa 1 mantido.
- Novos botões:
  - **Verificar no Banco:** chama `/api/check/all` e exibe badges “EXISTE — ID” ou “NÃO EXISTE”.
  - **Criar/Atualizar e Lançar:** chama `/api/create/necessary` seguido de `/api/movimentos`; exibe toast verde “Registro lançado com sucesso (Movimento #ID)”.
- Fallbacks para campos ausentes: UI orienta revisar JSON antes de lançar.

## ✅ Checklist de Aceitação

- [x] `npm run dev` continua funcional (upload + extração).
- [x] `/api/check/all` retorna EXISTE/NÃO EXISTE com IDs.
- [x] `/api/create/necessary` cria cadastros ausentes.
- [x] `/api/movimentos` registra movimento + parcelas + classificações em transação.
- [x] PATCH (inativar/reativar) funcionando.
- [x] Seeds aplicados.
- [x] Health sem IA; readiness LLM separado/cacheado.
- [x] UI mostra blocos exigidos + toast de sucesso.
- [x] `docker compose up --build` sobe Postgres + Backend + Front.

## 🗃️ Estrutura

```
agromark/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.js
│   ├── routes/
│   │   ├── check.js
│   │   ├── create.js
│   │   ├── movimentos.js
│   │   ├── pessoas.js
│   │   └── classificacoes.js
│   ├── utils/
│   │   ├── documentUtils.js
│   │   └── prismaClient.js
│   ├── middleware/rateLimiter.js
│   ├── config.js
│   ├── server.js
│   └── env.example
├── frontend/
│   ├── src/components/ResultsDisplay.js
│   ├── src/services/apiService.js
│   ├── Dockerfile
│   ├── nginx.conf
│   └── ...
├── docker-compose.yml
├── README.md
└── docs/
```

## 🌐 Deploy

- **Frontend (React):** Vercel → <https://agromark-esw424.vercel.app>
- **Backend (Node.js):** Render → <https://agromark-backend.onrender.com/api>

Configure `GEMINI_API_KEY`, `DATABASE_URL` e afins nas plataformas de deploy.

## 🙌 Créditos

Projeto acadêmico de **Marques Vinícius Melo Martins** para ESW424 – Prática de Engenharia de Software.
