# 🌾 AgroMark - Sistema Administrativo-Financeiro

**Disciplina:** ESW424 - Prática de Engenharia de Software (2025/02)  
**Professor:** João Dionisio Paraiba  
**Aluno:** Marques Vinícius Melo Martins

## 📋 Sobre o Projeto

O AgroMark é um sistema de gestão financeira focado no agronegócio, projetado para simplificar a administração de despesas. Sua funcionalidade principal é o processamento inteligente de Notas Fiscais em PDF, utilizando a API do Google Gemini para extrair e categorizar dados automaticamente, otimizando o fluxo de trabalho financeiro.

## 🛠️ Tecnologias Utilizadas

-   **Backend:** Node.js, Express
-   **Frontend:** React, Tailwind CSS
-   **Inteligência Artificial:** Google Gemini 2.5 Flash
-   **Processamento de Arquivos:** Multer (upload), PDF-Parse (extração de texto)
-   **Execução Concorrente:** `concurrently` para o ambiente de desenvolvimento.

## ✨ Funcionalidades Principais

-   **Upload Inteligente:** Interface web para upload de arquivos PDF de Notas Fiscais.
-   **Extração Automática:** Utilização da IA do Gemini para extrair dados essenciais:
    -   **Fornecedor:** Razão social, CNPJ.
    -   **Faturado:** Nome, CPF/CNPJ.
    -   **Nota Fiscal:** Número, série, data de emissão.
    -   **Produtos:** Descrição, quantidade, valores.
    -   **Financeiro:** Valor total e parcelas.
-   **Categorização Automática:** A IA classifica a despesa em categorias pré-definidas (ex: MANUTENÇÃO, INSUMOS).
-   **Visualização Clara:** Exibição dos dados extraídos de forma organizada na interface, com a opção de visualizar o JSON completo.

## 🚀 Rodando o Projeto Localmente

Siga os passos abaixo para configurar e executar o projeto em seu ambiente de desenvolvimento.

### 1. Pré-requisitos

-   [Node.js](https://nodejs.org/) (versão 18 ou superior)
-   [Git](https://git-scm.com/)

### 2. Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/marquesvinicius/agromark.git
cd agromark

# 2. Instale as dependências da raiz, do backend e do frontend
npm install
npm --prefix backend install
npm --prefix frontend install
```

### 3. Configuração do Ambiente

A API do Gemini é essencial para o funcionamento do backend.

1.  Crie um arquivo `.env` dentro da pasta `backend/`:
    ```
    backend/.env
    ```
2.  Adicione sua chave da API do Gemini ao arquivo:
    ```env
    # Chave obtida no Google AI Studio
    GEMINI_API_KEY="SUA_CHAVE_AQUI"

    # Ambiente de desenvolvimento para habilitar CORS local
    NODE_ENV="development"
    ```

### 4. Execução

Execute o seguinte comando a partir da pasta **raiz** do projeto:

```bash
# Inicia o backend (porta 5000) e o frontend (porta 3000) simultaneamente
npm run dev
```

-   **Frontend:** Acesse `http://localhost:3000`
-   **Backend:** Disponível em `http://localhost:5000`

## 📊 Endpoints da API

A API é o coração do projeto. Ela lida com a saúde do sistema, processamento de arquivos e extração de dados.

| Método | Endpoint                | Descrição                                                 |
| :----- | :---------------------- | :-------------------------------------------------------- |
| `POST` | `/api/upload`           | Envia um PDF para extração de dados.                      |
| `GET`  | `/api/health`           | Verifica o status básico da API.                          |
| `GET`  | `/api/readiness-llm`    | Testa a conexão real com a API do Gemini.                 |
| `GET`  | `/api/upload/categories` | Lista as categorias de despesa disponíveis.               |

Para uma visão completa de todos os endpoints, parâmetros e exemplos de resposta, consulte a **[Documentação Completa da API](frontend/public/API_DOCUMENTATION.md)**.

## 📁 Estrutura do Projeto

```
agromark/
├── backend/           # API Node.js + Express
├── frontend/          # Interface React
│   └── public/
│       └── API_DOCUMENTATION.md  # Documentação da API
├── docs/              # Documentação e diagramas do projeto
├── package.json       # Scripts para rodar o projeto
└── README.md          # Este arquivo
```

## 🌐 Deploy

O projeto está configurado para deploy contínuo em plataformas separadas para otimizar a performance.

-   **Frontend (React):** Vercel, para CDN global e performance.
-   **Backend (Node.js):** Render, para um serviço always-on.

As variáveis de ambiente (`GEMINI_API_KEY` no backend) devem ser configuradas diretamente nos dashboards dos respectivos serviços.

-   **Interface:** `https://agromark-esw424.vercel.app`
-   **API:** `https://agromark-backend.onrender.com/api`

## 🔮 Próximas Etapas (Etapa 2)

-   [ ] Cadastro de fornecedores e clientes
-   [ ] Sistema de contas a pagar/receber
-   [ ] Persistência de dados em um banco de dados
-   [ ] Geração de relatórios financeiros
-   [ ] Autenticação de usuários
