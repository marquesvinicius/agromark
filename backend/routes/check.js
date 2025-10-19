const express = require('express');
const prisma = require('../utils/prismaClient');
const { normalizeDocumento, isValidCPF, isValidCNPJ } = require('../utils/documentUtils');

const router = express.Router();

router.post('/fornecedor', async (req, res) => {
  try {
    const { cnpj } = req.body || {};

    const normalized = normalizeDocumento(cnpj);
    if (!isValidCNPJ(normalized)) {
      return res.status(400).json({
        error: 'INVALID_CNPJ',
        message: 'CNPJ inválido. Informe 14 dígitos válidos.'
      });
    }

    const fornecedor = await prisma.pessoa.findFirst({
      where: {
        documento: normalized,
        tipo: 'FORNECEDOR'
      }
    });

    if (!fornecedor) {
      return res.json({ exists: false, message: 'Fornecedor não encontrado' });
    }

    return res.json({
      exists: true,
      id: fornecedor.id,
      status: fornecedor.status,
      message: `Fornecedor encontrado (ID ${fornecedor.id})`
    });
  } catch (error) {
    console.error('❌ Erro ao verificar fornecedor:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Erro ao verificar fornecedor'
    });
  }
});

router.post('/faturado', async (req, res) => {
  try {
    const { documento } = req.body || {};
    const doc = normalizeDocumento(documento);

    if (!(isValidCPF(doc) || isValidCNPJ(doc))) {
      return res.status(400).json({
        error: 'INVALID_DOCUMENT',
        message: 'Documento inválido. Informe CPF (11 dígitos) ou CNPJ (14 dígitos).'
      });
    }

    const faturado = await prisma.pessoa.findFirst({
      where: {
        documento: doc,
        tipo: 'FATURADO'
      }
    });

    if (!faturado) {
      return res.json({ exists: false, message: 'Faturado/Cliente não encontrado' });
    }

    return res.json({
      exists: true,
      id: faturado.id,
      status: faturado.status,
      message: `Faturado encontrado (ID ${faturado.id})`
    });
  } catch (error) {
    console.error('❌ Erro ao verificar faturado:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Erro ao verificar faturado'
    });
  }
});

router.post('/despesa', async (req, res) => {
  try {
    const { descricao } = req.body || {};

    if (!descricao) {
      return res.status(400).json({
        error: 'INVALID_DESCRIPTION',
        message: 'Descrição da despesa é obrigatória.'
      });
    }

    const normalized = descricao.trim().toUpperCase();

    const classificacao = await prisma.classificacao.findFirst({
      where: {
        descricao: normalized,
        tipo: 'DESPESA'
      }
    });

    if (!classificacao) {
      return res.json({ exists: false, message: 'Classificação de despesa não encontrada' });
    }

    return res.json({
      exists: true,
      id: classificacao.id,
      status: classificacao.status,
      message: `Classificação encontrada (ID ${classificacao.id})`
    });
  } catch (error) {
    console.error('❌ Erro ao verificar despesa:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Erro ao verificar classificação'
    });
  }
});

router.post('/all', async (req, res) => {
  try {
    const {
      fornecedor = {},
      faturado = {},
      classificacaoDespesa,
      classificacoes,
      cliente,
      notaFiscal = {}
    } = req.body || {};

    const fornecedorCnpj = normalizeDocumento(fornecedor.cnpj || fornecedor.documento);
    const faturadoDocumento = normalizeDocumento(faturado.cpf || faturado.cnpj || faturado.documento || cliente?.documento);
    const descricao = (classificacaoDespesa || classificacoes?.[0] || '').toString().trim().toUpperCase();
    const numeroNota = notaFiscal.numero?.toString().trim();

    const [fornecedorResult, faturadoResult, classificacaoResult] = await Promise.all([
      fornecedorCnpj && isValidCNPJ(fornecedorCnpj)
        ? prisma.pessoa.findFirst({ where: { documento: fornecedorCnpj, tipo: 'FORNECEDOR' } })
        : null,
      faturadoDocumento && (isValidCPF(faturadoDocumento) || isValidCNPJ(faturadoDocumento))
        ? prisma.pessoa.findFirst({ where: { documento: faturadoDocumento, tipo: 'FATURADO' } })
        : null,
      descricao
        ? prisma.classificacao.findFirst({ where: { descricao, tipo: 'DESPESA' } })
        : null
    ]);

    // Busca o movimento APENAS se o fornecedor e o número da nota existirem
    let movimentoResult = null;
    if (fornecedorResult && numeroNota) {
      movimentoResult = await prisma.movimentoContas.findFirst({
        where: {
          numeroNotaFiscal: numeroNota,
          fornecedorId: fornecedorResult.id
        }
      });
    }

    res.json({
      fornecedor: fornecedorCnpj
        ? fornecedorResult
          ? {
              exists: true,
              id: fornecedorResult.id,
              status: fornecedorResult.status,
              message: `Fornecedor encontrado – ID: ${fornecedorResult.id}`
            }
          : {
              exists: false,
              message: 'Fornecedor não encontrado'
            }
        : {
            exists: false,
            message: 'CNPJ inválido ou ausente'
          },
      faturado: faturadoDocumento
        ? faturadoResult
          ? {
              exists: true,
              id: faturadoResult.id,
              status: faturadoResult.status,
              message: `Faturado encontrado – ID: ${faturadoResult.id}`
            }
          : {
              exists: false,
              message: 'Faturado/Cliente não encontrado'
            }
        : {
            exists: false,
            message: 'Documento inválido ou ausente'
          },
      despesa: descricao
        ? classificacaoResult
          ? {
              exists: true,
              id: classificacaoResult.id,
              status: classificacaoResult.status,
              message: `Classificação encontrada – ID: ${classificacaoResult.id}`
            }
          : {
              exists: false,
              message: 'Classificação de despesa não encontrada'
            }
        : {
            exists: false,
            message: 'Descrição de despesa ausente'
          },
      movimento: numeroNota && fornecedorCnpj
        ? movimentoResult
          ? {
              exists: true,
              id: movimentoResult.id,
              message: `Nota Fiscal já lançada – ID: ${movimentoResult.id}`
            }
          : {
              exists: false,
              message: 'Nota Fiscal não encontrada'
            }
        : {
            exists: false,
            message: 'Número da NF ou CNPJ do fornecedor ausente'
          }
    });
  } catch (error) {
    console.error('❌ Erro ao verificar dados agregados:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Erro ao verificar dados agregados'
    });
  }
});

module.exports = router;

