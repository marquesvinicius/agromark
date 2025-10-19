const express = require('express');
const prisma = require('../utils/prismaClient');
const { rateLimiter, transactionRateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.use(rateLimiter);
router.use(transactionRateLimiter);

// GET - Listar todos os movimentos
router.get('/', async (req, res) => {
  try {
    const movimentos = await prisma.movimentoContas.findMany({
      include: {
        fornecedor: {
          select: {
            id: true,
            razaoSocial: true,
            fantasia: true,
            documento: true,
            tipo: true
          }
        },
        faturado: {
          select: {
            id: true,
            razaoSocial: true,
            fantasia: true,
            documento: true,
            tipo: true
          }
        },
        parcelas: {
          select: {
            id: true,
            identificacao: true,
            dataVencimento: true,
            valorParcela: true,
            valorSaldo: true,
            statusParcela: true
          }
        },
        classificacoes: {
          include: {
            classificacao: {
              select: {
                id: true,
                descricao: true,
                tipo: true
              }
            }
          }
        }
      },
      orderBy: {
        dataEmissao: 'desc'
      }
    });

    // Formatar dados para o frontend
    const movimentosFormatados = movimentos.map(mov => ({
      id: mov.id,
      numeroNotaFiscal: mov.numeroNotaFiscal,
      dataEmissao: mov.dataEmissao,
      valorTotal: parseFloat(mov.valorTotal),
      descricao: mov.descricao,
      fornecedor: {
        id: mov.fornecedor?.id,
        razaoSocial: mov.fornecedor?.razaoSocial || 'Não informado',
        documento: mov.fornecedor?.documento
      },
      faturado: {
        id: mov.faturado?.id,
        razaoSocial: mov.faturado?.razaoSocial || 'Não informado',
        documento: mov.faturado?.documento
      },
      parcelas: mov.parcelas || [],
      classificacoes: mov.classificacoes?.map(mc => mc.classificacao) || []
    }));

    res.json({
      success: true,
      data: movimentosFormatados,
      total: movimentosFormatados.length
    });
  } catch (error) {
    console.error('❌ Erro ao buscar movimentos:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Erro ao buscar movimentos.'
    });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      movimento,
      parcelas = [],
      classificacoes = []
    } = req.body || {};

    if (!movimento) {
      return res.status(400).json({
        error: 'INVALID_PAYLOAD',
        message: 'Dados do movimento são obrigatórios.'
      });
    }

    const {
      numeroNotaFiscal,
      dataEmissao,
      valorTotal,
      fornecedorId,
      faturadoId,
      descricao
    } = movimento;

    if (!numeroNotaFiscal || !dataEmissao || !valorTotal || !fornecedorId || !faturadoId) {
      return res.status(400).json({
        error: 'INVALID_MOVIMENTO',
        message: 'Campos obrigatórios do movimento ausentes.'
      });
    }

    if (!Array.isArray(parcelas) || parcelas.length === 0) {
      return res.status(400).json({
        error: 'INVALID_PARCELAS',
        message: 'Informe ao menos uma parcela.'
      });
    }

    if (!Array.isArray(classificacoes) || classificacoes.length === 0) {
      return res.status(400).json({
        error: 'INVALID_CLASSIFICACOES',
        message: 'Informe ao menos uma classificação.'
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const movimentoCreated = await tx.movimentoContas.create({
        data: {
          tipo: 'APAGAR',
          numeroNotaFiscal,
          dataEmissao: new Date(dataEmissao),
          descricao: descricao || null,
          valorTotal,
          fornecedorId,
          faturadoId
        }
      });

      const parcelasCreated = await Promise.all(
        parcelas.map((parcela, index) => {
          const identificacao = parcela.identificacao
            || `${numeroNotaFiscal}-parcela-${String(index + 1).padStart(2, '0')}`;

          return tx.parcelaContas.create({
            data: {
              identificacao,
              dataVencimento: new Date(parcela.dataVencimento),
              valorParcela: parcela.valor,
              valorSaldo: parcela.valorSaldo ?? parcela.valor,
              movimentoId: movimentoCreated.id
            }
          });
        })
      );

      const classificacoesCreated = await Promise.all(
        classificacoes.map((classificacaoId) => tx.movimentoClassificacao.create({
          data: {
            movimentoId: movimentoCreated.id,
            classificacaoId
          }
        }))
      );

      return {
        movimento: movimentoCreated,
        parcelas: parcelasCreated,
        classificacoes: classificacoesCreated
      };
    });

    res.status(201).json({
      movimentoId: result.movimento.id,
      parcelaIds: result.parcelas.map((p) => p.id),
      classificacaoIds: result.classificacoes.map((c) => c.classificacaoId)
    });
  } catch (error) {
    console.error('❌ Erro ao lançar movimento:', error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        error: 'DUPLICATE_ENTRY',
        message: 'Uma parcela com a mesma identificação já existe.'
      });
    }

    res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Erro ao criar movimento.'
    });
  }
});

module.exports = router;

