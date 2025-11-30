const express = require('express');
const prisma = require('../utils/prismaClient');

const router = express.Router();

// GET - Listar classificações
router.get('/', async (req, res) => {
  try {
    const { tipo, status, search } = req.query;
    
    const where = {};
    if (tipo) where.tipo = tipo;
    if (status) where.status = status;
    if (search) {
      where.descricao = { contains: search, mode: 'insensitive' };
    }

    const classificacoes = await prisma.classificacao.findMany({
      where,
      orderBy: { descricao: 'asc' }
    });

    res.json({
      success: true,
      data: classificacoes,
      total: classificacoes.length
    });
  } catch (error) {
    console.error('❌ Erro ao buscar classificações:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Erro ao buscar classificações.'
    });
  }
});

// POST - Criar classificação
router.post('/', async (req, res) => {
  try {
    const { tipo, descricao } = req.body;

    if (!tipo || !descricao) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Campos obrigatórios: tipo, descricao.'
      });
    }

    const existing = await prisma.classificacao.findUnique({
      where: {
        descricao_tipo: {
          descricao,
          tipo
        }
      }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'DUPLICATE_ENTRY',
        message: 'Já existe uma classificação com esta descrição e tipo.'
      });
    }

    const classificacao = await prisma.classificacao.create({
      data: {
        tipo,
        descricao,
        status: 'ATIVO'
      }
    });

    res.status(201).json({
      success: true,
      data: classificacao,
      message: 'Classificação criada com sucesso.'
    });
  } catch (error) {
    console.error('❌ Erro ao criar classificação:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Erro ao criar classificação.'
    });
  }
});

// PUT - Atualizar classificação
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { descricao } = req.body;

    const classificacao = await prisma.classificacao.update({
      where: { id: Number(id) },
      data: { descricao }
    });

    res.json({
      success: true,
      data: classificacao,
      message: 'Classificação atualizada com sucesso.'
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar classificação:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Erro ao atualizar classificação.'
    });
  }
});

// PATCH - Inativar (Soft Delete)
router.patch('/:id/inativar', async (req, res) => {
  try {
    const { id } = req.params;

    const classificacao = await prisma.classificacao.update({
      where: { id: Number(id) },
      data: { status: 'INATIVO' }
    });

    res.json({
      success: true,
      data: classificacao,
      message: 'Classificação inativada com sucesso.'
    });
  } catch (error) {
    console.error('❌ Erro ao inativar classificação:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Erro ao inativar classificação.'
    });
  }
});

// PATCH - Reativar
router.patch('/:id/reativar', async (req, res) => {
  try {
    const { id } = req.params;

    const classificacao = await prisma.classificacao.update({
      where: { id: Number(id) },
      data: { status: 'ATIVO' }
    });

    res.json({
      success: true,
      data: classificacao,
      message: 'Classificação reativada com sucesso.'
    });
  } catch (error) {
    console.error('❌ Erro ao reativar classificação:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Erro ao reativar classificação.'
    });
  }
});

module.exports = router;
