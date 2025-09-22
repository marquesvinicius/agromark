/**
 * Configurações do Backend - AgroMark ESW424
 * Centraliza todas as configurações da aplicação
 */

require('dotenv').config({ path: __dirname + '/.env' });

const config = {
  // Configurações do servidor
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Gemini API - OBRIGATÓRIO via variável de ambiente
  geminiApiKey: process.env.GEMINI_API_KEY,
  
  // Upload de arquivos
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'pdf').split(','),
    uploadDir: './uploads'
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100 // máximo 100 requests por IP
  },

  // Categorias de despesa pré-definidas
  despesaCategorias: [
    'MANUTENÇÃO E OPERAÇÃO',
    'INFRAESTRUTURA E UTILIDADES', 
    'INSUMOS AGRÍCOLAS',
    'RECURSOS HUMANOS',
    'SERVIÇOS OPERACIONAIS',
    'COMBUSTÍVEIS E LUBRIFICANTES',
    'EQUIPAMENTOS E FERRAMENTAS',
    'OUTROS'
  ]
};

// Validação OBRIGATÓRIA da API Key do Gemini
if (!config.geminiApiKey) {
  console.error('❌ ERRO CRÍTICO: GEMINI_API_KEY não encontrada!');
  console.error('   Configure no arquivo .env: GEMINI_API_KEY=sua_key_aqui');
  console.error('   Ou nas variáveis de ambiente da Vercel');
  process.exit(1); // Para a aplicação se não tiver a key
}

module.exports = config;
