/**
 * Mohsis AI State Machine Texts (V8)
 * Extracted and adapted from client requirements.
 */

const POLICY_TEXT = `GUARDRAILS DO BOT:
1) Não emite parecer, não diz “você tem direito”, não recomenda ação judicial, não calcula valores, não prevê resultado.
2) Só entrega explicações gerais, checklists, passos de organização e encaminha para atendimento humano quando necessário.
3) Em pedidos “o que eu faço/tenho direito?/qual ação?/ganho?/quanto recebo?/processo?”, responde que não avalia por aqui e oferece encaminhamento humano.
4) Em urgência (cobrança, protesto, prazo), pede documento e encaminha humano.
5) Linguagem sem promessas ou persuasão agressiva.
6) Dados mínimos com aviso de privacidade e opção SAIR/APAGAR.`;

const STATE_TEXTS = {
    "MENU": "Olá! 👋 Vi que você iniciou contato pelo nosso link/QR.\nEu sou o Mohsis, assistente informacional do escritório do Júnior Lopes, advogado no agronegócio.\nEuajudo com informações gerais sobre:\ncrédito rural, organização de dívidas, garantias/patrimônio e pontos ambientais que impactam financiamento.\n⚠️ Importante:\nEsta conversa traz informações gerais e não substitui análise de contrato e documentos.\nPara orientação individualizada, o atendimento é feito por advogado(a) da equipe.\n\nQual tema você quer ver agora?\nMENU\n1) 💸 Parcela vencendo / dívida / cobrança\n2) 📆 Alongamento de prazo / reorganização de parcelas\n3) 🛡️ Garantias / risco sobre imóvel ou bens\n4) 🌳 CAR / embargo / ambiental e crédito\n5) 📚 Resumos: normas do crédito rural (em linguagem simples)\n0) 👤 Atendimento humano (advogado(a) da equipe)\n(Comandos: M | 0 | 8 | 9 | SAIR | APAGAR)",

    "TRIAGEM8": "Certo. Vou fazer 3 perguntas rápidas para entender o tema (sem análise jurídica aqui).\n1) O que mais descreve o problema?\nA) Safra/clima (seca, chuva, praga)\nB) Preço/custo/caixa apertado\nC) Banco cobrou/ofereceu proposta\nD) Ambiental/CAR/embargo travou crédito\n(Responda com A, B, C ou D)",

    "TRIAGEMQ2": "2) O que está mais urgente?\n1) Parcela vence em até 30 dias / já venceu\n2) Notificação/protesto/ação/execução\n3) Quero evitar que vire cobrança\n4) Só quero me organizar\n(Responda 1, 2, 3 ou 4)",

    "TRIAGEMQ3": "3) Você tem algum destes documentos (pode ser foto)?\nA) Contrato/CCB/CPR ou proposta do banco\nB) Extrato de parcelas (vencimentos)\nC) Comprovante de perda/produção (se houver)\nD) CAR/embargo/print do sistema (se for ambiental)\nN) Não tenho agora\n(Responda com letras, ex.: A e B, ou N)",

    "TRIAGEMRESULTADO": "Obrigado. ✅ Com o que você informou, eu consigo:\n• te enviar um checklist do que normalmente ajuda a organizar o pedido e a conversa com banco/órgãos; e\n• se você quiser, encaminhar para atendimento humano (advogado(a) da equipe) avaliar com documentos e prazos.\n👉 Digite 9 para checklist\n👉 Digite 0 para atendimento humano\n👉 Digite M para menu\n⚠️ Lembrete: aqui eu não consigo concluir direitos/estratégia sem análise profissional.",

    "MENU1": "Entendi. Escolha o que mais parece com sua situação:\n1) 🌦️ Produção caiu por clima/safra e a parcela apertou\n2) 📉 Preço caiu / custo subiu / caixa não fechou\n3) 🏦 Banco propôs “refazer” a dívida (novo contrato)\n4) 🧾 Checklist para organizar documentos e informações\n5) 🚨 Chegou notificação/protesto/cobrança formal\n(0 atendimento humano | 9 documentos | M menu)",

    "M1CLIMA": "📌 Exemplo (hipotético):\nVocê financiou a lavoura, veio seca, colheu menos e a parcela chegou sem o caixa fechar.\n🧭 Informação geral:\nEm situações assim, costuma ser importante reunir provas do ocorrido e revisar o contrato e o cronograma do financiamento.\nO caminho adequado depende do documento e do tipo de operação.\n✅ Para organizar:\n• contrato/CCB/CPR (se tiver)\n• extrato de parcelas (vencimentos)\n• registros de produção/venda (se houver)\n• relatórios/declarações técnicas (se houver)\n👉 Digite 9 para checklist completo | 0 para atendimento humano | M para menu",

    "M1CAIXA": "📌 Exemplo (hipotético):\nVocê colheu, mas o preço caiu ou o custo subiu e a parcela ficou pesada.\n🧭 Informação geral:\nNesses casos, normalmente ajuda mapear fluxo de caixa (entradas/saídas), parcelas e garantias do contrato.\nSem documentos, eu não consigo indicar a melhor alternativa para o seu caso.\n✅ Para organizar:\n• extrato das parcelas e vencimentos\n• previsão de venda/recebimentos\n• contrato/CCB/CPR\n👉 Digite 9 (checklist) ou 0 (atendimento humano)",

    "M1PROPOSTA": "📌 Exemplo (hipotético):\nO banco sugeriu juntar tudo em um novo contrato com novo prazo.\n🧭 Informação geral:\nAntes de aceitar, é importante entender o que muda: encargos, custo total, garantias e condições do novo contrato.\n✅ Roteiro rápido:\n• quais encargos e taxa no novo contrato?\n• mudou a garantia?\n• qual o custo total ao final?\n• o prazo combina com seu ciclo produtivo?\n👉 Digite 9 para roteiro/checklist completo | 0 para atendimento humano",

    "M1CHECKLIST": "✅ Checklist (o básico que normalmente ajuda a organizar):\n1) Contrato/CCB/CPR ou proposta do banco\n2) Extrato com parcelas e vencimentos\n3) Comprovantes de produção/venda (se tiver)\n4) Se houve perda: laudo/declaração técnica (se tiver)\n5) Prints/mensagens com proposta do banco (se houver)\n👉 Digite 0 para atendimento humano avaliar com você | M para menu",

    "M1URGENTE": "Entendi. Quando há notificação/protesto/cobrança formal, costuma existir prazo.\n⚠️ Eu não consigo orientar estratégia por aqui.\nSe puder, envie:\n• foto/print do documento recebido\n• data do recebimento\n• nome do remetente (banco/cartório/vara)\n👉 Digite 0 para atendimento humano",

    "MENU2": "Certo. Escolha o tema:\n1) 🌱 Cultura/ciclo longo (retorno demora)\n2) 📆 Quero reduzir valor da parcela (mais prazo)\n3) 🔁 Diferença: prorrogar x alongar (simples)\n4) 🧾 Checklist para conversar com banco/organizar pedido\n5) ⚠️ Pontos de atenção (encargos/garantias)\n(0 atendimento humano | 9 documentos | M menu)",

    "M2_CULTURA": "📌 Exemplo (hipotético): Culturas de ciclo longo (café, citros, cana) costumam ter prazos diferenciados.\n🧭 Informação geral: É essencial alinhar o fluxo de caixa com a colheita real. Sem documentos, não há como analisar a viabilidade.\n👉 Digite 9 para checklist | 0 para atendimento humano",

    "M2_REDUZIR": "📌 Exemplo (hipotético): Você quer reduzir o valor da parcela anual aumentando o número de anos para pagar.\n🧭 Informação geral: Normalmente exige um pedido formal fundamentado na capacidade de pagamento.\n👉 Digite 9 para checklist | 0 para atendimento humano",

    "M2DIFERENCA": "Bem simples:\n• Prorrogar = adiar uma data/parcela.\n• Alongar = reorganizar o cronograma por um período maior.\n📌 Exemplo (hipotético): “Empurrar um vencimento” vs “replanejar todo o calendário”.\n👉 Se quiser, eu te envio checklist do que normalmente pedem. Digite 9 (checklist) ou 0 (atendimento humano)",

    "M2PONTOSATENCAO": "⚠️ Pontos de atenção (informação geral):\nAlterar prazo pode mudar custo total e condições de garantia.\n✅ Antes de assinar algo, geralmente é prudente:\n• comparar custo total (não só a parcela)\n• confirmar garantias exigidas\n• verificar se o prazo combina com o ciclo produtivo\n👉 Digite 0 para atendimento humano revisar proposta/documentos",

    "MENU3": "Entendi. Aqui o foco é compreender garantias e riscos do contrato (informação geral).\n1) 🧾 Dei imóvel/maquinário como garantia — o que isso muda?\n2) 🏠 Dúvidas sobre propriedade usada pela família (informação geral)\n3) ⚠️ Situações comuns que aumentam risco de cobrança/medidas\n4) ✅ Checklist para avaliar documentos/garantias\n5) 🚨 Já chegou citação/intimação/documento judicial\n(0 atendimento humano | 9 documentos | M menu)",

    "M3_GARANTIA": "📌 Exemplo (hipotético): Você assinou financiamento com garantia e agora teme consequências.\n🧭 Informação geral: O que muda bastante é o tipo de garantia e as cláusulas do contrato. Sem o documento, eu não consigo orientar o seu caso aqui.\n✅ Para organizar:\n• contrato/CCB/CPR\n• documento da garantia (se houver)\n• extrato de parcelas\n👉 Digite 9 (checklist) ou 0 (atendimento humano)",

    "M3_FAMILIA": "🧭 Informação geral: Propriedades usadas como residência ou pequena produção familiar podem ter proteções legais (impenhorabilidade). No entanto, renunciar a estas proteções em contrato muda a regra.\n👉 Digite 0 para atendimento humano",

    "M3_RISCO": "🧭 Informação geral: Inadimplência, protestos e falta de comunicação com o banco aumentam drasticamente o risco de perda de bens.\n👉 Digite 9 (checklist) ou 0 para atendimento humano",

    "M3URGENTEJUDICIAL": "Entendi. Se já existe documento judicial, pode haver prazo.\n⚠️ Eu não consigo orientar estratégia por aqui.\nEnvie, se puder:\n• foto/print do documento\n• data do recebimento\n👉 Digite 0 para atendimento humano",

    "MENU4": "Certo. Escolha:\n1) 🧾 Entender situação do CAR (passos gerais)\n2) ⛔ Entender embargo e impacto em crédito (passos gerais)\n3) ✅ Checklist “antes de pedir financiamento”\n4) 🧭 O que fazer quando aparece pendência (passos gerais)\n5) 🌦️ ZARC (janela de plantio e risco – informação geral)\n(0 atendimento humano | 9 documentos | M menu)",

    "M4_CAR": "🧭 Informação geral: Problemas no CAR (como reserva legal insuficiente) bloqueiam o crédito rural. O primeiro passo é verificar o status no sistema e ter o recibo em mãos.\n👉 Digite 0 para atendimento humano",

    "M4_EMBARGO": "🧭 Informação geral: Embargos ambientais impedem financiamentos. É necessário entender se o embargo é por desmatamento ou sobreposição para buscar regularização.\n👉 Digite 0 para atendimento humano",

    "M4_CHECKLIST_AMB": "✅ Checklist Ambiental: Recibo do CAR, Termos de Compromisso, Defesas prévias (se houver), Documentos da propriedade.\n👉 Digite 0 para atendimento humano",

    "M4_PENDENCIA": "📌 Exemplo (hipotético): Você foi ao banco e disseram que há pendência no CAR/embargo e o crédito travou.\n🧭 Passos gerais (sem análise do seu caso):\n1) identificar qual pendência aparece\n2) separar documentos disponíveis (CAR/prints/registro)\n3) verificar se é pendência cadastral, sobreposição ou restrição real\n4) organizar um plano de regularização (quando aplicável)\n⚠️ Para indicar o melhor caminho, é preciso ver os documentos.\n👉 Digite 9 (checklist) ou 0 (atendimento humano)",

    "M4_ZARC": "🧭 Informação geral: O Zarc (Zoneamento Agrícola) define as janelas de plantio. Seguir o Zarc é obrigatório para acessar seguro e as principais linhas de crédito.\n👉 Digite M para menu",

    "MENU5": "Posso te passar um resumo em linguagem simples. Escolha:\n1) Prorrogação / atraso por safra/clima (noções gerais)\n2) Renegociação / refazer dívida (noções gerais)\n3) Alongamento / reorganizar prazo (noções gerais)\n4) Ambiental e crédito (noções gerais)\n5) Garantias e riscos (noções gerais)\n⚠️ Isso é conteúdo informativo. Para aplicar ao seu caso, precisa análise humana.\n(0 atendimento humano | M menu)",

    "HANDOFF0": "Certo. Vou encaminhar para atendimento humano com advogado(a) da equipe.\nPara organizar o retorno, envie:\n1) Nome\n2) Cidade/UF\n3) Tema (dívida/prazo/garantia/ambiental)\n4) O que é mais urgente (vencimento? cobrança? crédito travado?)\n5) Se tiver: foto/PDF do contrato e/ou extrato de parcelas\n🔒 Privacidade:\nOs dados serão usados apenas para retorno e agendamento.\nVocê pode encerrar com SAIR ou pedir exclusão com APAGAR.\nQual melhor horário para retorno?\nA) manhã B) tarde C) noite",

    "HANDOFF_CONFIRM": "Obrigado. ✅ Registro feito para retorno.\nSe quiser, enquanto isso posso enviar um checklist para você separar o que tiver.\nDigite 9 (checklist) ou M (menu).",

    "DOCS9": "✅ Checklist geral (envie o que tiver, mesmo foto):\n1) Contrato/CCB/CPR ou proposta do banco\n2) Extrato com parcelas e vencimentos\n3) Comprovantes de produção/venda (se houver)\n4) Se houve perda: laudo/declaração técnica (se houver)\n5) Garantias: documentos do imóvel/maquinário (se houver)\n6) Ambiental: CAR/prints/embargo (se o tema for crédito travado)\nSe você resumir em 1 frase (“parcela vence”, “recebi protesto”, “CAR pendente”), eu te direciono o que priorizar.\n(8 triagem | 0 atendimento humano | M menu)",

    "SAIR": "Tudo bem. Encerrando por aqui. 👋 Se quiser voltar depois, mande \"M\".",

    "APAGAR": "Certo. Registrei seu pedido de exclusão do que foi enviado nesta conversa. Se precisar retomar no futuro, mande \"M\".",

    "FALLBACKSTART": "Não entendi a opção. Responda com 1, 2, 3, 4, 5 ou 0. (8 triagem | 9 checklist | M menu)",

    "FALLBACKANY": "Para eu te orientar com segurança aqui, preciso manter a conversa no formato do menu.\nEscolha um número ou use um comando:\nM menu | 8 triagem | 9 checklist | 0 atendimento humano"
};

module.exports = {
    POLICY_TEXT,
    STATE_TEXTS
};
