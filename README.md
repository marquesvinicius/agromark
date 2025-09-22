# 🌾 AgroMark - Sistema Administrativo-Financeiro

**Disciplina:** ESW424 - Prática de Engenharia de Software (2025/02)  
**Professor:** João Dionisio Paraiba  
**Aluno:** Marques Vinícius Melo Martins

## 📋 Sobre o Projeto

Sistema para processamento de Notas Fiscais em PDF utilizando IA (Gemini API) para extração automática de dados financeiros e administrativos.

### 🎯 Etapa 1 - Processador de PDF de Nota Fiscal
- ✅ Upload de PDF via interface web
- ✅ Extração de dados via Gemini API
- ✅ Visualização formatada e JSON dos dados
- ✅ Interface React moderna e responsiva

## 🛠️ Tecnologias

- **Backend:** Node.js + Express
- **Frontend:** React
- **IA:** Google Gemini API
- **Upload:** Multer
- **PDF:** PDF-Parse

## 🚀 Deploy na Vercel

### **🌐 Deploy em Produção**
Este projeto está configurado para **deploy separado**:

**Frontend (Vercel):**
```bash
# 1. Subir para GitHub
git init
git add .
git commit -m "feat: Implementação ESW424 Etapa 1"
git push origin main

# 2. Deploy na Vercel
# Conecte repositório → Configure REACT_APP_API_URL → Deploy
```

**Backend (Render):**
```bash
# 1. Mesmo repositório GitHub
# 2. Deploy no Render
# Configure GEMINI_API_KEY no dashboard → Deploy
```

### **⚡ Arquitetura de Deploy**
- ✅ **Frontend:** React na Vercel (CDN Global)
- ✅ **Backend:** Node.js no Render (Always-on)
- ✅ **Variáveis de ambiente** via dashboards
- ✅ **CORS configurado** para comunicação

### **🔗 URLs de Produção**
- **Interface:** `https://agromark-esw424.vercel.app`
- **API:** `https://agromark-backend.onrender.com/api`
- **Docs:** `https://agromark-backend.onrender.com/api/docs`

## 📁 Estrutura do Projeto

```
agromark/
├── backend/           # API Node.js + Express
├── frontend/          # Interface React
├── docs/             # Documentação e diagramas
├── package.json      # Scripts principais
└── README.md         # Este arquivo
```

## 🎯 Funcionalidades da Etapa 1

### Campos Extraídos da Nota Fiscal:
- **Fornecedor:** Razão social, fantasia, CNPJ
- **Faturado:** Nome completo, CPF
- **Nota Fiscal:** Número e data de emissão
- **Produtos:** Descrição dos itens
- **Financeiro:** Parcelas, vencimento, valor total
- **Classificação:** Categoria da despesa (via IA)

### Categorias de Despesa:
- MANUTENÇÃO E OPERAÇÃO
- INFRAESTRUTURA E UTILIDADES
- INSUMOS AGRÍCOLAS
- RECURSOS HUMANOS
- SERVIÇOS OPERACIONAIS

## 📊 Endpoints da API

- `POST /api/upload` - Upload e processamento de PDF
- `GET /api/health` - Status da aplicação

## 🔮 Próximas Etapas (Etapa 2)

- Cadastro de fornecedores e clientes
- Sistema de contas a pagar/receber
- Múltiplas parcelas e categorias
- Banco de dados persistente
- Relatórios financeiros

---

**Entrega Etapa 1:** 24/09/2025 (40% da nota)  
**Entrega Etapa 2:** 22/10/2025 (60% da nota)
