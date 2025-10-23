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
    const raw = req.body || {};

    // Logs de diagnóstico
    console.log('\n===== POST /api/movimentos - INÍCIO =====');
    console.log('Content-Type:', req.headers['content-type']);
    try { console.log('Body keys:', Object.keys(raw)); } catch {}

    // Aceitar múltiplos formatos de payload (ambiente acadêmico/dev)
    let movimento = raw.movimento ?? raw.movement ?? null;
    let parcelas = Array.isArray(raw.parcelas) ? raw.parcelas : raw.parcelas || [];
    let classificacoes = Array.isArray(raw.classificacoes)
      ? raw.classificacoes
      : (Array.isArray(raw.classificacaoIds) ? raw.classificacaoIds : raw.classificacaoIds || []);

    // Tentar parsear strings JSON se necessário
    try {
      if (typeof movimento === 'string') movimento = JSON.parse(movimento);
    } catch (e) { console.warn('movimento veio como string inválida'); }
    try {
      if (typeof parcelas === 'string') parcelas = JSON.parse(parcelas);
    } catch (e) { console.warn('parcelas veio como string inválida'); parcelas = []; }
    try {
      if (typeof classificacoes === 'string') classificacoes = JSON.parse(classificacoes);
    } catch (e) { console.warn('classificacoes veio como string inválida'); classificacoes = []; }

    // Suportar formato plano no body (sem wrapper movimento)
    if (!movimento && raw.numeroNotaFiscal && (raw.fornecedorId || raw.fornecedor_id) && (raw.faturadoId || raw.faturado_id)) {
      movimento = {
        numeroNotaFiscal: raw.numeroNotaFiscal,
        dataEmissao: raw.dataEmissao,
        valorTotal: raw.valorTotal,
        fornecedorId: raw.fornecedorId ?? raw.fornecedor_id,
        faturadoId: raw.faturadoId ?? raw.faturado_id,
        descricao: raw.descricao
      };
      console.log('Reconstruído movimento a partir do formato plano.');
    }

    console.log('Tem movimento?', !!movimento);

    if (!movimento) {
      console.warn('Payload recebido sem movimento válido:', JSON.stringify(raw).slice(0, 1000));
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
      console.warn('Campos obrigatórios ausentes:', {
        numeroNotaFiscal: !!numeroNotaFiscal,
        dataEmissao: !!dataEmissao,
        valorTotal: !!valorTotal,
        fornecedorId: !!fornecedorId,
        faturadoId: !!faturadoId
      });
      return res.status(400).json({
        error: 'INVALID_MOVIMENTO',
        message: 'Campos obrigatórios do movimento ausentes.'
      });
    }

    // Se não houver parcelas, cria 1 parcela padrão
    if (!Array.isArray(parcelas) || parcelas.length === 0) {
      parcelas = [{
        identificacao: `${numeroNotaFiscal}-parcela-01`,
        dataVencimento: dataEmissao,
        valor: valorTotal,
        valorSaldo: valorTotal
      }];
      console.log('Parcelas ausentes — criada 1 parcela padrão.');
    }

    // Se não houver classificações, aceita vazio (pode ser ajustado depois)
    if (!Array.isArray(classificacoes)) {
      classificacoes = [];
    }

    // Verificar duplicidade de movimento por NF + fornecedor
    const movimentoExistente = await prisma.movimentoContas.findFirst({
      where: { numeroNotaFiscal, fornecedorId }
    });
    if (movimentoExistente) {
      return res.status(409).json({
        error: 'MOVIMENTO_JA_EXISTE',
        message: 'Este movimento já foi lançado para este fornecedor.'
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

      // Garantir identificações únicas de parcelas ANTES de criar
      const parcelasCreated = [];
      for (let index = 0; index < parcelas.length; index += 1) {
        const parcela = parcelas[index];
        // Usa o ID do movimento para garantir unicidade global do identificador
        const baseId = parcela.identificacao || `${numeroNotaFiscal}-${movimentoCreated.id}-parcela-${String(index + 1).padStart(2, '0')}`;

        let identificacao = baseId;
        // Tentar até ser único (camada de segurança)
        for (let attempt = 0; attempt < 5; attempt += 1) {
          const exists = await tx.parcelaContas.findFirst({ where: { identificacao } });
          if (!exists) break;
          identificacao = `${baseId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        }

        const created = await tx.parcelaContas.create({
          data: {
            identificacao,
            dataVencimento: new Date(parcela.dataVencimento || dataEmissao),
            valorParcela: parcela.valor,
            valorSaldo: parcela.valorSaldo ?? parcela.valor,
            movimentoId: movimentoCreated.id
          }
        });
        parcelasCreated.push(created);
      }

      const classificacoesCreated = await Promise.all(
        (classificacoes || []).map((classificacaoId) => tx.movimentoClassificacao.create({
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

    console.log('Movimento criado com sucesso:', result.movimento.id);
    console.log('===== POST /api/movimentos - FIM =====\n');

    res.status(201).json({
      movimentoId: result.movimento.id,
      parcelaIds: result.parcelas.map((p) => p.id),
      classificacaoIds: result.classificacoes.map((c) => c.classificacaoId)
    });
  } catch (error) {
    console.error('❌ Erro ao lançar movimento:', error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        error: 'MOVIMENTO_JA_EXISTE',
        message: 'Este movimento já foi lançado (parcela identificada como duplicada).'
      });
    }

    // Erros de transação abortada (25P02) podem aparecer como erro desconhecido
    if (String(error.message || '').includes('25P02')) {
      return res.status(409).json({
        error: 'MOVIMENTO_JA_EXISTE',
        message: 'Este movimento já foi lançado (transação abortada por duplicidade).'
      });
    }

    res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Erro ao criar movimento.'
    });
  }
});

// DELETE - Remove um movimento e dependências
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || Number.isNaN(id)) {
      return res.status(400).json({ error: 'INVALID_ID', message: 'ID inválido.' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.movimentoClassificacao.deleteMany({ where: { movimentoId: id } });
      await tx.parcelaContas.deleteMany({ where: { movimentoId: id } });
      await tx.movimentoContas.delete({ where: { id } });
    });

    res.status(200).json({ success: true, message: 'Movimento excluído com sucesso.' });
  } catch (error) {
    console.error('❌ Erro ao excluir movimento:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Movimento não encontrado.' });
    }
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Erro ao excluir movimento.' });
  }
});

module.exports = router;

