/**
 * Rotas de Upload e Processamento - AgroMark ESW424
 * Gerencia upload de PDFs e extração de dados via Gemini API
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');

const config = require('../config');
const prisma = require('../utils/prismaClient');
const agent01 = require('../services/agent01');
const { validatePDF, sanitizeFileName } = require('../utils/fileUtils');
const { isTextScannable } = require('../utils/textUtils');

const router = express.Router();

// ===== CONFIGURAÇÃO DO MULTER =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.upload.uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const sanitizedName = sanitizeFileName(file.originalname);
    const filename = `nf_${timestamp}_${sanitizedName}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Validar tipo de arquivo
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Apenas arquivos PDF são permitidos'), false);
    }
    
    // Validar extensão
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.pdf') {
      return cb(new Error('Arquivo deve ter extensão .pdf'), false);
    }
    
    cb(null, true);
  }
});

/**
 * POST /api/upload
 * Upload e processamento de PDF de Nota Fiscal
 */
router.post('/', upload.single('pdf'), async (req, res) => {
  let uploadedFilePath = null;
  
  try {
    // Verificar se arquivo foi enviado
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum arquivo PDF foi enviado',
        error: 'NO_FILE_UPLOADED'
      });
    }

    uploadedFilePath = req.file.path;
    console.log(`📄 Processando PDF: ${req.file.originalname} (${req.file.size} bytes)`);

    // Validação adicional do PDF
    const validationResult = await validatePDF(uploadedFilePath);
    if (!validationResult.valid) {
      return res.status(400).json({
        success: false,
        message: validationResult.message,
        error: 'INVALID_PDF'
      });
    }

    // Extrair texto do PDF
    console.log('🔍 Extraindo texto do PDF...');
    const pdfBuffer = fs.readFileSync(uploadedFilePath);
    const pdfData = await pdfParse(pdfBuffer);
    
    // Validar se o texto extraído é escaneável
    if (!isTextScannable(pdfData.text)) {
      return res.status(400).json({
        success: false,
        message: 'PDF não contém texto escaneável ou está corrompido. O arquivo pode ser uma imagem.',
        error: 'NON_SCANNABLE_TEXT'
      });
    }

    console.log(`📝 Texto extraído: ${pdfData.text.length} caracteres`);

    // Processar com Gemini API
    console.log('🤖 Enviando para Gemini API...');
    const extractedData = await agent01.extractInvoiceData(pdfData.text);

    // Enriquecer dados com informações do arquivo
    const result = {
      ...extractedData,
      metadata: {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        uploadDate: new Date().toISOString(),
        processedAt: new Date().toISOString(),
        textLength: pdfData.text.length,
        pages: pdfData.numpages || 1
      }
    };

    console.log('✅ Processamento concluído com sucesso');

    // Resposta de sucesso
    res.status(200).json({
      success: true,
      message: 'PDF processado com sucesso',
      data: result
    });

  } catch (error) {
    console.error('❌ Erro no processamento:', error);

    // Categorizar erros
    let errorMessage = 'Erro interno no processamento do PDF';
    let errorCode = 'PROCESSING_ERROR';
    let statusCode = 500;

    if (error.message.includes('Gemini')) {
      errorMessage = 'Erro na extração de dados via IA';
      errorCode = 'GEMINI_ERROR';
      statusCode = 502;
    } else if (error.message.includes('PDF')) {
      errorMessage = 'Erro na leitura do arquivo PDF';
      errorCode = 'PDF_READ_ERROR';
      statusCode = 400;
    } else if (error.code === 'ENOENT') {
      errorMessage = 'Arquivo não encontrado';
      errorCode = 'FILE_NOT_FOUND';
      statusCode = 404;
    }

    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: errorCode,
      details: config.nodeEnv === 'development' ? error.message : undefined
    });

  } finally {
    // Limpar arquivo temporário
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
      try {
        fs.unlinkSync(uploadedFilePath);
        console.log('🗑️ Arquivo temporário removido');
      } catch (cleanupError) {
        console.warn('⚠️ Erro ao remover arquivo temporário:', cleanupError.message);
      }
    }
  }
});

/**
 * GET /api/upload/categories
 * Lista categorias de despesa disponíveis
 */
router.get('/categories', async (req, res) => {
  try {
    const classificacoes = await prisma.classificacao.findMany({
      where: {
        tipo: 'DESPESA',
        status: 'ATIVO'
      },
      orderBy: { descricao: 'asc' }
    });

    res.status(200).json({
      success: true,
      message: 'Categorias de despesa disponíveis',
      data: {
        categories: classificacoes.map((item) => item.descricao),
        count: classificacoes.length,
        description: 'Categorias utilizadas para classificação automática de despesas'
      }
    });
  } catch (error) {
    console.error('❌ Erro ao listar categorias:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao consultar categorias de despesa',
      error: error.message
    });
  }
});

/**
 * GET /api/upload/test
 * Endpoint de teste para validar configurações
 */
router.get('/test', async (req, res) => {
  try {
    const testInfo = {
      uploadConfig: {
        maxFileSize: `${config.upload.maxFileSize / 1024 / 1024}MB`,
        allowedTypes: config.upload.allowedTypes,
        uploadDir: config.upload.uploadDir,
        dirExists: fs.existsSync(config.upload.uploadDir)
      },
      geminiStatus: await agent01.testConnection(),
      timestamp: new Date().toISOString()
    };

    res.status(200).json({
      success: true,
      message: 'Configurações de upload testadas',
      data: testInfo
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro no teste de configurações',
      error: error.message
    });
  }
});

module.exports = router;
