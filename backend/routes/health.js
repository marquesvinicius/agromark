/**
 * Rotas de Health Check - AgroMark ESW424
 * Verificações locais e baratas - SEM chamadas para LLM
 */

const express = require('express');
const config = require('../config');
const prisma = require('../utils/prismaClient');

const healthRouter = express.Router();
const readinessRouter = express.Router();

// Cache simples em memória para readiness da LLM
let llmReadinessCache = {
  status: 'unknown',
  checkedAt: null,
  lastCheck: 0,
  cacheDuration: 10 * 60 * 1000 // 10 minutos
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

    if (now - llmReadinessCache.lastCheck < llmReadinessCache.cacheDuration) {
      return res.json({
        ...llmReadinessCache,
        cached: true,
        cacheAgeSeconds: Math.round((now - llmReadinessCache.lastCheck) / 1000)
      });
    }

    if (!config.geminiApiKey) {
      llmReadinessCache = {
        status: 'error',
        error: 'GEMINI_API_KEY não configurada',
        checkedAt: new Date().toISOString(),
        lastCheck: now,
        cacheDuration: llmReadinessCache.cacheDuration
      };
      return res.status(500).json(llmReadinessCache);
    }

    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(config.geminiApiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent('ping');
    await result.response;

    llmReadinessCache = {
      status: 'ok',
      checkedAt: new Date().toISOString(),
      lastCheck: now,
      cacheDuration: llmReadinessCache.cacheDuration
    };

    res.json(llmReadinessCache);
  } catch (error) {
    llmReadinessCache = {
      status: 'error',
      error: error.message,
      checkedAt: new Date().toISOString(),
      lastCheck: Date.now(),
      cacheDuration: llmReadinessCache.cacheDuration
    };
    res.status(503).json(llmReadinessCache);
  }
});

module.exports = {
  healthRouter,
  readinessRouter
};