/**
 * Servidor Principal - AgroMark ESW424
 * Backend Node.js + Express para processamento de Notas Fiscais
 * 
 * Autor: Marques Vinícius Melo Martins
 * Disciplina: ESW424 - Prática de Engenharia de Software
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const config = require('./config');
const uploadRoutes = require('./routes/upload');
const checkRoutes = require('./routes/check');
const createRoutes = require('./routes/create');
const movimentosRoutes = require('./routes/movimentos');
const pessoasRoutes = require('./routes/pessoas');
const classificacoesRoutes = require('./routes/classificacoes');
const { healthRouter, readinessRouter } = require('./routes/health');
const { rateLimiter, strictRateLimiter } = require('./middleware/rateLimiter');

const app = express();

// ===== MIDDLEWARES DE SEGURANÇA =====
app.use(helmet());

// Configuração de CORS para produção e desenvolvimento
const whitelist = [
  'http://localhost:3000', // Desenvolvimento local
  'https://agromark-frontend.onrender.com' // URL do frontend no Render
];
const corsOptions = {
  origin: function (origin, callback) {
    // Permite requisições sem 'origin' (ex: Postman, apps mobile) ou se a origem estiver na whitelist
    if (!origin || whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit(config.rateLimit);
app.use('/api/', limiter);

// Rate limiting personalizado para endpoints sensíveis
app.use('/api/readiness-llm', strictRateLimiter);

// ===== MIDDLEWARES GERAIS =====
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Criar diretório de uploads se não existir
if (!fs.existsSync(config.upload.uploadDir)) {
  fs.mkdirSync(config.upload.uploadDir, { recursive: true });
}

// ===== ROTAS =====
app.use('/api/health', healthRouter);
app.use('/api/readiness-llm', readinessRouter); // Rota separada para LLM
app.use('/api/upload', uploadRoutes);
app.use('/api/check', checkRoutes);
app.use('/api/create', createRoutes);
app.use('/api/movimentos', movimentosRoutes);
app.use('/api/pessoas', pessoasRoutes);
app.use('/api/classificacoes', classificacoesRoutes);

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    message: '🌾 AgroMark API - Sistema Administrativo-Financeiro',
    version: '1.0.0',
    etapa: 'Etapa 1 - Processador de PDF',
    author: 'Marques Vinícius Melo Martins',
    disciplina: 'ESW424 - Prática de Engenharia de Software',
    endpoints: {
      health: '/api/health',
      upload: '/api/upload (POST)',
      docs: '/api/docs'
    }
  });
});

// Rota de documentação da API
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'AgroMark API Documentation',
    version: '1.0.0',
    endpoints: [
      {
        method: 'GET',
        path: '/api/health',
        description: 'Verifica status da aplicação e conexão com Gemini API'
      },
      {
        method: 'POST', 
        path: '/api/upload',
        description: 'Upload e processamento de PDF de Nota Fiscal',
        parameters: {
          file: 'PDF file (multipart/form-data)',
          maxSize: config.upload.maxFileSize + ' bytes'
        },
        response: {
          success: 'boolean',
          data: 'objeto com dados extraídos',
          message: 'string'
        }
      }
    ],
    categories: config.despesaCategorias
  });
});

// ===== MIDDLEWARE DE ERRO =====
app.use((err, req, res, next) => {
  console.error('❌ Erro na aplicação:', err);
  
  // Erro de upload (Multer)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'Arquivo muito grande. Tamanho máximo: 10MB',
      error: 'FILE_TOO_LARGE'
    });
  }
  
  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      success: false,
      message: 'Muitos arquivos. Envie apenas um PDF por vez.',
      error: 'TOO_MANY_FILES'
    });
  }
  
  // Erro genérico
  res.status(500).json({
    success: false,
    message: config.nodeEnv === 'production' 
      ? 'Erro interno do servidor' 
      : err.message,
    error: config.nodeEnv === 'production' 
      ? 'INTERNAL_SERVER_ERROR' 
      : err.stack
  });
});

// ===== ROTA 404 =====
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
    error: 'ROUTE_NOT_FOUND'
  });
});

// ===== INICIALIZAÇÃO DO SERVIDOR =====
const PORT = config.port;

app.listen(PORT, () => {
  console.log('\n🌾 ===== AGROMARK API INICIADA =====');
  console.log(`📍 Servidor rodando na porta: ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`📊 Ambiente: ${config.nodeEnv}`);
  console.log(`🤖 Gemini API: ${config.geminiApiKey ? '✅ Configurada' : '❌ Não configurada'}`);
  console.log(`📁 Uploads: ${config.upload.uploadDir}`);
  console.log('=====================================\n');
});

module.exports = app;
