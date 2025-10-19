/**
 * Rotas de Health Check - AgroMark ESW424
 * Verificações locais e baratas - SEM chamadas para LLM
 */

const express = require('express');
const config = require('../config');
const prisma = require('../utils/prismaClient');

const healthRouter = express.Router();
const readinessRouter = express.Router();

// Cache compartilhado em memória para readiness da LLM
// Este cache é compartilhado entre TODOS os usuários para evitar spam
let llmReadinessCache = {
  status: 'unknown',
  checkedAt: null,
  lastCheck: 0,
  cacheDuration: 15 * 60 * 1000, // 15 minutos
  activeUsers: 0 // Contador de verificações recentes
};

/**
 * GET /api/health
 * Health check básico - SEM chamadas para LLM
 * Verificações locais e baratas apenas
 */
healthRouter.get('/', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    const payload = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        api: 'ok',
        database: 'ok',
        geminiApiKey: config.geminiApiKey ? 'present' : 'missing'
      },
      environment: config.nodeEnv,
      memory: {
        usedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        totalMB: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      }
    };

    res.status(200).json(payload);
  } catch (error) {
    console.error('❌ Health check falhou:', error.message);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      services: {
        api: 'ok',
        database: 'error'
      },
      message: 'Falha ao verificar banco de dados'
    });
  }
});

/**
 * GET /api/health/detailed
 * Informações detalhadas do sistema (sem LLM)
 */
healthRouter.get('/detailed', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      timestamp: new Date().toISOString(),
      application: {
        name: 'AgroMark API',
        version: '1.0.0'
      },
      environment: config.nodeEnv,
      configuration: {
        port: config.port,
        uploadMaxSizeMB: config.upload.maxFileSize / 1024 / 1024,
        allowedFileTypes: config.upload.allowedTypes,
        geminiApiKey: config.geminiApiKey ? 'configured' : 'missing'
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      },
      database: {
        status: 'ok'
      }
    });
  } catch (error) {
    console.error('❌ Health detalhado falhou:', error.message);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: 'Falha ao verificar banco de dados'
    });
  }
});

/**
 * GET /api/readiness-llm
 * Endpoint separado para testar LLM manualmente
 * Com cache de 10 minutos para evitar spam
 */
readinessRouter.get('/', async (req, res) => {
  try {
    const now = Date.now();
    const cacheAge = now - llmReadinessCache.lastCheck;
    const remainingTime = Math.max(0, llmReadinessCache.cacheDuration - cacheAge);

    // Se ainda está no período de cache, retorna dados cacheados
    if (cacheAge < llmReadinessCache.cacheDuration && llmReadinessCache.status !== 'unknown') {
      llmReadinessCache.activeUsers++;
      
      return res.json({
        ...llmReadinessCache,
        cached: true,
        cacheAgeSeconds: Math.round(cacheAge / 1000),
        remainingCacheSeconds: Math.round(remainingTime / 1000),
        message: `Status cacheado. Próxima verificação disponível em ${Math.round(remainingTime / 1000 / 60)} minutos.`
      });
    }

    if (!config.geminiApiKey) {
      llmReadinessCache = {
        status: 'error',
        error: 'GEMINI_API_KEY não configurada',
        checkedAt: new Date().toISOString(),
        lastCheck: now,
        cacheDuration: llmReadinessCache.cacheDuration,
        activeUsers: 1
      };
      return res.status(500).json(llmReadinessCache);
    }

    console.log('🔍 Verificando status da Gemini AI (requisição de usuário)...');

    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(config.geminiApiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent('ping');
    await result.response;

    llmReadinessCache = {
      status: 'ok',
      checkedAt: new Date().toISOString(),
      lastCheck: now,
      cacheDuration: llmReadinessCache.cacheDuration,
      activeUsers: 1,
      message: 'Gemini AI está online e funcionando.'
    };

    console.log('✅ Gemini AI verificada com sucesso. Cache válido por 15 minutos.');
    res.json(llmReadinessCache);
  } catch (error) {
    console.error('❌ Erro ao verificar Gemini AI:', error.message);
    
    llmReadinessCache = {
      status: 'error',
      error: error.message,
      checkedAt: new Date().toISOString(),
      lastCheck: Date.now(),
      cacheDuration: llmReadinessCache.cacheDuration,
      activeUsers: 1,
      message: 'Gemini AI indisponível no momento.'
    };
    res.status(503).json(llmReadinessCache);
  }
});

module.exports = {
  healthRouter,
  readinessRouter
};