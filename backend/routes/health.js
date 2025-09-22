/**
 * Rotas de Health Check - AgroMark ESW424
 * Verificações locais e baratas - SEM chamadas para LLM
 */

const express = require('express');
const config = require('../config');

const router = express.Router();

// Cache para readiness da LLM (endpoint separado)
let llmReadinessCache = {
  status: 'unknown',
  lastCheck: 0,
  cacheDuration: 10 * 60 * 1000 // 10 minutos
};

/**
 * GET /api/health
 * Health check básico - SEM chamadas para LLM
 * Verificações locais e baratas apenas
 */
router.get('/', (req, res) => {
  try {
    // Verificações locais e baratas
    const hasGeminiKey = !!config.geminiApiKey;
    const isProcessAlive = process.uptime() > 0;
    
    const ok = hasGeminiKey && isProcessAlive;
    
    const healthCheck = {
      status: ok ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        api: 'ok',
        geminiApiKey: hasGeminiKey ? 'present' : 'missing'
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
      },
      environment: config.nodeEnv
    };

    // Log para monitoramento
    console.log(`📋 Health check: ${ok ? 'OK' : 'ERROR'} - Gemini Key: ${hasGeminiKey ? 'present' : 'missing'}`);

    res.status(ok ? 200 : 500).json(healthCheck);

  } catch (error) {
    console.error('❌ Erro no health check:', error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: 'Falha no health check',
      error: error.message
    });
  }
});

/**
 * GET /api/readiness-llm
 * Endpoint separado para testar LLM manualmente
 * Com cache de 10 minutos para evitar spam
 */
router.get('/', async (req, res) => {
  try {
    const now = Date.now();
    
    // Verificar cache primeiro
    if (now - llmReadinessCache.lastCheck < llmReadinessCache.cacheDuration) {
      console.log(`📋 LLM Readiness: usando cache (${llmReadinessCache.status})`);
      return res.json({
        ...llmReadinessCache,
        cached: true,
        cacheAge: Math.round((now - llmReadinessCache.lastCheck) / 1000) + 's'
      });
    }

    // Verificar se tem API key
    if (!config.geminiApiKey) {
      llmReadinessCache = {
        status: 'error',
        error: 'GEMINI_API_KEY não configurada',
        lastCheck: now,
        cacheDuration: llmReadinessCache.cacheDuration
      };
      return res.status(500).json(llmReadinessCache);
    }

    console.log('🔄 Testando LLM readiness (fora do cache)...');

    try {
      // Importação dinâmica para evitar dependência circular
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(config.geminiApiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      // Teste mínimo - apenas ping
      const result = await model.generateContent("OK");
      await result.response;
      
      llmReadinessCache = {
        status: 'ok',
        checkedAt: new Date().toISOString(),
        lastCheck: now,
        cacheDuration: llmReadinessCache.cacheDuration
      };
      
      console.log('✅ LLM Readiness: OK');
      res.json(llmReadinessCache);
      
    } catch (llmError) {
      llmReadinessCache = {
        status: 'error',
        error: llmError.message,
        checkedAt: new Date().toISOString(),
        lastCheck: now,
        cacheDuration: llmReadinessCache.cacheDuration
      };
      
      console.warn('⚠️ LLM Readiness: ERROR -', llmError.message);
      res.status(503).json(llmReadinessCache);
    }

  } catch (error) {
    console.error('❌ Erro no readiness LLM:', error);
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/health/detailed
 * Informações detalhadas do sistema (sem LLM)
 */
router.get('/detailed', (req, res) => {
  try {
    const detailedInfo = {
      timestamp: new Date().toISOString(),
      application: {
        name: 'AgroMark API',
        version: '1.0.0'
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      },
      configuration: {
        port: config.port,
        environment: config.nodeEnv,
        uploadMaxSize: `${config.upload.maxFileSize / 1024 / 1024}MB`,
        allowedFileTypes: config.upload.allowedTypes,
        geminiApiKey: config.geminiApiKey ? 'configured' : 'missing'
      }
    };

    res.status(200).json(detailedInfo);

  } catch (error) {
    console.error('❌ Erro no health check detalhado:', error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: 'Falha no health check detalhado',
      error: error.message
    });
  }
});

module.exports = router;