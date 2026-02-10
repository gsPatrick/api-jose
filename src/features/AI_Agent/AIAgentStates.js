// AIAgentStates.js - V19.0: Extended State Machine (56 States)
// Direito Agrário & Bancário Specialist

const FOOTER = "\n\n(Comandos: M | V | 0 | S | P)";

const STATE_TEXTS = {
    // 00 - Disclaimer Inicial
    PRIMEIRO_CONTATO: `Mohsis:
Olá! Eu sou o Mohsis, assistente virtual do escritório do Dr. Júnior Lopes.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MOHSIS — INFORMAÇÃO JURÍDICA PRELIMINAR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Antes de começarmos, é importante você saber:
• Este é um serviço de INFORMAÇÃO JURÍDICA PRELIMINAR realizado com IA sob supervisão humana da equipe do Dr. Júnior Lopes.
• Não substitui consulta com advogado especializado.
• Não analiso documentos específicos nem garanto resultados.
• Para decisões importantes, sempre procure um advogado especializado em Direito Agrário e Bancário.
Seus dados estão protegidos (LGPD). Digite P ou PRIVACIDADE a qualquer momento.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ao continuar você concorda com nossos termos.

[1] CONTINUAR`,

    // 01 - Menu Principal
    START: `Mohsis:
Como posso te ajudar hoje?

[1] Estou com dívida no banco e quero renegociar
[2] Preciso de mais prazo para pagar (Alongamento)
[3] Quero proteger minha propriedade da penhora
[4] Preciso regularizar a documentação ambiental (CAR/Embargo)
[5] Quero entender melhor a legislação (MCR/Leis)
[6] Ver decisões da Justiça favoráveis aos produtores
[7] Ver exemplos de casos que deram certo (Hipotéticos)
[0] Prefiro falar direto com um especialista

[V] Voltar [S] Sair [P] Privacidade`,

    // 02 - MENU 1: DÍVIDAS
    MENU1: `Mohsis:
Entendi que você está com dívida e quer renegociar. Qual situação se parece mais com a sua?

[1] Minha safra foi prejudicada por chuva/seca/gelo
[2] O preço da minha produção caiu ou o custo subiu
[3] O banco me ofereceu um novo contrato ("Refazer a dívida")
[4] Quero saber que documentos preciso separar (Checklist)
[5] Recebi notificação do banco, cartório ou juízo (URGÊNCIA)
[0] Falar com especialista${FOOTER}`,

    // 03 - 07: Detalhes Dívida
    M1CLIMA: `Mohsis:
Sobre dívidas quando a safra é prejudicada pelo clima:
O Manual de Crédito Rural prevê que, em alguns casos, o banco pode analisar pedido de prorrogação quando há dificuldades causadas por eventos climáticos. Isso depende de:
• Comprovação do evento (laudos técnicos)
• Análise de viabilidade pelo banco
• Negociação caso a caso

Importante: não existe direito automático. Cada banco tem suas próprias regras e análise de risco.

[4] Ver documentação para renegociação de dívida
[0] Agendar com especialista${FOOTER}`,

    M1CAIXA: `Mohsis:
Sobre dívidas quando o preço cai ou o custo aumenta:
Quando o dinheiro que você esperava receber não cobre o que precisa pagar, existem algumas possibilidades jurídicas:
• Prorrogação: estender prazo de pagamento da parcela.
• Alongamento: reorganizar todo o cronograma das parcelas.

Ambas dependem de análise do banco e de demonstrar que o cronograma original ficou inviável devido à quebra de caixa.

[4] Ver documentação para renegociação de dívida
[0] Agendar com especialista${FOOTER}`,

    M1PROPOSTA: `Mohsis:
Sobre quando o banco oferece novo contrato:
Renegociar pode envolver juntar dívidas, mudar prazos ou alterar garantias. Antes de aceitar qualquer proposta, costuma ser importante entender:
• Qual o custo total (não só a parcela mensal)
• Se as garantias mudaram (novo imóvel ou avalista?)
• Se há cláusulas novas no contrato que limitam seus direitos

Cada proposta tem particularidades. Análise de contrato antes de assinar é recomendável.

[4] Ver documentação para renegociação de dívida
[0] Agendar com especialista${FOOTER}`,

    M1DOCUMENTACAO: `Mohsis:
📋 DOCUMENTAÇÃO PARA RENEGOCIAÇÃO DE DÍVIDA RURAL

Organize os seguintes itens:
1. Contrato original da operação (CCR, CPR ou CDC)
2. Extrato completo de débito (vencimentos e pagamentos)
3. Laudo técnico de assistência técnica Oficial (EMATER/AGRAER) ou particular
4. Notas fiscais de venda vs. orçamento original
5. Matrícula atualizada do imóvel (30 dias)

⚠️ IMPORTANTE: NUNCA envie documentos por WhatsApp por questões de segurança.

[0] Agendar com especialista${FOOTER}`,

    M1URGENTE: `Mohsis:
Sobre notificações do banco, cartório ou juízo:
Esses documentos costumam ter prazos fatais para resposta. Não responder pode prejudicar sua defesa.

⚠️ ALERTA DE RISCO: Se há prazo judicial correndo, este atendimento NÃO interrompe o prazo.
RECOMENDAÇÃO: Se a urgência for clara, clique em 0 para agendar ou procure suporte presencial imediatamente.

[0] Agendar com urgência${FOOTER}`,

    // 08 - MENU 2: ALONGAMENTO
    MENU2: `Mohsis:
Entendi que você precisa de mais prazo para pagar. Qual situação se parece mais com a sua?

[1] Plantei cultura de longo prazo (café, fruta, eucalipto...)
[2] Quero reduzir o valor da parcela mensal
[3] Quero entender a diferença entre prorrogar e alongar
[4] Quero saber que documentos preciso separar
[5] Quero entender os riscos de mudar o prazo
[0] Falar com especialista${FOOTER}`,

    M2CICLO: `Mohsis:
Sobre prazo para culturas de longo retorno:
O Manual de Crédito Rural prevê a possibilidade de análise de alongamento quando há incompatibilidade entre o ciclo da cultura e o prazo do financiamento.
Exemplo: Café e fruticultura que levam anos para dar o primeiro retorno financeiro.

[4] Ver documentação para alongamento
[0] Agendar com especialista${FOOTER}`,

    M2PARCELA: `Mohsis:
Sobre reduzir o valor da parcela mensal:
Aumentar o prazo pode diminuir o valor mensal, mas:
• Pode aumentar o custo final (mais juros no tempo)
• Pode exigir novas garantias exigidas pelo banco
• Pode afetar sua classificação de risco

[5] Ver riscos de alongamento
[4] Ver documentação
[0] Agendar com especialista${FOOTER}`,

    M2DIFERENCA: `Mohsis:
A diferença em linguagem simples:
• PRORROGAR = Empurrar uma data de pagamento para frente (dificuldade pontual).
• ALONGAR = Mudar todo o cronograma de parcelas (plano original não funciona mais).

Qual se aplica depende da análise do seu contrato e do banco.

[0] Agendar com especialista${FOOTER}`,

    M2DOCUMENTACAO: `Mohsis:
📋 DOCUMENTAÇÃO PARA ALONGAMENTO DE PRAZO

Tenha em mãos:
1. Contrato original e Cronograma Detalhado
2. Projeto de Plantio e Cronograma Técnico de Produção
3. Fluxo de Caixa Projetado vs. Realizado
4. Matrícula atualizada do imóvel

[0] Agendar com especialista${FOOTER}`,

    M2RISCOS: `Mohsis:
⚠️ Riscos de mudar o prazo (Alongamento):
1. O custo total da dívida costuma aumentar.
2. O banco pode exigir o "vencimento antecipado" se as novas condições não forem cumpridas.
3. Pode haver alteração na classificação de risco do produtor, dificultando novos créditos por um período.

[0] Agendar com especialista${FOOTER}`,

    // 14 - MENU 3: PROTEÇÃO PATRIMONIAL
    MENU3: `Mohsis:
Entendi que você quer proteger sua propriedade. Qual situação se parece mais com a sua?

[1] Quero entender se minha propriedade é "Bem de Família"
[2] Quero saber o que NÃO é protegido (exceções)
[3] Minha propriedade está dada como garantia (Fidúcia/Hipoteca)
[4] Quero saber que documentos preciso
[5] Recebi documento judicial sobre meu imóvel
[0] Falar com especialista${FOOTER}`,

    M3FAMILIA: `Mohsis:
Sobre Bem de Família Rural (Lei Complementar 93/2024):
A proteção impede a penhora para certas dívidas se:
• A família morar no imóvel ou ele for a base da renda.
• For a única pequena propriedade rural trabalhada pela família.
• Respeitar os limites de módulos fiscais da região.

[2] Ver o que NÃO é protegido
[4] Ver documentação${FOOTER}`,

    M3EXCECOES: `Mohsis:
O que NÃO é protegido (Imóvel pode ser leiloado):
• Dívidas de pensão alimentícia.
• Dívidas de empregados da própria fazenda (trabalhista).
• Garantia fiduciária (quando você assinou dando a terra em garantia direta).
• Impostos do próprio imóvel (ITR).

[0] Agendar com especialista${FOOTER}`,

    M3FIDUCIA: `Mohsis:
Sobre imóvel em garantia (Alienação Fiduciária):
Quando o imóvel está em Alienação Fiduciária, o banco é o "dono" até você pagar. Se houver atraso, o banco pode iniciar o processo de consolidação da propriedade sem ir ao juiz, através do Cartório.

[4] Ver documentação
[0] Agendar com especialista${FOOTER}`,

    M3DOCUMENTACAO: `Mohsis:
📋 DOCUMENTAÇÃO PARA PROTEÇÃO PATRIMONIAL

Separe para análise:
1. Matrícula atualizada (inteiro teor e ônus)
2. Certidão de casamento ou união estável
3. Comprovante de que reside ou produz no imóvel
4. Contrato que originou a dívida/garantia

[0] Agendar com especialista${FOOTER}`,

    M3JUDICIAL: `Mohsis:
Sobre documento judicial recebido:
Citações e intimações têm prazos severos.
⚠️ O agendamento NÃO interrompe prazos judiciais.

RECOMENDAÇÃO: Clique em 0 agora para agilizar o contato ou procure seu advogado hoje mesmo.

[0] Agendar com urgência${FOOTER}`,

    // 20 - MENU 4: AMBIENTAL
    MENU4: `Mohsis:
Entendi que você precisa de regularização ambiental. Qual sua situação?

[1] Quero entender sobre o CAR (Cadastro Ambiental Rural)
[2] ⛔ Descobri que tenho embargo ou restrição no imóvel
[3] Quero entender sobre Crédito Rural Sustentável
[4] Quero saber que documentos separar
[5] O banco disse que tem pendência e travou meu crédito
[0] Falar com especialista${FOOTER}`,

    M4CAR: `Mohsis:
Sobre o CAR:
É o registro obrigatório para todos os imóveis rurais. Se o CAR estiver suspenso ou com pendência de análise, o banco pode bloquear a liberação de novas parcelas ou novos créditos.

[4] Ver documentação${FOOTER}`,

    M4EMBARGO: `Mohsis:
Sobre Embargos (IBAMA/Estadual):
O embargo proíbe a exploração da área afetada. Além da multa, o maior dano é a suspensão automática de qualquer crédito rural vinculado àquela matrícula.

[0] Agendar com especialista${FOOTER}`,

    M4SUSTENTAVEL: `Mohsis:
Crédito Rural Sustentável:
Existem linhas de crédito (ex: Plano ABC) com taxas muito menores para quem recupera áreas ou tem práticas sustentáveis. Requisito básico: regularidade total no CAR.

[4] Ver documentação${FOOTER}`,

    M4DOCUMENTACAO: `Mohsis:
📋 DOCUMENTAÇÃO AMBIENTAL

Itens necessários:
1. Recibo de Inscrição no CAR e Relatório de Pendências
2. Mapa da propriedade (Shapefile se disponível)
3. Notificação de Auto de Infração (se houver embargo)
4. Licença de Operação ou Autorização de Desmate

[0] Agendar com especialista${FOOTER}`,

    M4PENDENCIA: `Mohsis:
Banco travou o crédito por pendência?
Pode ser:
• Divergência de área na matrícula vs CAR.
• Embargo em nome de proprietário anterior.
• Nome em listas de restrição socioambiental.

[0] Agendar com urgência${FOOTER}`,

    // 26 - MENU 5: LEGISLAÇÃO (Resumos MCR)
    MENU5: `Mohsis:
Sobre qual tema quer entender a legislação?

[1] Prorrogação de dívida (MCR 2-6-9)
[2] Renegociação (MCR 2-6-4)
[3] Alongamento (VNR e direito do devedor)
[4] Leis Ambientais e Crédito
[5] Garantias e Proteção do Patrimônio
[0] Falar com especialista${FOOTER}`,

    M5PRORROGACAO: `Mohsis:
📚 Legislação - Prorrogação:
Conforme o Manual de Crédito Rural (MCR 2-6-9), o banco deve analisar o pedido quando há dificuldade de comercialização ou frustração de safra por fatores adversos. É uma obrigação do banco analisar, mas você precisa provar a necessidade.${FOOTER}`,

    M5RENEGOCIACAO: `Mohsis:
📚 Legislação - Renegociação:
Regida pelo MCR e normas do Banco Central. Diferente do alongamento, a renegociação é um novo acerto de vontades, onde o banco pode exigir novas taxas.${FOOTER}`,

    M5ALONGAMENTO: `Mohsis:
📚 Legislação - Alongamento:
O STJ (Súmula 298) entende que o alongamento da dívida rural é um direito do devedor e não uma simples opção do banco, desde que preenchidos os requisitos legais.${FOOTER}`,

    M5AMBIENTAL: `Mohsis:
📚 Legislação - Ambiental:
O Código Florestal e resoluções do CMN (Conselho Monetário Nacional) proíbem a concessão de crédito para imóveis com desmatamento ilegal ou pendências graves no CAR.${FOOTER}`,

    M5GARANTIAS: `Mohsis:
📚 Legislação - Garantias:
A Lei 8.009/90 e a nova Lei do Bem de Família Rural protegem a sede da moradia e a pequena propriedade rural familiar de penhoras por dívidas da atividade produtiva, com algumas exceções importantes.${FOOTER}`,

    // 32 - MENU 6: DECISÕES JUSTIÇA
    MENU6: `Mohsis:
Veja como a Justiça tem protegido produtores:

[1] Prorrogação e alongamento (Garantia do prazo)
[2] Safra prejudicada por condições climáticas (Provas)
[0] Quero agendar análise do meu caso${FOOTER}`,

    M6PRORROGACAO: `Mohsis:
⚖️ Teses sobre Alongamento:
Tribunais de MT e PR têm decidido que o banco não pode negar o alongamento se o produtor provar que a colheita foi perdida, mesmo que o banco queira que ele pegue um empréstimo novo mais caro.${FOOTER}`,

    M6CLIMA: `Mohsis:
⚖️ Teses sobre Clima:
A Justiça aceita laudos particulares e meteorológicos como prova de que o clima impediu o pagamento, obrigando o banco a reduzir juros de mora e manter o produtor no campo.${FOOTER}`,

    // 35 - MENU 7: CASOS REAIS
    MENU7: `Mohsis:
Exemplos de situações que deram certo:

[1] Seca inesperada na soja
[2] Contrato "disfarçado" e geada no café
[3] Produtor prevenido e excesso de chuvas
[4] Benefício da ação coletiva
[5] Impenhorabilidade da pequena propriedade
[0] Quero agendar análise do meu caso${FOOTER}`,

    M7CASO1: `Mohsis:
📌 Caso: Seca inesperada na Soja.
Situação: Produtor perdeu 60% por El Niño.
Solução: Justiça obrigou o banco a conceder alongamento por 7 anos com taxas originais, após o banco tentar cobrar tudo à vista.${FOOTER}`,

    M7CASO2: `Mohsis:
📌 Caso: Contrato "disfarçado" no Café.
Situação: Banco fez o produtor assinar um empréstimo pessoal caro para pagar a dívida rural.
Solução: A Justiça anulou o contrato pessoal e mandou voltar para as taxas do crédito rural.${FOOTER}`,

    M7CASO3: `Mohsis:
📌 Caso: Produtor Prevenido.
Situação: Excesso de chuva impediu a colheita no prazo.
Solução: Com laudos feitos na hora certa, o produtor evitou o protesto e conseguiu carência de 1 ano para a próxima parcela.${FOOTER}`,

    M7CASO4: `Mohsis:
📌 Caso: Ação Coletiva.
Situação: Vários produtores de uma região afetada por praga.
Solução: Decisão beneficiou todos da associação, suspendendo as execuções bancárias até a nova safra.${FOOTER}`,

    M7CASO5: `Mohsis:
📌 Caso: Impenhorabilidade.
Situação: Banco tentou leiloar a sede da fazenda por dívida de insumos.
Solução: Provado que era pequena propriedade familiar, o leilão foi cancelado permanentemente.${FOOTER}`,

    // 44 - 46: PRIVACIDADE & CONFORMIDADE
    PRIVACIDADE: `Mohsis:
🔒 POLÍTICA DE PRIVACIDADE E LGPD
Seus dados (nome, telefone, localização) são coletados apenas para fins de triagem e agendamento de atendimento jurídico.
• Não compartilhamos dados com terceiros.
• Você pode pedir a exclusão total digitando APAGAR.
• O atendimento inicial é realizado por inteligência artificial sob supervisão.
Ao continuar a conversa e fornecer dados de agendamento, você manifesta consentimento livre e informado.

[1] CONTINUAR [M] MENU PRINCIPAL`,

    TERMO_AGENDAMENTO: `Mohsis:
Você solicitou falar com um especialista.
Para darmos seguimento, preciso coletar algumas informações básicas que serão analisadas pela nossa equipe jurídica.
Este procedimento não cria vínculo contratual imediato, mas serve para organizar o seu futuro atendimento.

[1] ACEITO E QUERO PROSSEGUIR [V] VOLTAR`,

    CONSENTIMENTO_LGPD: `Mohsis:
✅ Consentimento: Você autoriza o tratamento dos seus dados pela nossa equipe para fins de agendamento jurídico?

[1] SIM, EU AUTORIZO [2] NÃO, QUERO VOLTAR AO MENU`,

    // 47 - COLETA DE DADOS (Lógica em Service)
    AGENDAMENTO_COLETA: `Mohsis:
Vamos organizar seu agendamento.
Por favor, digite seu **NOME COMPLETO**:`,

    AGENDAMENTO_CIDADE: `Mohsis:
Obrigado! Agora, digite o **MUNICÍPIO e ESTADO (UF)** da sua propriedade:`,

    AGENDAMENTO_URGENCIA: `Mohsis:
Há alguma **urgência imediata** (ex: prazo judicial vencendo hoje ou amanhã)?
[1] SIM [2] NÃO`,

    // 48 - CONFIRMAÇÃO
    CONFIRMACAO_DADOS: `Mohsis:
📝 **CONFIRME SEUS DADOS PARA O AGENDAMENTO:**

Nome: {{nome}}
Localização: {{municipio}}
Tema: {{tema}}
Urgência: {{urgencia}}

[1] TUDO CORRETO, PODE ENVIAR
[2] PRECISO CORRIGIR ALGO`,

    // 49 - HANDOFF
    HANDOFFCONFIRM: `Mohsis:
✅ **SOLICITAÇÃO ENCAMINHADA COM SUCESSO!**
Protocolo: MOH-2025-{{protocolo}}

Um advogado da equipe do Dr. Júnior Lopes entrará em contato em breve para dar seguimento ao seu atendimento.
Por favor, aguarde nosso retorno neste número.

[M] MENU INICIAL [S] SAIR`,

    // 50 - 55: SISTEMA
    POS_AGENDAMENTO: `Mohsis:
Seu agendamento já foi encaminhado. Em breve nossa equipe entrará em contato.
Deseja ver mais algum tema informativo enquanto aguarda?

[M] MENU INICIAL [S] SAIR`,

    SAIR: `Mohsis:
Tudo bem. Encerrando por aqui. 👋
O Dr. Júnior Lopes e sua equipe agradecem o contato. Caso precise de algo no futuro, basta mandar um "Oi" ou "M".`,

    APAGAR_SOLICITACAO: `Mohsis:
Certo. Você deseja apagar todas as informações fornecidas nesta conversa conforme o direito de exclusão da LGPD?

[1] SIM, APAGAR TUDO [2] NÃO, MANTER`,

    APAGAR_CONFIRMADO: `Mohsis:
✅ Dados excluídos dos nossos registros temporários. Concluído com sucesso. 👋`,

    LOOP_PROTECAO: `Mohsis:
⚠️ Identifiquei muitas mensagens em sequência.
Por segurança, preciso garantir que você é um produtor rural buscando informação.
Deseja continuar a navegação?

[1] SIM [S] SAIR`,

    FALLBACK_ANY: `Mohsis:
Para eu te orientar com segurança, por favor escolha uma das opções numeradas do menu ou use um dos comandos:
M (Menu) | V (Voltar) | 0 (Especialista) | S (Sair) | P (Privacidade)`
};

module.exports = { STATE_TEXTS };
