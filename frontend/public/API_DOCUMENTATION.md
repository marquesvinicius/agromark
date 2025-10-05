# Documentação da API - AgroMark

Esta documentação detalha os endpoints disponíveis na API do projeto AgroMark, responsável pelo processamento de Notas Fiscais.

**URL Base:** `http://localhost:5000/api` (Desenvolvimento) ou `https://agromark-backend.onrender.com/api` (Produção)

---

## 1. Endpoints de Saúde e Status (`/health`)

Utilizados para monitorar a saúde da aplicação e seus serviços.

### **GET** `/api/health`

Verifica o status básico da API e a presença da chave do Gemini.

-   **Resposta de Sucesso (200 OK):**
    ```json
    {
      "status": "ok",
      "timestamp": "2025-10-05T20:00:00.000Z",
      "uptime": 120.5,
      "services": {
        "api": "ok",
        "geminiApiKey": "present"
      }
    }
    ```

### **GET** `/api/health/detailed`

Fornece uma visão detalhada do status do sistema, incluindo uso de memória e ambiente.

-   **Resposta de Sucesso (200 OK):**
    ```json
    {
      "status": "ok",
      "timestamp": "2025-10-05T20:00:00.000Z",
      "uptime": 120.5,
      "services": {
        "api": "ok",
        "geminiApiKey": "present"
      },
      "memory": {
        "rss": "50 MB",
        "heapTotal": "35 MB",
        "heapUsed": "25 MB",
        "external": "5 MB"
      },
      "environment": "development",
      "nodeVersion": "v18.18.0"
    }
    ```

### **GET** `/api/readiness-llm`

Testa a conexão real com a API do Gemini. Este endpoint utiliza cache para evitar chamadas excessivas.

-   **Resposta de Sucesso (200 OK):**
    ```json
    {
        "connected": true,
        "response": "CONECTADO",
        "timestamp": "2025-10-05T20:00:00.000Z",
        "fromCache": false
    }
    ```

---

## 2. Endpoints de Upload e Processamento (`/upload`)

O coração da aplicação, responsável por receber, processar e extrair dados dos PDFs.

### **POST** `/api/upload`

Envia um arquivo PDF de Nota Fiscal para processamento. A requisição deve ser do tipo `multipart/form-data`.

-   **Parâmetros:**
    -   `pdf`: O arquivo PDF a ser processado (Body -> form-data).
-   **Regras:**
    -   Apenas um arquivo por vez.
    -   Tamanho máximo: 10MB.
    -   Deve ser um arquivo `.pdf` válido.

-   **Resposta de Sucesso (200 OK):**
    *O objeto retornado contém todos os dados extraídos da Nota Fiscal.*
    ```json
    {
      "success": true,
      "message": "PDF processado com sucesso",
      "data": {
        "fornecedor": { "razaoSocial": "...", "cnpj": "..." },
        "faturado": { "nome": "...", "cpf": "..." },
        "notaFiscal": { "numero": "...", "dataEmissao": "..." },
        "produtos": [ { "descricao": "...", "quantidade": 1, "valorTotal": 123.45 } ],
        "financeiro": { "valorTotal": 123.45, "parcelas": [] },
        "classificacao": { "categoria": "...", "observacoes": "..." },
        "metadata": { "fileName": "nota.pdf", "fileSize": 54321 }
      }
    }
    ```

-   **Resposta de Erro (400 Bad Request - Arquivo Inválido):**
    ```json
    {
      "success": false,
      "message": "Nenhum arquivo PDF foi enviado",
      "error": "NO_FILE_UPLOADED"
    }
    ```

-   **Resposta de Erro (502 Bad Gateway - Falha na IA):**
    ```json
    {
      "success": false,
      "message": "Erro na extração de dados via IA",
      "error": "GEMINI_ERROR"
    }
    ```

### **GET** `/api/upload/categories`

Retorna a lista de categorias de despesa pré-definidas no sistema.

-   **Resposta de Sucesso (200 OK):**
    ```json
    {
        "success": true,
        "message": "Categorias de despesa disponíveis",
        "data": {
            "categories": [
                "MANUTENÇÃO E OPERAÇÃO",
                "INFRAESTRUTURA E UTILIDADES",
                "INSUMOS AGRÍCOLAS",
                "RECURSOS HUMANOS",
                "SERVIÇOS OPERACIONAIS",
                "COMBUSTÍVEIS E LUBRIFICANTES",
                "EQUIPAMENTOS E FERRAMENTAS",
                "OUTROS"
            ],
            "count": 8
        }
    }
    ```

### **GET** `/api/upload/test`

Endpoint de diagnóstico que verifica a configuração de upload e a conexão com o Gemini.

-   **Resposta de Sucesso (200 OK):**
    ```json
    {
      "success": true,
      "message": "Configurações de upload testadas",
      "data": {
        "uploadConfig": {
          "maxFileSize": "10MB",
          "allowedTypes": ["pdf"],
          "uploadDir": "./uploads",
          "dirExists": true
        },
        "geminiStatus": {
          "connected": true,
          "response": "CONECTADO"
        }
      }
    }
    ```

---

## 3. Endpoint de Documentação (`/docs`)

### **GET** `/api/docs`

Retorna um JSON que descreve os principais endpoints da API (uma versão simplificada desta documentação).

-   **Resposta de Sucesso (200 OK):**
    ```json
    {
      "title": "AgroMark API Documentation",
      "version": "1.0.0",
      "endpoints": [
        {
          "method": "GET",
          "path": "/api/health",
          "description": "Verifica status da aplicação e conexão com Gemini API"
        },
        {
          "method": "POST",
          "path": "/api/upload",
          "description": "Upload e processamento de PDF de Nota Fiscal"
        }
      ]
    }
    ```
