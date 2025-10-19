const express = require('express');
const prisma = require('../utils/prismaClient');

const router = express.Router();

router.patch('/:id/inativar', async (req, res) => {
  try {
    const { id } = req.params;

    const classificacao = await prisma.classificacao.update({
      where: { id: Number(id) },
      data: { status: 'INATIVO' }
    });

    res.json({
      id: classificacao.id,
      status: classificacao.status,
      message: 'Classificação inativada com sucesso.'
    });
  } catch (error) {
    console.error('❌ Erro ao inativar classificação:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Erro ao inativar classificação.'
    });
  }
});

router.patch('/:id/reativar', async (req, res) => {
  try {
    const { id } = req.params;

    const classificacao = await prisma.classificacao.update({
      where: { id: Number(id) },
      data: { status: 'ATIVO' }
    });

    res.json({
      id: classificacao.id,
      status: classificacao.status,
      message: 'Classificação reativada com sucesso.'
    });
  } catch (error) {
    console.error('❌ Erro ao reativar classificação:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Erro ao reativar classificação.'
    });
  }
});

module.exports = router;

