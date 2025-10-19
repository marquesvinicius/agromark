/**
 * Serviço de API - AgroMark ESW424
 * Comunicação com o backend para upload e processamento
 */

import axios from 'axios';
import toast from 'react-hot-toast';

// Configuração base do axios - Frontend Vercel + Backend Render
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  timeout: 60000, // 60 segundos para upload e processamento
  headers: {
    'Content-Type': 'application/json',
  }
});

// Interceptor para requests
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('Request Error:', error);
    return Promise.reject(error);
  }
);

// Interceptor para responses
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('Response Error:', error.response?.data || error.message);
    
    // Tratar erros comuns
    if (error.code === 'ECONNABORTED') {
      toast.error('Timeout: O processamento está demorando muito');
    } else if (error.response?.status === 413) {
      toast.error('Arquivo muito grande (máximo 10MB)');
    } else if (error.response?.status === 429) {
      toast.error('Muitas tentativas. Aguarde um momento');
    } else if (!error.response) {
      toast.error('Erro de conexão com o servidor');
    }
    
    return Promise.reject(error);
  }
);

class ApiService {
  /**
   * Verifica status de saúde da API (sem testar Gemini)
   */
  async checkHealth() {
    try {
      const response = await api.get('/health');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Testa readiness da LLM (endpoint separado com cache)
   */
  async checkLLMReadiness() {
    try {
      const response = await api.get('/readiness-llm');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Obtém informações detalhadas do sistema
   */
  async getDetailedHealth() {
    try {
      const response = await api.get('/health/detailed');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Faz upload e processamento de PDF
   * @param {File} file - Arquivo PDF
   * @param {Function} onProgress - Callback de progresso (opcional)
   */
  async uploadPDF(file, onProgress) {
    try {
      // Validações iniciais
      if (!file) {
        throw new Error('Nenhum arquivo fornecido');
      }

      if (file.type !== 'application/pdf') {
        throw new Error('Apenas arquivos PDF são permitidos');
      }

      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Arquivo muito grande (máximo 10MB)');
      }

      // Preparar FormData
      const formData = new FormData();
      formData.append('pdf', file);

      console.log(`Uploading: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);

      // Configurar request com progress
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // 2 minutos para upload
      };

      // Adicionar callback de progresso se fornecido
      if (onProgress) {
        config.onUploadProgress = (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        };
      }

      // Fazer upload
      const response = await api.post('/upload', formData, config);

      if (response.data.success) {
        toast.success('PDF processado com sucesso!');
        return {
          success: true,
          data: response.data.data,
          message: response.data.message
        };
      } else {
        throw new Error(response.data.message || 'Erro no processamento');
      }

    } catch (error) {
      console.error('Upload Error:', error);

      let errorMessage = 'Erro no upload do arquivo';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Não mostrar toast aqui, deixar para o componente decidir
      throw new Error(errorMessage);
    }
  }

  /**
   * Obtém categorias de despesa disponíveis
   */
  async getCategories() {
    try {
      const response = await api.get('/upload/categories');
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  async checkAll(payload) {
    try {
      const response = await api.post('/check/all', payload);
      return response.data;
    } catch (error) {
      throw new Error(this.formatError(error));
    }
  }

  async createNecessary(payload) {
    try {
      const response = await api.post('/create/necessary', payload);
      return response.data;
    } catch (error) {
      throw new Error(this.formatError(error));
    }
  }

  async criarMovimento(payload) {
    try {
      const response = await api.post('/movimentos', payload);
      return response.data;
    } catch (error) {
      throw new Error(this.formatError(error));
    }
  }

  /**
   * Obtém lista de movimentos/lançamentos financeiros
   */
  async getMovimentos() {
    try {
      const response = await api.get('/movimentos');
      return {
        success: true,
        data: response.data.data || response.data
      };
    } catch (error) {
      return {
        success: false,
        error: this.formatError(error),
        data: null
      };
    }
  }

  /**
   * Testa configurações de upload
   */
  async testUploadConfig() {
    try {
      const response = await api.get('/upload/test');
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Obtém documentação da API
   */
  async getApiDocs() {
    try {
      const response = await api.get('/docs');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Utilitário para formatar erros de API
   */
  formatError(error) {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    
    if (error.response?.status) {
      const statusMessages = {
        400: 'Requisição inválida',
        401: 'Não autorizado',
        403: 'Acesso negado',
        404: 'Recurso não encontrado',
        413: 'Arquivo muito grande',
        429: 'Muitas tentativas',
        500: 'Erro interno do servidor',
        502: 'Erro no serviço de IA',
        503: 'Serviço indisponível'
      };
      
      return statusMessages[error.response.status] || `Erro ${error.response.status}`;
    }
    
    if (error.code === 'ECONNABORTED') {
      return 'Timeout: Processamento demorou muito';
    }
    
    if (error.code === 'ERR_NETWORK') {
      return 'Erro de conexão com o servidor';
    }
    
    return error.message || 'Erro desconhecido';
  }

  /**
   * Verifica se a API está online
   */
  async isOnline() {
    try {
      const result = await this.checkHealth();
      return result.success;
    } catch (error) {
      return false;
    }
  }
}

// Exportar instância singleton
export const apiService = new ApiService();

// Exportar classe para testes
export default ApiService;
