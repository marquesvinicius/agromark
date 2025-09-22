/**
 * Utilitários para Manipulação de Arquivos - AgroMark ESW424
 * Funções auxiliares para validação e processamento de arquivos
 */

const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

/**
 * Valida se o arquivo é um PDF válido
 * @param {string} filePath - Caminho do arquivo
 * @returns {Object} Resultado da validação
 */
async function validatePDF(filePath) {
  try {
    // Verificar se arquivo existe
    if (!fs.existsSync(filePath)) {
      return {
        valid: false,
        message: 'Arquivo não encontrado'
      };
    }

    // Verificar tamanho do arquivo
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      return {
        valid: false,
        message: 'Arquivo está vazio'
      };
    }

    if (stats.size > 10 * 1024 * 1024) { // 10MB
      return {
        valid: false,
        message: 'Arquivo muito grande (máximo 10MB)'
      };
    }

    // Tentar ler o PDF
    const pdfBuffer = fs.readFileSync(filePath);
    
    // Verificar header do PDF
    const pdfHeader = pdfBuffer.slice(0, 4).toString();
    if (pdfHeader !== '%PDF') {
      return {
        valid: false,
        message: 'Arquivo não é um PDF válido'
      };
    }

    // Tentar extrair texto (validação mais profunda)
    try {
      const pdfData = await pdfParse(pdfBuffer);
      
      if (!pdfData.text || pdfData.text.trim().length < 50) {
        return {
          valid: false,
          message: 'PDF não contém texto suficiente para processamento'
        };
      }

      return {
        valid: true,
        message: 'PDF válido',
        metadata: {
          size: stats.size,
          pages: pdfData.numpages || 1,
          textLength: pdfData.text.length,
          hasText: pdfData.text.trim().length > 0
        }
      };

    } catch (pdfError) {
      return {
        valid: false,
        message: 'Erro ao processar PDF: arquivo pode estar corrompido'
      };
    }

  } catch (error) {
    return {
      valid: false,
      message: `Erro na validação do arquivo: ${error.message}`
    };
  }
}

/**
 * Sanitiza nome do arquivo removendo caracteres perigosos
 * @param {string} filename - Nome original do arquivo
 * @returns {string} Nome sanitizado
 */
function sanitizeFileName(filename) {
  if (!filename) return 'arquivo_sem_nome.pdf';
  
  // Remover caracteres perigosos
  let sanitized = filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Substituir caracteres especiais por _
    .replace(/_{2,}/g, '_') // Remover múltiplos underscores
    .replace(/^_+|_+$/g, '') // Remover underscores no início e fim
    .toLowerCase();

  // Garantir extensão .pdf
  if (!sanitized.endsWith('.pdf')) {
    sanitized = sanitized.replace(/\.[^.]*$/, '') + '.pdf';
  }

  // Limitar tamanho do nome
  const maxLength = 100;
  if (sanitized.length > maxLength) {
    const ext = path.extname(sanitized);
    const name = path.basename(sanitized, ext);
    sanitized = name.substring(0, maxLength - ext.length) + ext;
  }

  return sanitized;
}

/**
 * Cria diretório se não existir
 * @param {string} dirPath - Caminho do diretório
 */
function ensureDirectoryExists(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`📁 Diretório criado: ${dirPath}`);
    }
  } catch (error) {
    console.error(`❌ Erro ao criar diretório ${dirPath}:`, error.message);
    throw error;
  }
}

/**
 * Remove arquivo de forma segura
 * @param {string} filePath - Caminho do arquivo
 */
function safeDeleteFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ Arquivo removido: ${path.basename(filePath)}`);
      return true;
    }
    return false;
  } catch (error) {
    console.warn(`⚠️ Erro ao remover arquivo ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Limpa arquivos antigos do diretório de upload
 * @param {string} uploadDir - Diretório de uploads
 * @param {number} maxAgeMinutes - Idade máxima em minutos (padrão: 60)
 */
function cleanupOldFiles(uploadDir, maxAgeMinutes = 60) {
  try {
    if (!fs.existsSync(uploadDir)) return;

    const files = fs.readdirSync(uploadDir);
    const now = Date.now();
    const maxAge = maxAgeMinutes * 60 * 1000; // Converter para milissegundos
    
    let removedCount = 0;

    files.forEach(file => {
      const filePath = path.join(uploadDir, file);
      try {
        const stats = fs.statSync(filePath);
        const age = now - stats.mtime.getTime();
        
        if (age > maxAge) {
          fs.unlinkSync(filePath);
          removedCount++;
        }
      } catch (error) {
        console.warn(`⚠️ Erro ao processar arquivo ${file}:`, error.message);
      }
    });

    if (removedCount > 0) {
      console.log(`🧹 Limpeza concluída: ${removedCount} arquivo(s) antigo(s) removido(s)`);
    }

  } catch (error) {
    console.error('❌ Erro na limpeza de arquivos:', error.message);
  }
}

/**
 * Obtém informações detalhadas do arquivo
 * @param {string} filePath - Caminho do arquivo
 * @returns {Object} Informações do arquivo
 */
function getFileInfo(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const stats = fs.statSync(filePath);
    return {
      name: path.basename(filePath),
      size: stats.size,
      sizeFormatted: formatFileSize(stats.size),
      created: stats.birthtime,
      modified: stats.mtime,
      extension: path.extname(filePath),
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory()
    };

  } catch (error) {
    console.error(`❌ Erro ao obter informações do arquivo ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Formata tamanho do arquivo em formato legível
 * @param {number} bytes - Tamanho em bytes
 * @returns {string} Tamanho formatado
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Valida extensão de arquivo
 * @param {string} filename - Nome do arquivo
 * @param {Array} allowedExtensions - Extensões permitidas
 * @returns {boolean} Se a extensão é válida
 */
function validateFileExtension(filename, allowedExtensions = ['.pdf']) {
  if (!filename) return false;
  
  const ext = path.extname(filename).toLowerCase();
  return allowedExtensions.includes(ext);
}

module.exports = {
  validatePDF,
  sanitizeFileName,
  ensureDirectoryExists,
  safeDeleteFile,
  cleanupOldFiles,
  getFileInfo,
  formatFileSize,
  validateFileExtension
};
