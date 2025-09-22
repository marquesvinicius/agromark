/**
 * Serviço Gemini API - AgroMark ESW424
 * Integração com Google Gemini para extração de dados de Nota Fiscal
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');

class GeminiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(config.geminiApiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 0.8,
        maxOutputTokens: 2048,
      }
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
      console.log('🤖 Enviando prompt para Gemini...');
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      let responseText = response.text();
      
      console.log('📝 Resposta recebida do Gemini');
      
      // Limpar e parsear JSON
      responseText = this.cleanJsonResponse(responseText);
      
      try {
        const extractedData = JSON.parse(responseText);
        
        // Validar e enriquecer dados
        const validatedData = this.validateAndEnrichData(extractedData);
        
        console.log('✅ Dados extraídos e validados com sucesso');
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
    return `
Você é um assistente de IA especialista em extrair informações de Notas Fiscais brasileiras (NF-e). Sua tarefa é seguir um processo de duas etapas: 1) Extração Inicial e 2) Validação e Auto-Correção. O objetivo é retornar um objeto JSON VÁLIDO e PRECISO.

### ETAPA 1: EXTRAÇÃO INICIAL

**Dicas de Extração:**
- **Fornecedor (Emitente):** A Razão Social e o CNPJ geralmente estão no topo do documento. **Procure ativamente pelo rótulo "CNPJ" próximo ao nome do fornecedor.**
- **Cliente (Destinatário):** O Nome/Razão Social e o CPF/CNPJ estão na seção "DESTINATÁRIO / REMETENTE". O CPF/CNPJ pode estar na mesma linha que o nome.
- **Valores Monetários:** Extraia valores como '3.254,07' e retorne-os como um número de ponto flutuante, por exemplo: 3254.07. **NÃO** inclua separadores de milhar no número final.
- **Datas:** Converta todas as datas para o formato YYYY-MM-DD.
- **CNPJ/CPF:** Retorne apenas os números, sem pontos, traços ou barras.
- **Não Encontrado:** Se um campo não for encontrado, use o valor 'null'.

### EXEMPLO DE EXTRAÇÃO ("FEW-SHOT"):

**Texto de Exemplo:**
"MAGAZINE LUIZA S/A
ROD BANDEIRANTES S/N, 0
NATUREZA DA OPERAÇÃO
INSCRIÇÃO ESTADUAL CNPJ
VENDA MERCADORIA
421021117115 47.960.950/0897-85"

**JSON de Saída Esperado para o Exemplo:**
{
  "fornecedor": {
    "razaoSocial": "MAGAZINE LUIZA S/A",
    "cnpj": "47960950089785"
  }
}

Use este exemplo como guia para associar corretamente a Razão Social ao CNPJ.

### ETAPA 2: VALIDAÇÃO E AUTO-CORREÇÃO

Antes de finalizar, revise os dados extraídos com base nas seguintes regras:

**Regra 1: Validação de Campos Obrigatórios**
- O campo "fornecedor.cnpj" é OBRIGATÓRIO. Se for 'null' após a extração inicial, REVEJA o texto atentamente, especialmente no topo do documento, procurando pelo rótulo "CNPJ".
- O campo "faturado" DEVE ter ou "cpf" ou "cnpj". Se ambos forem 'null', REVEJA a seção "DESTINATÁRIO" para encontrar pelo menos um deles.

**Regra 2: Validação de Sanidade dos Valores**
- Compare o "financeiro.valorTotal" com a soma dos "produtos.valorTotal".
- Avalie o valor do produto. Exemplo: um notebook não custa 3 reais nem 300.000 reais. Se o valor parecer irreal, é provável que a vírgula ou o ponto decimal tenham sido extraídos incorretamente. CORRIJA o valor para que faça sentido (ex: 3254.07 em vez de 325407.00).

### TEXTO DA NOTA FISCAL PARA ANÁLISE:
${pdfText}

### CATEGORIAS DE DESPESA DISPONÍVEIS:
${config.despesaCategorias.map(cat => `- ${cat}`).join('\n')}

### FORMATO JSON DE SAÍDA (OBRIGATÓRIO):
Após a validação e correção, retorne APENAS o objeto JSON abaixo, sem nenhum texto, comentário ou formatação markdown adicional.
{
  "fornecedor": {
    "razaoSocial": "string ou null",
    "nomeFantasia": "string ou null", 
    "cnpj": "string apenas números ou null (após re-verificação)",
    "endereco": "string ou null",
    "telefone": "string ou null"
  },
  "faturado": {
    "nome": "string ou null",
    "cpf": "string apenas números ou null (após re-verificação)",
    "cnpj": "string apenas números ou null (após re-verificação)",
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
  validateAndEnrichData(data) {
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
const geminiService = new GeminiService();

module.exports = geminiService;
