/**
 * Serviço Gemini API - AgroMark ESW424
 * Integração com Google Gemini para extração de dados de Nota Fiscal e Agente RAG
 */

const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, TaskType } = require('@google/generative-ai');
const config = require('../config');
const prisma = require('../utils/prismaClient');

class Agent01 {
  constructor() {
    this.genAI = new GoogleGenerativeAI(config.geminiApiKey);

    const safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
    ];

    this.model = this.genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash", // Corrigido: Revertido para o modelo que estava funcionando
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 0.8,
        maxOutputTokens: 8192,
      },
      safetySettings,
    });
    
    // Novo: Modelo específico para embeddings
    this.embeddingModel = this.genAI.getGenerativeModel({ model: "text-embedding-004" });

    // Novo: Cache para os vetores de embeddings
    this.vectorCache = {
      embeddings: [],
      documents: [],
      timestamp: 0,
      cacheDuration: 5 * 60 * 1000, // 5 minutos
    };
    
    // Cache para evitar múltiplas chamadas desnecessárias
    this.connectionCache = {
      result: null,
      lastCheck: 0,
      cacheDuration: 3 * 60 * 1000 // 3 minutos
    };
    
    this.schemaPrisma = `
      datasource db {
        provider = "postgresql"
        url      = env("DATABASE_URL")
      }

      model Pessoa {
        id           Int            @id @default(autoincrement())
        tipo         PessoaTipo
        razaoSocial  String
        fantasia     String?
        documento    String
        status       StatusRegistro @default(ATIVO)
        criadoEm     DateTime       @default(now())
        atualizadoEm DateTime       @updatedAt
        fornecedorMovimentos MovimentoContas[] @relation("FornecedorMovimentos")
        faturadoMovimentos   MovimentoContas[] @relation("FaturadoMovimentos")
      }

      model Classificacao {
        id           Int                @id @default(autoincrement())
        tipo         ClassificacaoTipo
        descricao    String
        status       StatusRegistro     @default(ATIVO)
        movimentos   MovimentoClassificacao[]
      }

      model MovimentoContas {
        id              Int                     @id @default(autoincrement())
        tipo            MovimentoTipo           @default(APAGAR)
        numeroNotaFiscal String
        dataEmissao     DateTime
        descricao       String?
        valorTotal      Decimal                 @db.Decimal(14, 2)
        fornecedorId Int
        faturadoId   Int
        fornecedor   Pessoa                  @relation("FornecedorMovimentos", fields: [fornecedorId], references: [id])
        faturado     Pessoa                  @relation("FaturadoMovimentos", fields: [faturadoId], references: [id])
        parcelas     ParcelaContas[]
        classificacoes MovimentoClassificacao[]
      }

      model ParcelaContas {
        id             Int            @id @default(autoincrement())
        identificacao  String
        dataVencimento DateTime
        valorParcela   Decimal        @db.Decimal(14, 2)
        valorSaldo     Decimal        @db.Decimal(14, 2)
        statusParcela  StatusParcela  @default(ABERTA)
        movimentoId Int
        movimento   MovimentoContas @relation(fields: [movimentoId], references: [id])
      }

      model MovimentoClassificacao {
        movimentoId    Int
        classificacaoId Int
        movimento     MovimentoContas @relation(fields: [movimentoId], references: [id])
        classificacao Classificacao   @relation(fields: [classificacaoId], references: [id])
        @@id([movimentoId, classificacaoId])
      }

      enum PessoaTipo { FORNECEDOR, FATURADO, CLIENTE }
      enum StatusRegistro { ATIVO, INATIVO }
      enum ClassificacaoTipo { DESPESA, RECEITA }
      enum MovimentoTipo { APAGAR, ARECEBER }
      enum StatusParcela { ABERTA, PAGA, CANCELADA }
    `;
  }

  // NOVO: Função para calcular similaridade de cosseno entre dois vetores
  cosineSimilarity(vecA, vecB) {
    let dotProduct = 0.0;
    let normA = 0.0;
    let normB = 0.0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // NOVO: Função para popular e atualizar o cache de vetores
  async updateVectorCache(force = false) {
    const now = Date.now();
    const cacheValid = (now - this.vectorCache.timestamp) < this.vectorCache.cacheDuration;
    if (cacheValid && !force) {
      console.log('[RAG-Embed] Usando cache de vetores existente.');
      return;
    }

    console.log('[RAG-Embed] Cache de vetores expirado ou forçado. Atualizando...');
    
    // 1. Buscar dados textuais do banco
    const movimentos = await prisma.movimentoContas.findMany({
      include: {
        fornecedor: true,
        classificacoes: { include: { classificacao: true } },
      },
    });

    if (movimentos.length === 0) {
        console.log('[RAG-Embed] Nenhum movimento encontrado para gerar embeddings.');
        this.vectorCache = { embeddings: [], documents: [], timestamp: now, cacheDuration: this.vectorCache.cacheDuration };
        return;
    }

    // 2. Criar documentos textuais descritivos
    const documents = movimentos.map(mov => {
      const classificacaoDesc = mov.classificacoes.map(c => c.classificacao.descricao).join(', ');
      return {
        id: mov.id,
        content: `Nota fiscal número ${mov.numeroNotaFiscal} do fornecedor ${mov.fornecedor.razaoSocial} com descrição "${mov.descricao || 'não especificada'}" classificada como "${classificacaoDesc}" no valor de R$${mov.valorTotal}.`
      };
    });

    // 3. Gerar embeddings em lote
    const contents = documents.map(d => d.content);
    const requests = contents.map(content => ({
        content: { parts: [{ text: content }] },
        taskType: TaskType.RETRIEVAL_DOCUMENT
    }));
    
    const result = await this.embeddingModel.batchEmbedContents({ requests });
    const embeddings = result.embeddings.map(e => e.values);

    this.vectorCache = {
        embeddings,
        documents,
        timestamp: now,
        cacheDuration: this.vectorCache.cacheDuration,
    };
    console.log(`[RAG-Embed] Cache atualizado com ${documents.length} documentos.`);
  }

  /**
   * Testa conexão com Gemini API (com cache para evitar quota)
   */
  async testConnection(forceNew = false) {
    const now = Date.now();
    const cacheValid = (now - this.connectionCache.lastCheck) < this.connectionCache.cacheDuration;
    
    // Usar cache se válido e não forçado
    if (cacheValid && !forceNew && this.connectionCache.result) {
      console.log('📋 Usando resultado de conexão Gemini em cache');
      return {
        ...this.connectionCache.result,
        fromCache: true
      };
    }
    
    try {
      console.log('🔍 Testando nova conexão com Gemini API...');
      const result = await this.model.generateContent("Teste de conexão. Responda apenas: CONECTADO");
      const response = await result.response;
      const text = response.text();
      
      const connectionResult = {
        connected: text.includes('CONECTADO'),
        response: text.trim(),
        timestamp: new Date().toISOString(),
        fromCache: false
      };
      
      // Atualizar cache
      this.connectionCache.result = connectionResult;
      this.connectionCache.lastCheck = now;
      
      console.log(`✅ Conexão Gemini testada: ${connectionResult.connected ? 'OK' : 'FALHA'}`);
      return connectionResult;
      
    } catch (error) {
      const errorResult = {
        connected: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        fromCache: false
      };
      
      // Atualizar cache com erro
      this.connectionCache.result = errorResult;
      this.connectionCache.lastCheck = now;
      
      console.warn('⚠️ Erro no teste de conexão Gemini:', error.message);
      return errorResult;
    }
  }

  /**
   * Extrai dados estruturados de uma Nota Fiscal
   * @param {string} pdfText - Texto extraído do PDF
   * @returns {Object} Dados estruturados da nota fiscal
   */
  async extractInvoiceData(pdfText) {
    try {
      const prompt = this.buildExtractionPrompt(pdfText);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      
      let responseText = response.text();
      
      // Limpar e parsear JSON
      responseText = this.cleanJsonResponse(responseText);
      
      try {
        const extractedData = JSON.parse(responseText);
        
        // Validar e enriquecer dados, aplicando fallbacks se necessário
        const validatedData = this.validateAndEnrichData(extractedData, pdfText);
        
        return validatedData;
        
      } catch (parseError) {
        console.error('❌ Erro ao parsear JSON:', parseError);
        throw new Error(`Gemini retornou dados inválidos: ${parseError.message}`);
      }
      
    } catch (error) {
      console.error('❌ Erro na extração Gemini:', error);
      throw new Error(`Erro na extração via Gemini API: ${error.message}`);
    }
  }

  /**
   * Responde a uma pergunta do usuário sobre os dados do banco.
   * @param {string} userQuery - A pergunta do usuário.
   * @param {Array<Object>} conversationHistory - O histórico da conversa.
   * @returns {string} A resposta em linguagem natural.
   */
  async answerQuery(userQuery, conversationHistory = []) {
    try {
      // Passo 1: O Agente decide qual ferramenta usar.
      const decisionPrompt = this.buildDecisionPrompt(userQuery, conversationHistory);
      const decisionResult = await this.model.generateContent(decisionPrompt);
      const decision = (await decisionResult.response).text().trim();

      if (decision.includes('[SQL]')) {
        console.log('[RAG] Ação: Gerar e Executar SQL.');
        
        // Passo 2: Se a decisão for SQL, usamos o prompt especialista para gerar a query.
        const sqlQuery = await this.generateSqlFromQuery(userQuery);

        if (!sqlQuery || sqlQuery.toUpperCase().includes("NÃO CONSIGO RESPONDER")) {
           throw new Error("Não foi possível gerar uma consulta SQL para esta pergunta.");
        }
        console.log(`[RAG] Consulta SQL gerada: ${sqlQuery}`);
        
        const queryResult = await this.executeSql(sqlQuery);
        console.log('[RAG] Gerando resposta final com base nos resultados.');
        const finalAnswer = await this.generateNaturalLanguageResponse(userQuery, queryResult, conversationHistory);
        return finalAnswer;

      } else if (decision.includes('[BUSCA_SEMANTICA]')) {
        console.log('[RAG] Ação: Busca Semântica.');
        // ... (a lógica de busca semântica permanece a mesma)
        await this.updateVectorCache();

        if (this.vectorCache.documents.length === 0) {
            return "Ainda não há dados suficientes para realizar uma busca. Por favor, adicione alguns lançamentos primeiro.";
        }

        const queryEmbeddingResult = await this.embeddingModel.embedContent({
            content: { parts: [{ text: userQuery }] },
            taskType: TaskType.RETRIEVAL_QUERY
        });
        const queryEmbedding = queryEmbeddingResult.embedding.values;

        const similarities = this.vectorCache.embeddings.map((docEmbedding, i) => ({
            index: i,
            similarity: this.cosineSimilarity(queryEmbedding, docEmbedding),
        }));

        similarities.sort((a, b) => b.similarity - a.similarity);
        const topK = similarities.slice(0, 3);
        
        const contextDocuments = topK.map(s => this.vectorCache.documents[s.index].content);

        console.log('[RAG-Embed] Gerando resposta com contexto de embeddings.');
        const finalAnswer = await this.generateNaturalLanguageResponse(userQuery, contextDocuments, conversationHistory);
        return finalAnswer;
      
      } else {
        console.log('[RAG] Ação: Responder diretamente (a decisão foi a própria resposta).');
        return decision; // A resposta do LLM foi a decisão final.
      }

    } catch (error) {
      console.error('❌ Erro no processo de RAG:', error);
      if (error.message.includes("Não foi possível gerar uma consulta SQL")) {
        return error.message;
      }
      return `Ocorreu um erro ao processar sua pergunta: ${error.message}`;
    }
  }

  /**
   * Constrói o prompt de DECISÃO.
   */
  buildDecisionPrompt(userQuery, conversationHistory) {
    const historyString = conversationHistory.map(msg => `${msg.sender === 'user' ? 'Usuário' : 'Assistente'}: ${msg.text}`).join('\n');

    return `
      Você é o Mark, o mascote inteligente do sistema AgroMark. Sua personalidade é curiosa, paciente e um pouco nerd, e você usa analogias agrícolas.
      Seu tom de voz é didático e amistoso.

      Você tem três ferramentas:
      1.  **[SQL]**: Para perguntas que exigem CÁLCULOS ou DADOS EXATOS do banco (soma, contagem, média, etc.).
      2.  **[BUSCA_SEMANTICA]**: Para perguntas ABERTAS ou DESCRITIVAS (Ex: "fale sobre...", "encontre notas relacionadas a...").
      3.  **[RESPOSTA_DIRETA]**: Para saudações, conversas ou perguntas de ACOMPANHAMENTO que podem ser respondidas com o histórico.

      **HISTÓRICO DA CONVERSA:**
      ${historyString}

      **PERGUNTA ATUAL DO USUÁRIO:**
      "${userQuery}"

      **INSTRUÇÕES:**
      1.  Analise a pergunta atual no contexto do histórico.
      2.  **DECIDA A AÇÃO:**
          *   Se for um cálculo ou busca por dados exatos -> Responda APENAS com a tag: [SQL]
          *   Se for uma busca por descrição ou conceito -> Responda APENAS com a tag: [BUSCA_SEMANTICA]
          *   Se for uma saudação ou um cálculo simples baseado no histórico (Ex: "divida esse valor por 12") -> Responda DIRETAMENTE, no tom do Mark.

      **SUA RESPOSTA:**
    `;
  }

  /**
   * Constrói o prompt especialista em GERAR SQL.
   */
  async generateSqlFromQuery(userQuery) {
    const prompt = `
      Sua única tarefa é gerar uma consulta PostgreSQL válida para responder à pergunta do usuário, usando o schema fornecido.

      **Schema do Prisma (Use para nomes de colunas):**
      ${this.schemaPrisma}

      **REGRA MAIS IMPORTANTE:** Use SEMPRE os nomes de tabela em snake_case do mapeamento (ex: \`movimento_contas\`). NUNCA use os nomes de modelo em PascalCase do schema (ex: \`MovimentoContas\`).
      
      **Mapeamento OBRIGATÓRIO (Modelo -> Tabela SQL):**
      - MovimentoContas -> \`movimento_contas\`
      - ParcelaContas -> \`parcela_contas\`
      - Pessoa -> \`pessoa\`
      - Classificacao -> \`classificacao\`
      - MovimentoClassificacao -> \`movimento_classificacao\`

      **Outras Regras:**
      1. Gere APENAS a consulta SQL, sem explicações ou markdown.
      2. Coloque nomes de colunas camelCase entre aspas duplas (ex: "valorTotal").
      3. Para status, use os valores do Enum. Para 'parcelas em aberto', a condição é \`WHERE "statusParcela" = 'ABERTA'\`.
      4. Se não puder responder, retorne "NÃO CONSIGO RESPONDER".

      **EXEMPLO:**
      - **Pergunta:** "Quantos fornecedores existem?"
      - **SQL Gerado:** SELECT COUNT(*) FROM pessoa WHERE tipo = 'FORNECEDOR';

      **Pergunta do Usuário:**
      "${userQuery}"

      **SQL Gerado:**
    `;

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    let sql = response.text().trim();

    sql = sql.replace(/```sql/g, '').replace(/```/g, '').trim();
    if (!sql.endsWith(';')) {
      sql += ';';
    }

    return sql;
  }

  /**
   * Executa uma consulta SQL bruta no banco de dados.
   * @param {string} sqlQuery
   * @returns {Array<Object>} O resultado da consulta.
   */
  async executeSql(sqlQuery) {
    try {
      const result = await prisma.$queryRawUnsafe(sqlQuery);
      return result;
    } catch (error) {
      console.error("❌ Erro ao executar a consulta SQL:", error);
      throw new Error(`A consulta SQL falhou: "${error.message}"`);
    }
  }

  /**
   * Gera uma resposta final em linguagem natural.
   * @param {string} originalQuery
   * @param {Array<Object>} queryResult
   * @param {Array<Object>} conversationHistory
   * @returns {string} A resposta final.
   */
  async generateNaturalLanguageResponse(originalQuery, contextData, conversationHistory = []) {
      // O Prisma retorna BigInt para agregações como COUNT, que não pode ser serializado por JSON.stringify.
      // Esta função converte qualquer BigInt para String antes de serializar.
      const cleanedResult = JSON.parse(JSON.stringify(contextData, (key, value) =>
        typeof value === 'bigint'
            ? value.toString()
            : value
      ));
      const historyString = conversationHistory.map(msg => `${msg.sender === 'user' ? 'Usuário' : 'Assistente'}: ${msg.text}`).join('\n');

      const prompt = `
        Você é o Mark, o mascote inteligente do sistema AgroMark. Sua personalidade é curiosa, paciente, um pouco nerd e você adora analogias agrícolas.
        Seu tom de voz é didático, amistoso e direto.

        Sua tarefa é fornecer uma resposta clara e concisa em português para a pergunta original do usuário, com base no histórico da conversa e nos dados que foram consultados no banco de dados.

        **HISTÓRICO DA CONVERSA:**
        ${historyString}

        **PERGUNTA ORIGINAL DO USUÁRIO:**
        "${originalQuery}"

        **CONTEXTO (dados da sua "colheita" no banco):**
        ${JSON.stringify(cleanedResult, null, 2)}

        **Instruções para a Resposta:**
        1.  **Baseie sua resposta ESTRITAMENTE no CONTEXTO fornecido.** Não invente informações.
        2.  Incorpore a personalidade do Mark...
        3.  Formule uma resposta direta e clara. Não mencione SQL ou JSON. Aja como se você mesmo tivesse encontrado a informação.
        4.  Seja conciso e útil. Use negrito com asteriscos duplos (\`**texto**\`) para destacar informações importantes.
        5.  Responda sempre em português (Brasil).

        **Resposta do Mark:**
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
  }


  /**
   * Constrói prompt otimizado para extração de dados
   */
  buildExtractionPrompt(pdfText) {
    const prompt = `
Você é um especialista em análise de documentos fiscais. Analise o texto da Nota Fiscal abaixo e extraia APENAS as informações solicitadas, retornando um JSON válido.

TEXTO DA NOTA FISCAL:
${pdfText}

INSTRUÇÕES OBRIGATÓRIAS:
1. O CNPJ do Fornecedor (Emitente) é OBRIGATÓRIO. Ele fica SEMPRE no cabeçalho/topo do documento, associado à empresa que EMITIU a nota. NÃO CONFUNDA com o CNPJ do Destinatário/Faturado. O CNPJ do Fornecedor é o que está mais acima no documento. Exemplo: "08.172.731/0001-26". Extraia apenas os números.
2. O Faturado (comprador/Destinatário) DEVE ter um CPF (11 dígitos) OU um CNPJ (14 dígitos). Extraia um dos dois. É um campo obrigatório. Procure na seção de destinatário.
3. Extraia apenas informações que estão claramente presentes no texto.
4. Para valores monetários, use apenas números (sem símbolos), com ponto como separador decimal.
5. Para datas, use formato YYYY-MM-DD.
6. Para CNPJ/CPF, retorne APENAS os números, sem formatação.

INSTRUÇÕES DETALHADAS PARA EXTRAÇÃO DE PRODUTOS:

A extração de produtos é a tarefa mais difícil. Para cada item na seção 'DADOS DOS PRODUTOS/SERVIÇOS', você deve agir como um detetive. Sua missão é encontrar 3 números específicos em uma linha de texto confusa.

**SEU PROCESSO MENTAL PARA CADA ITEM:**

1.  **'Qual é a linha do crime?'**: Isole a linha de texto completa do produto.
    *   *Exemplo*: '"60138651 TUBO RED. O25,0X 6,0- 50 NL G. 84329000 020 5949 PC 2 48,86 97,72 28,80 5,47 0,00 19,00 0,00"'

2.  **'Liste todos os suspeitos'**: Liste todos os números decimais e inteiros na linha, ignorando códigos longos como NCM (ex: 84329000) ou CST (ex: 020).

3.  **'Teste as combinações'**: Teste combinações de 3 números da lista até encontrar um trio onde um inteiro pequeno (A) * um decimal (B) = outro decimal (C). Teste sistematicamente para não perder nenhum.
    *   *Raciocínio para o exemplo*: "Números: 2, 48.86, 97.72, 28.80, 5.47, 19.00, 0.00. Teste 1: 2 * 48.86 = 97.72 (sim!). Ignoro os outros porque não formam um trio similar."

4.  **'Quem fez o quê?'**: Identifique o papel de cada número no trio.
    *   'quantidade': É o inteiro pequeno (A, ex: '2').
    *   'valorUnitario': É o multiplicador decimal (B, ex: '48.86').
    *   'valorTotal': É o resultado (C, ex: '97.72').

**EXEMPLOS REAIS DE EXTRAÇÃO CORRETA:**
- Linha: "60138665 KIT CABO ACO E FIXACOES 73269090 000 5949 PC 2 376,33 752,66 752,66 143,01 0,00 19,00 0,00"
  - Trio: 2 * 376.33 = 752.66
  - Extração: quantidade=2, valorUnitario=376.33, valorTotal=752.66
- Linha: "60143720 PS 12 X 80 DIN 931 10.9 ZLUZ 73181500 020 5949 PC 2 493,40 986,80 571,31 108,55 0,00 19,00 0,00"
  - Trio: 2 * 493.40 = 986.80
  - Extração: quantidade=2, valorUnitario=493.40, valorTotal=986.80

**NÃO SEJA ENGANADO!** A IA às vezes assume que a quantidade é '1' e repete o valor total. ISSO ESTÁ ERRADO. Você **DEVE** encontrar o trio que se multiplica corretamente. Se você não encontrar um trio que funcione, a extração falhou para aquele item, mas você deve tentar para todos os itens.

Aplique este processo mental para CADA item da nota.

INSTRUÇÕES PARA CLASSIFICAÇÃO DE DESPESA:
- Classifique a despesa baseada no conteúdo dos produtos/serviços.

CATEGORIAS DE DESPESA DISPONÍVEIS:
${config.despesaCategorias.map(cat => `- ${cat}`).join('\n')}

RETORNE APENAS O JSON NO FORMATO EXATO:
{
  "fornecedor": {
    "razaoSocial": "string ou null",
    "nomeFantasia": "string ou null", 
    "cnpj": "string (OBRIGATÓRIO, 14 números)",
    "endereco": "string ou null",
    "telefone": "string ou null"
  },
  "faturado": {
    "nome": "string ou null",
    "cpf": "string (11 números) ou null",
    "cnpj": "string (14 números) ou null",
    "endereco": "string ou null"
  },
  "notaFiscal": {
    "numero": "string ou null",
    "serie": "string ou null", 
    "dataEmissao": "YYYY-MM-DD ou null",
    "chaveAcesso": "string ou null"
  },
  "produtos": [
    {
      "descricao": "string",
      "quantidade": "number ou null",
      "valorUnitario": "number (corrigido, ex: 1234.56) ou null",
      "valorTotal": "number (corrigido, ex: 1234.56) ou null"
    }
  ],
  "financeiro": {
    "valorTotal": "number (corrigido, ex: 1234.56) ou null",
    "parcelas": [
      {
        "numero": 1,
        "dataVencimento": "YYYY-MM-DD ou null",
        "valor": "number (corrigido, ex: 1234.56) ou null"
      }
    ]
  },
  "classificacao": {
    "categoria": "uma das categorias listadas acima",
    "observacoes": "string explicando a classificação ou null"
  }
}
`;
    return prompt;
  }

  /**
   * Limpa resposta do Gemini para extrair JSON válido
   */
  cleanJsonResponse(responseText) {
    // Remove markdown code blocks
    let cleaned = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Remove texto antes e depois do JSON
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}') + 1;
    
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      cleaned = cleaned.substring(jsonStart, jsonEnd);
    }
    
    // Remove quebras de linha desnecessárias e espaços extras
    cleaned = cleaned.trim();
    
    return cleaned;
  }

  /**
   * Valida e enriquece dados extraídos
   */
  validateAndEnrichData(data, pdfText) {
    const valorTotalFinanceiro = this.parseNumber(data.financeiro?.valorTotal);
    let parcelasValidadas = this.validateParcelas(data.financeiro?.parcelas);

    // GARANTE QUE SEMPRE HAJA AO MENOS 1 PARCELA
    // Se o LLM não encontrar parcelas, cria uma com o valor total.
    if (parcelasValidadas.length === 0 && valorTotalFinanceiro) {
      parcelasValidadas.push({
        numero: 1,
        dataVencimento: null, // O LLM não encontrou, então mantemos nulo
        valor: valorTotalFinanceiro
      });
    }
    // Se o LLM encontrar 1 parcela mas sem valor, preenche com o valor total.
    else if (parcelasValidadas.length === 1 && !parcelasValidadas[0].valor && valorTotalFinanceiro) {
      parcelasValidadas[0].valor = valorTotalFinanceiro;
    }

    const validated = {
      fornecedor: {
        razaoSocial: data.fornecedor?.razaoSocial || null,
        nomeFantasia: data.fornecedor?.nomeFantasia || null,
        cnpj: this.formatCNPJ(data.fornecedor?.cnpj),
        endereco: data.fornecedor?.endereco || null,
        telefone: data.fornecedor?.telefone || null
      },
      faturado: {
        nome: data.faturado?.nome || null,
        cpf: this.formatCPF(data.faturado?.cpf),
        cnpj: this.formatCNPJ(data.faturado?.cnpj),
        endereco: data.faturado?.endereco || null
      },
      notaFiscal: {
        numero: data.notaFiscal?.numero || null,
        serie: data.notaFiscal?.serie || null,
        dataEmissao: this.validateDate(data.notaFiscal?.dataEmissao),
        chaveAcesso: data.notaFiscal?.chaveAcesso || null
      },
      produtos: this.validateProdutos(data.produtos),
      financeiro: {
        valorTotal: valorTotalFinanceiro,
        parcelas: parcelasValidadas
      },
      classificacao: {
        categoria: this.validateCategoria(data.classificacao?.categoria),
        observacoes: data.classificacao?.observacoes || null
      },
      processamento: {
        timestamp: new Date().toISOString(),
        versao: '1.0.0',
        status: 'success'
      }
    };

    // --- FALLBACK COM REGEX PARA CAMPOS OBRIGATÓRIOS ---

    // 1. Forçar CNPJ do Fornecedor
    if (!validated.fornecedor.cnpj) {
      console.warn('⚠️ LLM não extraiu CNPJ do fornecedor. Ativando fallback com Regex posicional...');
      const cnpjsEncontrados = this._findCnpjsInTextWithPosition(pdfText);
      
      if (cnpjsEncontrados.length > 0) {
        // Ordena pela posição no texto (menor índice primeiro) e pega o primeiro.
        // A suposição é que o CNPJ do fornecedor aparece primeiro no texto do PDF.
        cnpjsEncontrados.sort((a, b) => a.index - b.index);
        validated.fornecedor.cnpj = cnpjsEncontrados[0].cnpj;
        console.log(`✅ Fallback bem-sucedido. CNPJ do fornecedor encontrado pela posição: ${validated.fornecedor.cnpj}`);
      } else {
        console.error('❌ Fallback falhou. Nenhum CNPJ encontrado no texto.');
      }
    }

    // 2. Forçar CPF ou CNPJ do Faturado
    if (!validated.faturado.cpf && !validated.faturado.cnpj) {
      console.warn('⚠️ LLM não extraiu CPF/CNPJ do faturado. Ativando fallback com Regex...');
      const cpfsEncontrados = this._findCpfsInTextWithPosition(pdfText);

      if (cpfsEncontrados.length > 0) {
        // Assume o primeiro CPF encontrado é do faturado
        cpfsEncontrados.sort((a, b) => a.index - b.index);
        validated.faturado.cpf = cpfsEncontrados[0].cpf;
        console.log(`✅ Fallback bem-sucedido. CPF do faturado encontrado: ${validated.faturado.cpf}`);
      } else {
        const cnpjsEncontrados = this._findCnpjsInTextWithPosition(pdfText);
        // Pega um CNPJ que seja diferente do CNPJ do fornecedor
        const cnpjFaturado = cnpjsEncontrados.map(c => c.cnpj).find(cnpj => cnpj !== validated.fornecedor.cnpj);
        if (cnpjFaturado) {
          validated.faturado.cnpj = cnpjFaturado;
          console.log(`✅ Fallback bem-sucedido. CNPJ do faturado encontrado: ${validated.faturado.cnpj}`);
        } else {
           console.error('❌ Fallback falhou. Nenhum CPF ou CNPJ de faturado encontrado no texto.');
        }
      }
    }


    return validated;
  }

  /**
   * Utilitários de validação e formatação
   */
  formatCNPJ(cnpj) {
    if (!cnpj) return null;
    const numbers = cnpj.replace(/\D/g, '');
    return numbers.length === 14 ? numbers : null;
  }

  formatCPF(cpf) {
    if (!cpf) return null;
    const numbers = cpf.replace(/\D/g, '');
    return numbers.length === 11 ? numbers : null;
  }

  /**
   * Utilitários de busca com Regex para fallback, retornando valores com suas posições.
   */
  _findCnpjsInTextWithPosition(text) {
    const regex = /\b(?:\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{14})\b/g;
    const matches = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        raw: match[0],
        cnpj: match[0].replace(/\D/g, ''),
        index: match.index
      });
    }
    
    // Remove duplicados baseados no CNPJ limpo, mantendo a primeira ocorrência
    const uniqueCnpjs = [];
    const seen = new Set();
    for (const m of matches) {
      if (!seen.has(m.cnpj) && m.cnpj.length === 14) {
        seen.add(m.cnpj);
        uniqueCnpjs.push(m);
      }
    }
    return uniqueCnpjs;
  }

  _findCpfsInTextWithPosition(text) {
    const regex = /\b(?:\d{3}\.\d{3}\.\d{3}-\d{2}|\d{11})\b/g;
    const matches = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        raw: match[0],
        cpf: match[0].replace(/\D/g, ''),
        index: match.index
      });
    }
    
    const uniqueCpfs = [];
    const seen = new Set();
    for (const m of matches) {
      if (!seen.has(m.cpf) && m.cpf.length === 11) {
        seen.add(m.cpf);
        uniqueCpfs.push(m);
      }
    }
    return uniqueCpfs;
  }

  validateDate(dateStr) {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : dateStr;
  }

  parseNumber(value) {
    if (value === null || value === undefined) return null;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }

  validateCategoria(categoria) {
    if (!categoria) return 'OUTROS';
    const upper = categoria.toUpperCase();
    return config.despesaCategorias.includes(upper) ? upper : 'OUTROS';
  }

  validateProdutos(produtos) {
    if (!Array.isArray(produtos)) return [];
    
    return produtos.map(produto => ({
      descricao: produto.descricao || 'Produto não especificado',
      quantidade: this.parseNumber(produto.quantidade),
      valorUnitario: this.parseNumber(produto.valorUnitario),
      valorTotal: this.parseNumber(produto.valorTotal)
    }));
  }

  validateParcelas(parcelas) {
    if (!Array.isArray(parcelas)) return [];

    return parcelas.map((parcela, index) => ({
      numero: parcela.numero || index + 1,
      dataVencimento: this.validateDate(parcela.dataVencimento),
      valor: this.parseNumber(parcela.valor)
    }));
  }
}

// Instância singleton
const agent01 = new Agent01();

module.exports = agent01;
