const express = require('express');
const router = express.Router();
const agent02 = require('../services/agent02'); // Alterado de agent01 para agent02

/**
 * @swagger
 * /api/agent/query:
 *   post:
 *     summary: Envia uma pergunta em linguagem natural para o agente de IA.
 *     description: Recebe uma pergunta do usuário, processa usando um pipeline RAG (Retrieval-Augmented Generation) para consultar o banco de dados e retorna uma resposta em linguagem natural.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               query:
 *                 type: string
 *                 description: A pergunta do usuário.
 *                 example: "Quais são os 5 maiores fornecedores em valor total de notas?"
 *               history:
 *                 type: array
 *                 description: O histórico da conversa.
 *     responses:
 *       200:
 *         description: Resposta gerada pela IA.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 answer:
 *                   type: string
 *                   example: "Os 5 maiores fornecedores são: Fornecedor A, Fornecedor B, ..."
 *       400:
 *         description: Erro na requisição (ex: query não fornecida).
 *       500:
 *         description: Erro interno do servidor durante o processamento da pergunta.
 */
router.post('/query', async (req, res) => {
    const { query, history } = req.body;

    if (!query) {
        return res.status(400).json({ error: 'A propriedade "query" é obrigatória no corpo da requisição.' });
    }

    try {
        const answer = await agent02.answerQuery(query, history); // Alterado de agent01 para agent02
        res.json({ answer });
    } catch (error) {
        console.error('Erro na rota /api/agent/query:', error);
        res.status(500).json({ error: 'Falha ao processar a sua pergunta.' });
    }
});

module.exports = router;
