/**
 * Controller para Análise de Risco Financeiro - Crédito Rural
 */

const bacenService = require('./Bacen.service');

class RiscoFinanceiroController {
    /**
     * GET /api/external/bacen/taxas
     * Retorna as taxas atuais de crédito rural
     */
    async obterTaxasAtuais(req, res) {
        try {
            const taxas = await bacenService.obterTaxasCreditoRuralAtuais();

            res.json({
                sucesso: true,
                dados: taxas,
                mensagem: 'Taxas atuais obtidas com sucesso'
            });

        } catch (error) {
            console.error('[Controller] Erro ao obter taxas:', error);
            res.status(500).json({
                sucesso: false,
                erro: error.message,
                detalhes: 'Falha ao consultar API do Banco Central'
            });
        }
    }

    /**
     * GET /api/external/bacen/historico
     * Retorna histórico de taxas
     */
    async obterHistorico(req, res) {
        try {
            const { tipo = 'taxasReguladasPF', dataInicial, dataFinal } = req.query;

            // Validações
            if (!dataInicial || !dataFinal) {
                return res.status(400).json({
                    sucesso: false,
                    erro: 'dataInicial e dataFinal são obrigatórios (formato DD/MM/AAAA)'
                });
            }

            if (!bacenService.validarDataBR(dataInicial) || !bacenService.validarDataBR(dataFinal)) {
                return res.status(400).json({
                    sucesso: false,
                    erro: 'Formato de data inválido. Use DD/MM/AAAA'
                });
            }

            const historico = await bacenService.obterHistoricoCreditoRural(
                tipo,
                dataInicial,
                dataFinal
            );

            res.json({
                sucesso: true,
                dados: {
                    tipo,
                    periodo: { dataInicial, dataFinal },
                    registros: historico.length,
                    valores: historico
                }
            });

        } catch (error) {
            console.error('[Controller] Erro ao obter histórico:', error);
            res.status(500).json({
                sucesso: false,
                erro: error.message
            });
        }
    }

    /**
     * POST /api/external/bacen/simular
     * Simula financiamento com base nas taxas atuais
     */
    async simularFinanciamento(req, res) {
        try {
            const { valor, prazo, tipoTaxa = 'taxasReguladasPF' } = req.body;

            // Validações
            if (!valor || !prazo) {
                return res.status(400).json({
                    sucesso: false,
                    erro: 'Campos obrigatórios: valor, prazo'
                });
            }

            if (valor <= 0 || prazo <= 0) {
                return res.status(400).json({
                    sucesso: false,
                    erro: 'Valor e prazo devem ser maiores que zero'
                });
            }

            if (prazo > 360) {
                return res.status(400).json({
                    sucesso: false,
                    erro: 'Prazo máximo: 360 meses (30 anos)'
                });
            }

            // Busca taxa atual
            const taxas = await bacenService.obterTaxasCreditoRuralAtuais();
            const taxaAplicavel = taxas[tipoTaxa];

            if (!taxaAplicavel) {
                return res.status(404).json({
                    sucesso: false,
                    erro: `Taxa não encontrada para o tipo: ${tipoTaxa}`
                });
            }

            // Calcula simulação
            const simulacao = bacenService.calcularCapacidadePagamento(
                parseFloat(valor),
                parseInt(prazo),
                taxaAplicavel.taxa
            );

            res.json({
                sucesso: true,
                dados: {
                    simulacao,
                    taxaUtilizada: {
                        tipo: tipoTaxa,
                        ...taxaAplicavel
                    },
                    dataSimulacao: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('[Controller] Erro ao simular:', error);
            res.status(500).json({
                sucesso: false,
                erro: error.message
            });
        }
    }

    /**
     * GET /api/external/bacen/analise/:cpf_cnpj
     * Analisa capacidade de pagamento de um produtor
     */
    async analisarCapacidade(req, res) {
        try {
            const { cpf_cnpj } = req.params;
            const { valorSolicitado, prazoMeses, rendaMensal } = req.query;

            // Validações básicas
            if (!valorSolicitado || !prazoMeses || !rendaMensal) {
                return res.status(400).json({
                    sucesso: false,
                    erro: 'Parâmetros obrigatórios: valorSolicitado, prazoMeses, rendaMensal'
                });
            }

            // Busca taxa atual
            const taxas = await bacenService.obterTaxasCreditoRuralAtuais();
            const taxaRegulada = taxas.taxasReguladasPF;

            // Calcula simulação
            const simulacao = bacenService.calcularCapacidadePagamento(
                parseFloat(valorSolicitado),
                parseInt(prazoMeses),
                taxaRegulada.taxa
            );

            // Análise de capacidade (30% da renda comprometida é limite)
            const rendaMensalNum = parseFloat(rendaMensal);
            const comprometimentoRenda = (simulacao.valorParcela / rendaMensalNum) * 100;
            const aprovado = comprometimentoRenda <= 30;

            res.json({
                sucesso: true,
                dados: {
                    produtor: cpf_cnpj,
                    simulacao,
                    analise: {
                        rendaMensal: rendaMensalNum,
                        comprometimentoRenda: parseFloat(comprometimentoRenda.toFixed(2)),
                        limiteComprometimento: 30,
                        situacao: aprovado ? 'APROVADO' : 'REPROVADO',
                        recomendacao: aprovado
                            ? 'Capacidade de pagamento adequada'
                            : `Comprometimento de renda acima do limite (${comprometimentoRenda.toFixed(1)}% > 30%)`
                    },
                    taxaAplicada: taxaRegulada
                }
            });

        } catch (error) {
            console.error('[Controller] Erro na análise:', error);
            res.status(500).json({
                sucesso: false,
                erro: error.message
            });
        }
    }
}

module.exports = new RiscoFinanceiroController();
