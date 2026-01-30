/**
 * Serviço de Integração com API SGS do Banco Central
 * @module BacenService
 */

const axios = require('axios');

class BacenService {
    constructor() {
        this.baseURL = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs';

        // Séries Temporais Validadas para Crédito Rural
        this.seriesCreditoRural = {
            taxasReguladasPF: 20770,      // Taxa média - PF - Taxas reguladas
            creditoRuralTotalPF: 20771,   // Taxa média - PF - Total
            taxasReguladasMensalPF: 25495 // Taxa média mensal - PF - Taxas reguladas
        };

        // Configurações
        this.timeout = 15000; // 15 segundos
        this.maxRetries = 3;
    }

    /**
     * Consulta série temporal do SGS
     * @param {number} codigoSerie - Código da série (ex: 20770)
     * @param {string} dataInicial - Data inicial DD/MM/AAAA (opcional)
     * @param {string} dataFinal - Data final DD/MM/AAAA (opcional)
     * @param {number} ultimos - Número de últimos valores (opcional)
     * @returns {Promise<Array>} Array de objetos {data, valor, dataFormatada}
     */
    async consultarSerie(codigoSerie, dataInicial = null, dataFinal = null, ultimos = null) {
        try {
            let url = `${this.baseURL}.${codigoSerie}/dados?formato=json`;

            // Endpoint para últimos N valores
            if (ultimos) {
                url = `${this.baseURL}.${codigoSerie}/dados/ultimos/${ultimos}?formato=json`;
            } else {
                // Filtros de data
                if (dataInicial) url += `&dataInicial=${dataInicial}`;
                if (dataFinal) url += `&dataFinal=${dataFinal}`;
            }

            console.log(`[BacenService] Consultando: ${url}`);

            const response = await axios.get(url, {
                timeout: this.timeout,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'NodeJS-Backend-CreditoRural/1.0'
                }
            });

            if (!response.data || !Array.isArray(response.data)) {
                throw new Error('Formato de resposta inválido da API Bacen');
            }

            if (response.data.length === 0) {
                console.warn(`[BacenService] Nenhum dado encontrado para série ${codigoSerie}`);
                return [];
            }

            // Processa e formata os dados
            const dadosFormatados = response.data.map(item => ({
                data: item.data,                        // Mantém formato original DD/MM/AAAA
                valor: parseFloat(item.valor),          // Converte para número
                dataFormatada: this.converterDataBR(item.data) // Objeto Date
            }));

            console.log(`[BacenService] ${dadosFormatados.length} registros obtidos`);
            return dadosFormatados;

        } catch (error) {
            this.tratarErro(error, codigoSerie);
        }
    }

    /**
     * Obtém taxas atuais de crédito rural
     * @returns {Promise<Object>} Objeto com todas as taxas disponíveis
     */
    async obterTaxasCreditoRuralAtuais() {
        try {
            console.log('[BacenService] Buscando taxas atuais de crédito rural...');

            // Busca últimos 3 valores de cada série (para garantir dados recentes)
            const [taxasReguladas, creditoTotal, taxasMensais] = await Promise.all([
                this.consultarSerie(this.seriesCreditoRural.taxasReguladasPF, null, null, 3),
                this.consultarSerie(this.seriesCreditoRural.creditoRuralTotalPF, null, null, 3),
                this.consultarSerie(this.seriesCreditoRural.taxasReguladasMensalPF, null, null, 3)
            ]);

            const resultado = {
                taxasReguladasPF: this.obterUltimaTaxa(taxasReguladas),
                creditoRuralTotalPF: this.obterUltimaTaxa(creditoTotal),
                taxasReguladasMensalPF: this.obterUltimaTaxa(taxasMensais),
                dataConsulta: new Date().toISOString(),
                fonte: 'Banco Central do Brasil - SGS'
            };

            console.log('[BacenService] Taxas obtidas com sucesso');
            return resultado;

        } catch (error) {
            console.error('[BacenService] Erro ao obter taxas:', error.message);
            throw new Error(`Falha ao consultar taxas de crédito rural: ${error.message}`);
        }
    }

    /**
     * Obtém histórico de uma série específica
     * @param {string} tipoSerie - 'taxasReguladasPF', 'creditoRuralTotalPF' ou 'taxasReguladasMensalPF'
     * @param {string} dataInicial - Data inicial DD/MM/AAAA
     * @param {string} dataFinal - Data final DD/MM/AAAA
     * @returns {Promise<Array>}
     */
    async obterHistoricoCreditoRural(tipoSerie = 'taxasReguladasPF', dataInicial, dataFinal) {
        const codigoSerie = this.seriesCreditoRural[tipoSerie];

        if (!codigoSerie) {
            throw new Error(`Tipo de série inválido: ${tipoSerie}. Valores aceitos: taxasReguladasPF, creditoRuralTotalPF, taxasReguladasMensalPF`);
        }

        return await this.consultarSerie(codigoSerie, dataInicial, dataFinal);
    }

    /**
     * Calcula capacidade de pagamento (Sistema Price)
     * @param {number} valorFinanciamento - Valor a financiar
     * @param {number} prazoMeses - Prazo em meses
     * @param {number} taxaAnual - Taxa de juros anual (%)
     * @returns {Object} Objeto com simulação completa
     */
    calcularCapacidadePagamento(valorFinanciamento, prazoMeses, taxaAnual) {
        // Converte taxa anual para mensal (juros compostos)
        const taxaMensal = Math.pow(1 + taxaAnual / 100, 1 / 12) - 1;

        // Fórmula da Tabela Price
        const fatorPrice = (taxaMensal * Math.pow(1 + taxaMensal, prazoMeses)) /
            (Math.pow(1 + taxaMensal, prazoMeses) - 1);

        const valorParcela = valorFinanciamento * fatorPrice;
        const valorTotal = valorParcela * prazoMeses;
        const totalJuros = valorTotal - valorFinanciamento;

        return {
            valorFinanciamento: parseFloat(valorFinanciamento.toFixed(2)),
            prazoMeses: parseInt(prazoMeses),
            taxaAnual: parseFloat(taxaAnual.toFixed(4)),
            taxaMensal: parseFloat((taxaMensal * 100).toFixed(4)),
            valorParcela: parseFloat(valorParcela.toFixed(2)),
            valorTotal: parseFloat(valorTotal.toFixed(2)),
            totalJuros: parseFloat(totalJuros.toFixed(2)),
            custoEfetivoTotal: parseFloat(((totalJuros / valorFinanciamento) * 100).toFixed(2))
        };
    }

    /**
     * Valida formato de data brasileira
     * @param {string} data - Data no formato DD/MM/AAAA
     * @returns {boolean}
     */
    validarDataBR(data) {
        const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        if (!regex.test(data)) return false;

        const [, dia, mes, ano] = data.match(regex);
        const d = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));

        return d.getDate() === parseInt(dia) &&
            d.getMonth() === parseInt(mes) - 1 &&
            d.getFullYear() === parseInt(ano);
    }

    /**
     * Helpers Internos
     */

    obterUltimaTaxa(serie) {
        if (!serie || serie.length === 0) return null;

        const ultima = serie[serie.length - 1];
        return {
            taxa: ultima.valor,
            referencia: ultima.data,
            dataReferencia: ultima.dataFormatada
        };
    }

    converterDataBR(dataBR) {
        const [dia, mes, ano] = dataBR.split('/');
        return new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
    }

    tratarErro(error, codigoSerie) {
        if (error.response) {
            // Erro HTTP (4xx, 5xx)
            const status = error.response.status;
            const mensagem = error.response.data?.message || error.response.statusText;

            if (status === 404) {
                throw new Error(`Série ${codigoSerie} não encontrada na API Bacen`);
            } else if (status === 400) {
                throw new Error(`Parâmetros inválidos na consulta à série ${codigoSerie}`);
            } else if (status >= 500) {
                throw new Error(`Erro no servidor do Banco Central (${status})`);
            }

            throw new Error(`Erro HTTP ${status} na API Bacen: ${mensagem}`);

        } else if (error.request) {
            // Requisição feita mas sem resposta
            throw new Error('Timeout ou sem resposta da API do Banco Central. Tente novamente.');

        } else if (error.code === 'ENOTFOUND') {
            throw new Error('Não foi possível conectar à API do Banco Central. Verifique sua conexão.');

        } else {
            // Erro na configuração da requisição
            throw new Error(`Erro ao configurar requisição: ${error.message}`);
        }
    }
}

// Exporta instância única (Singleton)
module.exports = new BacenService();
