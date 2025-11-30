const express = require('express');
const prisma = require('../utils/prismaClient');

const router = express.Router();

// GET - Listar pessoas (filtro por tipo e status opcional)
router.get('/', async (req, res) => {
  try {
    const { tipo, status, search } = req.query;
    
    const where = {};
    if (tipo) where.tipo = tipo;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { razaoSocial: { contains: search, mode: 'insensitive' } },
        { fantasia: { contains: search, mode: 'insensitive' } },
        { documento: { contains: search, mode: 'insensitive' } }
      ];
    }

    const pessoas = await prisma.pessoa.findMany({
      where,
      orderBy: { razaoSocial: 'asc' }
    });

    res.json({
      success: true,
      data: pessoas,
      total: pessoas.length
    });
  } catch (error) {
    console.error('❌ Erro ao buscar pessoas:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Erro ao buscar pessoas.'
    });
  }
});

// POST - Criar pessoa
router.post('/', async (req, res) => {
  try {
    const { tipo, razaoSocial, fantasia, documento } = req.body;

    // Validação básica
    if (!tipo || !razaoSocial || !documento) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Campos obrigatórios: tipo, razaoSocial, documento.'
      });
    }

    // Verificar duplicidade (documento + tipo)
    const existing = await prisma.pessoa.findUnique({
      where: {
        documento_tipo: {
          documento,
          tipo
        }
      }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'DUPLICATE_ENTRY',
        message: 'Já existe uma pessoa cadastrada com este documento e tipo.'
      });
    }

    const pessoa = await prisma.pessoa.create({
      data: {
        tipo,
        razaoSocial,
        fantasia,
        documento,
        status: 'ATIVO' // Padrão exigido
      }
    });

    res.status(201).json({
      success: true,
      data: pessoa,
      message: 'Pessoa criada com sucesso.'
    });
  } catch (error) {
    console.error('❌ Erro ao criar pessoa:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Erro ao criar pessoa.'
    });
  }
});

// PUT - Atualizar pessoa
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { razaoSocial, fantasia, documento } = req.body;

    const pessoa = await prisma.pessoa.update({
      where: { id: Number(id) },
      data: {
        razaoSocial,
        fantasia,
        documento
      }
    });

    res.json({
      success: true,
      data: pessoa,
      message: 'Pessoa atualizada com sucesso.'
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar pessoa:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Erro ao atualizar pessoa.'
    });
  }
});

// PATCH - Inativar (Soft Delete)
router.patch('/:id/inativar', async (req, res) => {
  try {
    const { id } = req.params;

    const pessoa = await prisma.pessoa.update({
      where: { id: Number(id) },
      data: { status: 'INATIVO' }
    });

    res.json({
      success: true,
      data: pessoa,
      message: 'Pessoa inativada com sucesso.'
    });
  } catch (error) {
    console.error('❌ Erro ao inativar pessoa:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Erro ao inativar pessoa.'
    });
  }
});

// PATCH - Reativar
router.patch('/:id/reativar', async (req, res) => {
  try {
    const { id } = req.params;

    const pessoa = await prisma.pessoa.update({
      where: { id: Number(id) },
      data: { status: 'ATIVO' }
    });

    res.json({
      success: true,
      data: pessoa,
      message: 'Pessoa reativada com sucesso.'
    });
  } catch (error) {
    console.error('❌ Erro ao reativar pessoa:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Erro ao reativar pessoa.'
    });
  }
});

module.exports = router;
