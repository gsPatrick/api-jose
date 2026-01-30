const express = require('express');
const router = express.Router();
const controller = require('./Bacen.controller');

/**
 * Rotas do Módulo de Risco Financeiro - Crédito Rural
 */

// GET /api/external/bacen/taxas - Obter taxas atuais
router.get('/taxas', controller.obterTaxasAtuais.bind(controller));

// GET /api/external/bacen/historico - Histórico de taxas
router.get('/historico', controller.obterHistorico.bind(controller));

// POST /api/external/bacen/simular - Simular financiamento
router.post('/simular', controller.simularFinanciamento.bind(controller));

// GET /api/external/bacen/analise/:cpf_cnpj - Análise de capacidade
router.get('/analise/:cpf_cnpj', controller.analisarCapacidade.bind(controller));

module.exports = router;
