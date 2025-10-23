const express = require('express');
const prisma = require('../utils/prismaClient');
const { normalizeDocumento, isValidCNPJ, isValidCPF } = require('../utils/documentUtils');
const { rateLimiter, transactionRateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.use(rateLimiter);
router.use(transactionRateLimiter);

router.post('/necessary', async (req, res) => {
  try {
    const {
      fornecedor = {},
      faturado = {},
      classificacaoDespesa,
      classificacoes,
      cliente
    } = req.body || {};

    // Bypass da validação de documentos para ambiente acadêmico
    /*
    const fornecedorCnpj = normalizeDocumento(fornecedor.cnpj || fornecedor.documento);
    if (!isValidCNPJ(fornecedorCnpj)) {
      return res.status(400).json({
        error: 'INVALID_CNPJ',
        message: 'CNPJ do fornecedor inválido.'
      });
    }

    const faturadoDocumento = normalizeDocumento(
      faturado.cpf || faturado.cnpj || faturado.documento || cliente?.documento
    );
    const faturadoIsValid = isValidCPF(faturadoDocumento) || isValidCNPJ(faturadoDocumento);
    if (!faturadoIsValid) {
      return res.status(400).json({
        error: 'INVALID_DOCUMENT',
        message: 'Documento do faturado inválido.'
      });
    }
    */
    const fornecedorCnpj = normalizeDocumento(fornecedor.cnpj || fornecedor.documento);
    const faturadoDocumento = normalizeDocumento(
      faturado.cpf || faturado.cnpj || faturado.documento || cliente?.documento
    );

    // Descrição da classificação: aceitar vazio e padronizar
    let descricao = (classificacaoDespesa || (Array.isArray(classificacoes) ? classificacoes[0] : classificacoes) || '')
      .toString()
      .trim()
      .toUpperCase();

    if (!descricao) {
      // fallback amigável para ambiente acadêmico
      descricao = 'OUTROS';
    }

    const fornecedorRecord = await prisma.pessoa.upsert({
      where: {
        documento_tipo: {
          documento: fornecedorCnpj,
          tipo: 'FORNECEDOR'
        }
      },
      create: {
        tipo: 'FORNECEDOR',
        documento: fornecedorCnpj,
        razaoSocial: fornecedor.razaoSocial || 'Fornecedor sem nome',
        fantasia: fornecedor.fantasia || fornecedor.nomeFantasia || null
      },
      update: {}
    });

    const faturadoRecord = await prisma.pessoa.upsert({
      where: {
        documento_tipo: {
          documento: faturadoDocumento,
          tipo: 'FATURADO'
        }
      },
      create: {
        tipo: 'FATURADO',
        documento: faturadoDocumento,
        razaoSocial: faturado.nome || faturado.razaoSocial || 'Faturado sem nome',
        fantasia: faturado.fantasia || null
      },
      update: {}
    });

    const classificacaoRecord = await prisma.classificacao.upsert({
      where: {
        descricao_tipo: {
          descricao,
          tipo: 'DESPESA'
        }
      },
      create: {
        tipo: 'DESPESA',
        descricao
      },
      update: {}
    });

    res.status(200).json({
      fornecedorId: fornecedorRecord.id,
      faturadoId: faturadoRecord.id,
      classificacaoIds: [classificacaoRecord.id]
    });
  } catch (error) {
    console.error('❌ Erro ao criar registros necessários:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Erro ao criar registros necessários'
    });
  }
});

module.exports = router;

