const express = require('express');
const prisma = require('../utils/prismaClient');

const router = express.Router();

router.patch('/:id/inativar', async (req, res) => {
  try {
    const { id } = req.params;

    const pessoa = await prisma.pessoa.update({
      where: { id: Number(id) },
      data: { status: 'INATIVO' }
    });

    res.json({
      id: pessoa.id,
      status: pessoa.status,
      message: 'Pessoa inativada com sucesso.'
    });
  } catch (error) {
    console.error('❌ Erro ao inativar pessoa:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Erro ao inativar pessoa.'
    });
  }
});

router.patch('/:id/reativar', async (req, res) => {
  try {
    const { id } = req.params;

    const pessoa = await prisma.pessoa.update({
      where: { id: Number(id) },
      data: { status: 'ATIVO' }
    });

    res.json({
      id: pessoa.id,
      status: pessoa.status,
      message: 'Pessoa reativada com sucesso.'
    });
  } catch (error) {
    console.error('❌ Erro ao reativar pessoa:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Erro ao reativar pessoa.'
    });
  }
});

module.exports = router;

