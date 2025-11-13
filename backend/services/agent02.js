/**
 * Serviço Agente RAG - AgroMark ESW424
 * Agente de consulta com RAG (Text-to-SQL e Embeddings)
 */

const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, TaskType } = require('@google/generative-ai');
const config = require('../config');
const prisma = require('../utils/prismaClient');

class Agent02 {
  constructor() {
    this.genAI = new GoogleGenerativeAI(config.geminiApiKey);

    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ];

    this.model = this.genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 0.8,
        maxOutputTokens: 8192,
      },
      safetySettings,
    });
    
    this.embeddingModel = this.genAI.getGenerativeModel({ model: "text-embedding-004" });

    this.vectorCache = {
      embeddings: [],
      documents: [],
      timestamp: 0,
      cacheDuration: 5 * 60 * 1000, // 5 minutos
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

  async updateVectorCache(force = false) {
    const now = Date.now();
    const cacheValid = (now - this.vectorCache.timestamp) < this.vectorCache.cacheDuration;
    if (cacheValid && !force) {
      console.log('[RAG-Embed] Usando cache de vetores existente.');
      return;
    }

    console.log('[RAG-Embed] Cache de vetores expirado ou forçado. Atualizando...');
    
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

    const documents = movimentos.map(mov => {
      const classificacaoDesc = mov.classificacoes.map(c => c.classificacao.descricao).join(', ');
      return {
        id: mov.id,
        content: `Nota fiscal número ${mov.numeroNotaFiscal} do fornecedor ${mov.fornecedor.razaoSocial} com descrição "${mov.descricao || 'não especificada'}" classificada como "${classificacaoDesc}" no valor de R$${mov.valorTotal}.`
      };
    });

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

  async answerQuery(userQuery, conversationHistory = []) {
    try {
      const decisionPrompt = this.buildDecisionPrompt(userQuery, conversationHistory);
      const decisionResult = await this.model.generateContent(decisionPrompt);
      const decision = (await decisionResult.response).text().trim();

      if (decision.includes('[SQL]')) {
        console.log('[RAG] Ação: Gerar e Executar SQL.');
        
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
        return decision;
      }

    } catch (error) {
      console.error('❌ Erro no processo de RAG:', error);
      if (error.message.includes("Não foi possível gerar uma consulta SQL")) {
        return error.message;
      }
      return `Ocorreu um erro ao processar sua pergunta: ${error.message}`;
    }
  }

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
      2. Coloque nomes de colunas camelCase entre aspas duplas (ex: "valorTotal", "movimentoId").
      3. Para status, use os valores do Enum. Para 'parcelas em aberto', a condição é \`WHERE "statusParcela" = 'ABERTA'\`.
      4. Se não puder responder, retorne "NÃO CONSIGO RESPONDER".

      **EXEMPLO 1 (Simples):**
      - **Pergunta:** "Quantos fornecedores existem?"
      - **SQL Gerado:** SELECT COUNT(*) FROM pessoa WHERE tipo = 'FORNECEDOR';

      **EXEMPLO 2 (Complexo com JOIN e Soma):**
      - **Pergunta:** "Quanto já gastamos com insumos agrícolas?"
      - **SQL Gerado:** SELECT SUM(mc."valorTotal") FROM movimento_contas AS mc JOIN movimento_classificacao AS mcl ON mc.id = mcl."movimentoId" JOIN classificacao AS c ON mcl."classificacaoId" = c.id WHERE c.descricao = 'INSUMOS AGRÍCOLAS';

      **Pergunta do Usuário:**
      "${userQuery}"

      **SQL Gerado:**
    `;

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    let sql = response.text().trim();

    sql = sql.replace(/\`\`\`sql/g, '').replace(/\`\`\`/g, '').trim();
    if (!sql.endsWith(';')) {
      sql += ';';
    }

    return sql;
  }

  async executeSql(sqlQuery) {
    try {
      const result = await prisma.$queryRawUnsafe(sqlQuery);
      return result;
    } catch (error) {
      console.error("❌ Erro ao executar a consulta SQL:", error);
      throw new Error(`A consulta SQL falhou: "${error.message}"`);
    }
  }

  async generateNaturalLanguageResponse(originalQuery, contextData, conversationHistory = []) {
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
}

const agent02 = new Agent02();

module.exports = agent02;
