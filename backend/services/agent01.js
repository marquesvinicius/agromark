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
