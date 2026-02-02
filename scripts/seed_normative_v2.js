const OpenAI = require('openai');
const { sequelize } = require('../src/config/db');
const LegalChunk = require('../src/models/LegalChunk');
require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const rawData = `
# BANCO NORMATIVO MOHSIS - SISTEMA DE INFORMAÇÃO JURÍDICA AGRÁRIA
*Versão 2.0 RAG - NÃO SUBSTITUI CONSULTA JURÍDICA PROFISSIONAL*
*Última Verificação de Vigência: 02/02/2026*
---
## CHUNK-001: DISCLAIMER GERAL E ESCOPO DO SISTEMA
**Categoria:** Metadados
**Tags:** #disclaimer #limitacao #escopo #meta
O Mohsis é um sistema de **informação jurídica preliminar** voltado a produtores rurais.
NÃO constitui assessoria jurídica, parecer técnico, consultoria legal ou vínculo contratual.
LIMITAÇÕES INSTITUCIONAIS ABSOLUTAS:
- Não analisa casos concretos, documentos específicos ou contratos individuais
- Não gera documentos jurídicos (contratos, laudos, pareceres, petições)
- Não calcula probabilidade de sucesso em demandas ou "elegibilidade"
- Não estabelece vínculo jurídico com usuário
- Não substitui relacionamento com instituição financeira
- Informações baseadas em dados públicos - vigência sujeita a alterações normativas
---
## CHUNK-002: MCR SEÇÃO 2-6-9 - PRORROGAÇÃO DE DÍVIDAS RURAIS
**Fonte:** Manual de Crédito Rural (MCR) - Seção 2-6-9
**Norma:** Banco Central do Brasil
**Tags:** #prorrogacao #divida #acr #cfc #renegociacao
### CONCEITO INFORMATIVO
Prorrogação é a prática de extensão do prazo de operações de crédito rural, permitida mediante autorização do Conselho Monetário Nacional (CMN).
Conforme MCR 2-6-9, a prorrogação pode ocorrer quando:
- Houver dificuldades supervenientes do tomador do empréstimo
- Fatores externos impactarem a capacidade de pagamento
- Estiverem preenchidos requisitos regulatórios objetivos
---
## CHUNK-003: MCR SEÇÃO 2-6-10 - ALONGAMENTO DE DÍVIDAS
**Fonte:** Manual de Crédito Rural (MCR) - Seção 2-6-10
**Norma:** Banco Central do Brasil
**Tags:** #alongamento #prazo #reestruturacao #fluxoCaixa
Alongamento difere de prorrogação: envolve alteração do cronograma de pagamentos originais.
O MCR 2-6-10 estabelece que alongamentos podem ser realizados visando:
- Adequação do fluxo de caixa à realidade produtiva da safra
- Compatibilização entre colheita e venda da produção
### REQUISITOS FORMAIS TÍPICOS
- Descrição técnica da operação rural
- Demonstração da inviabilidade do cronograma original
- Novo plano de fluxo de caixa
---
## CHUNK-004: RESOLUÇÃO CMN 5.164/2024 - REGRAMENTO GERAL
**Fonte:** Resolução CMN nº 5.164, de 2024
Estabelece procedimentos gerais para operações de crédito rural e instrumentos de registro.
- Define critérios para enquadramento de operações rurais
- Estabelece parâmetros para cálculo de taxas de juros
---
## CHUNK-005: LEI 4.595/1964 - ESTATUTO DOS BANCOS
Institui o Banco Central do Brasil e define organização básica do Sistema Financeiro Nacional.
- Define competências do CMN para regulamentar crédito rural (art. 10)
- Disciplina intervenção em instituições financeiras
---
## CHUNK-006: LEI 8.171/1991 - POLÍTICA AGRÍCOLA
Define diretrizes para organização de políticas agrícolas, incluindo critérios gerais para concessão de crédito rural oficial.
- Artigos 85-90 tratam de financiamento à atividade produtiva rural.
---
## CHUNK-007: ESTATUTO DA TERRA (LEI 4.504/1964)
Regime jurídico da propriedade territorial no Brasil.
- Art. 7º: Direitos reais sobre imóveis rurais.
- Impenhorabilidade: O Estatuto estabelece proteções, mas depende de requisitos específicos (LC 93/2024).
---
## CHUNK-008: LEI COMPLEMENTAR 93/2024 - IMPENHORABILIDADE DO BEM DE FAMÍLIA RURAL
Expande conceito de bem de família para imóvel produtivo rural, desde que utilizado para fonte de renda familiar.
- Não se aplica se o imóvel foi dado em garantia fiduciária específica.
---
## CHUNK-009: RESOLUÇÃO BACEN 4.901/2021 - SUSTENTABILIDADE
Estabelece critérios para enquadramento de operações de crédito rural sustentável.
- Regularidade ambiental (CAR ativo) e ausência de embargos do IBAMA são requisitos.
---
## CHUNK-010: JURISPRUDÊNCIA STJ - SÚMULA 298
"Prescreve em cinco anos a ação de cobrança de dívida originária de contrato de crédito rural."
---
## CHUNK-011: DIRETRIZES ÉTICAS - PROIBIÇÕES ABSOLUTAS (Red Lines)
O sistema NUNCA poderá utilizar:
❌ "Você tem direito à prorrogação"
❌ "O banco é obrigado a conceder..."
❌ "Este é o resultado certo/outorgado"
❌ "Não precisa pagar a dívida"
---
## CHUNK-012: DIRETRIZES ÉTICAS - LINGUAGEM PERMITIDA
✅ "A norma prevê a possibilidade de..."
✅ "Em tese, os requisitos incluem..."
✅ "Para análise específica, sugere-se consulta com advogado."
Frases obrigatórias: "Esta informação não substitui consulta jurídica profissional."
---
## CHUNK-013: PROCEDIMENTOS SICAR - CADASTRO AMBIENTAL RURAL
Registro eletrônico obrigatório de imóveis rurais.
Informações: Status do CAR, percentuais de Reserva Legal e APP.
---
## CHUNK-014: CONSULTA IBAMA - EMBARGOS E AUTUAÇÕES
Dados de embargos ativos e autuações ambientais. Embargos podem restringir acesso a crédito rural.
---
## CHUNK-015: PLANO SAFRA 2024/2025 - INFORMAÇÕES PROGRAMÁTICAS
Prazos orientativos: Custeio agrícola (até 12 meses), Investimento (até 10 anos).
Taxas efetivas dependem de negociação e relacionamento.
---
## CHUNK-016: AGENDAMENTO COM ADVOCACIA - PROCEDIMENTO
Indicado para: Análise de contrato específico, Defesa em ações de execução, Planejamento patrimonial.
---
## CHUNK-017: DECRETO 167/1967 - CRÉDITO RURAL INDUSTRIAL
Regulamenta financiamento à indústria de processamento de produtos rurais.
---
## CHUNK-018: RESOLUÇÕES CMN RECENTES (2024-2025)
Atualizações constantes de limites e regras de renegociação. Verifique sempre versão consolidada.
---
## CHUNK-019: SISTEMA DE ATUALIZAÇÃO NORMATIVA
Última verificação oficial: 02/02/2026. Normas podem ser modificadas por MPs ou Resoluções.
---
## CHUNK-020: CENÁRIO ILUSTRATIVO - PRORROGAÇÃO EM SECA
Exemplo didático: O MCR 2-6-9 prevê que pode ser possível analisar prorrogação em dificuldades supervenientes. Não é direito automático.
---
## CHUNK-021: CENÁRIO ILUSTRATIVO - ALONGAMENTO DE FLUXO
Exemplo didático: Alongamento pode adequar pagamentos ao ciclo biológico da cultura (ex: fruticultura).
---
## CHUNK-022: PERFIL REGIONAL - NORDESTE
Semiárido com pecuária e fruticultura irrigada. Acompanhe programas emergenciais para seca.
---
## CHUNK-023: PERFIL REGIONAL - BAHIA/ALAGOAS
Oeste da Bahia (soja/milho), Zona da Mata Alagoas (cana), Vale do São Francisco (fruticultura).
---
## CHUNK-024: VERIFICAÇÃO DE VIGÊNCIA AUTOMÁTICA
O sistema consulta Resoluções CMN e Portarias MAPA diariamente.
---
## CHUNK-025: ZARC - ZONEAMENTO AGRÍCOLA DE RISCO CLIMÁTICO
Define épocas de plantio. Aderência ao ZARC pode ser requisito para seguro e crédito.
`;

async function seed() {
    console.log("Starting Seeding of Normative V2.0...");
    const chunks = rawData.split('---').filter(c => c.trim().length > 0);

    for (let i = 0; i < chunks.length; i++) {
        const text = chunks[i].trim();
        const docId = 'BANCO_NORMATIVO_V2';
        const chunkId = `CHUNK-${String(i + 1).padStart(3, '0')}`;

        console.log(`Generating embedding for ${chunkId}...`);
        const response = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: text,
        });
        const embedding = response.data[0].embedding;

        await LegalChunk.create({
            doc_id: docId,
            chunk_id: chunkId,
            text: text,
            source: 'MOHSIS_NORM_V2',
            embedding: embedding
        });
    }
    console.log("Seeding completed successfully!");
    process.exit(0);
}

seed().catch(err => {
    console.error("Seeding failed:", err);
    process.exit(1);
});
