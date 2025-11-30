/**
 * Serviço Gemini API - AgroMark ESW424
 * Integração com Google Gemini para extração de dados de Nota Fiscal
 */

const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const config = require('../config');

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
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 0.8,
        maxOutputTokens: 8192,
      },
      safetySettings,
    });
    
    // Cache para evitar múltiplas chamadas desnecessárias
    this.connectionCache = {
      result: null,
      lastCheck: 0,
      cacheDuration: 3 * 60 * 1000 // 3 minutos
    };
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
   * @param {string} tipoMovimento - 'DESPESA' ou 'RECEITA'
   * @returns {Object} Dados estruturados da nota fiscal
   */
  async extractInvoiceData(pdfText, tipoMovimento = 'DESPESA') {
    try {
      const prompt = this.buildExtractionPrompt(pdfText, tipoMovimento);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      
      let responseText = response.text();
      
      // Limpar e parsear JSON
      responseText = this.cleanJsonResponse(responseText);
      
      try {
        const extractedData = JSON.parse(responseText);
        
        // Validar e enriquecer dados, aplicando fallbacks se necessário
        const validatedData = this.validateAndEnrichData(extractedData, pdfText, tipoMovimento);
        
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
   * Constrói prompt otimizado para extração de dados
   */
  buildExtractionPrompt(pdfText, tipoMovimento) {
    const isReceita = tipoMovimento === 'RECEITA';
    
    // Instruções específicas baseadas no tipo
    const roleInstructions = isReceita
      ? `VOCÊ ESTÁ PROCESSANDO UMA NOTA DE RECEITA (VENDA).
         1. O EMITENTE é o "FATURADO" (nossa empresa que vendeu). Ele está no cabeçalho.
         2. O DESTINATÁRIO é o "FORNECEDOR/CLIENTE" (quem comprou). Ele está no campo de destinatário.`
      : `VOCÊ ESTÁ PROCESSANDO UMA NOTA DE DESPESA (COMPRA).
         1. O EMITENTE é o "FORNECEDOR" (quem vendeu). Ele está no cabeçalho.
         2. O DESTINATÁRIO é o "FATURADO" (nossa empresa que comprou). Ele está no campo de destinatário.`;

    const prompt = `
Você é um especialista em análise de documentos fiscais. Analise o texto da Nota Fiscal abaixo e extraia APENAS as informações solicitadas, retornando um JSON válido.

${roleInstructions}

TEXTO DA NOTA FISCAL:
${pdfText}

INSTRUÇÕES OBRIGATÓRIAS:
1. Extraia apenas informações que estão claramente presentes no texto.
2. Para valores monetários, use apenas números (sem símbolos), com ponto como separador decimal.
3. Para datas, use formato YYYY-MM-DD.
4. Para CNPJ/CPF, retorne APENAS os números, sem formatação.

INSTRUÇÕES DETALHADAS PARA EXTRAÇÃO DE PRODUTOS:
A extração de produtos é a tarefa mais difícil. Para cada item na seção 'DADOS DOS PRODUTOS/SERVIÇOS', isole a linha e busque o trio numérico: Quantidade * Valor Unitário = Valor Total. Teste as multiplicações.

INSTRUÇÕES PARA CLASSIFICAÇÃO:
- Classifique a ${isReceita ? 'RECEITA' : 'DESPESA'} baseada no conteúdo dos produtos/serviços.

CATEGORIAS DE ${isReceita ? 'RECEITA' : 'DESPESA'} DISPONÍVEIS:
${(isReceita ? config.receitaCategorias || ['Venda de Soja', 'Venda de Milho', 'Prestação de Serviço'] : config.despesaCategorias).map(cat => `- ${cat}`).join('\n')}

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
      "valorUnitario": "number (corrigido) ou null",
      "valorTotal": "number (corrigido) ou null"
    }
  ],
  "financeiro": {
    "valorTotal": "number (corrigido) ou null",
    "parcelas": [
      {
        "numero": 1,
        "dataVencimento": "YYYY-MM-DD ou null",
        "valor": "number (corrigido) ou null"
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
  validateAndEnrichData(data, pdfText, tipoMovimento) {
    const valorTotalFinanceiro = this.parseNumber(data.financeiro?.valorTotal);
    let parcelasValidadas = this.validateParcelas(data.financeiro?.parcelas);

    // GARANTE QUE SEMPRE HAJA AO MENOS 1 PARCELA
    if (parcelasValidadas.length === 0 && valorTotalFinanceiro) {
      parcelasValidadas.push({
        numero: 1,
        dataVencimento: null,
        valor: valorTotalFinanceiro
      });
    } else if (parcelasValidadas.length === 1 && !parcelasValidadas[0].valor && valorTotalFinanceiro) {
      parcelasValidadas[0].valor = valorTotalFinanceiro;
    }

    const validated = {
      // Nota: O Frontend espera a estrutura 'fornecedor' e 'faturado'.
      // Se for RECEITA, o LLM já inverteu quem é quem no JSON, então mantemos a estrutura.
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
        status: 'success',
        tipo: tipoMovimento
      }
    };

    // --- FALLBACK COM REGEX ---
    // A lógica de fallback precisa ser cuidadosa. Se for Receita, o Fornecedor (Cliente) é o Destinatário no texto.
    
    // Se o CNPJ do "fornecedor" (contraparte) estiver vazio:
    if (!validated.fornecedor.cnpj) {
      const cnpjsEncontrados = this._findCnpjsInTextWithPosition(pdfText);
      if (cnpjsEncontrados.length > 0) {
        cnpjsEncontrados.sort((a, b) => a.index - b.index);
        // Se for DESPESA, o fornecedor é o primeiro (emitente).
        // Se for RECEITA, o fornecedor (cliente) é o segundo ou o destinatário.
        if (tipoMovimento === 'DESPESA') {
             validated.fornecedor.cnpj = cnpjsEncontrados[0].cnpj;
        } else {
            // Tenta pegar o segundo CNPJ se houver, senão pega o primeiro diferente do faturado
            if (cnpjsEncontrados.length > 1) validated.fornecedor.cnpj = cnpjsEncontrados[1].cnpj;
            else validated.fornecedor.cnpj = cnpjsEncontrados[0].cnpj;
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
   * Utilitários de busca com Regex para fallback
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
    // Aceita qualquer string não vazia, pois agora temos categorias dinâmicas
    return categoria.toUpperCase();
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
