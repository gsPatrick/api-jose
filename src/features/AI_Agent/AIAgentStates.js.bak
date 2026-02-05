/**
 * Mohsis AI State Machine Texts (V12)
 * Aligned with Document "Fluxo Whatsapp" and "Ideal Architecture".
 */

const POLICY_TEXT = `GUARDRAILS DO BOT:
1) O bot NÃO emite parecer, NÃO diz "você tem direito", NÃO recomenda ação judicial, NÃO define tese, NÃO calcula valores, NÃO prevê resultado.
2) O bot só entrega: explicações gerais, checklist de documentos, passos gerais de organização, orientação para atendimento humano.
3) Se o usuário pedir "o que eu faço", "tenho direito?", "qual ação?", "ganho?", "quanto recebo?", o bot responde: "Não consigo avaliar por aqui. Posso encaminhar para atendimento humano."
4) Se houver urgência (cobrança, notificação, protesto, prazo), o bot pede foto/print e encaminha para atendimento humano.
5) Linguagem: sem promessas e sem expressões agressivamente persuasivas.
6) Dados: coletar o mínimo para retorno/agendamento + opção SAIR/APAGAR.`;

const STATE_TEXTS = {
    "MENU_INTRO": "Olá! 👋 Vi que você iniciou contato pelo nosso link/QR.\nEu sou o Mohsis, assistente informacional do escritório do Júnior Lopes, advogado no agronegócio.\nEu ajudo com informações gerais sobre:\ncrédito rural, organização de dívidas, garantias/patrimônio e pontos ambientais que impactam financiamento.\n⚠️ Importante:\nEsta conversa traz informações gerais e não substitui análise de contrato e documentos.\nPara orientação individualizada, o atendimento é feito por advogado(a) da equipe.",

    "MENU": "Qual tema você quer ver agora?\nMENU\n1) 💸 Parcela vencendo / dívida / cobrança\n2) 📆 Alongamento de prazo / reorganização de parcelas\n3) 🛡️ Garantias / risco sobre imóvel ou bens\n4) 🌳 CAR / embargo / ambiental e crédito\n5) 📚 Resumos: normas do crédito rural (em linguagem simples)\n0) 👤 Atendimento humano (advogado(a) da equipe)\n(Comandos: M | 0 | 8 | 9 | SAIR | APAGAR)",

    "TRIAGEM8": "Certo. Vou fazer 3 perguntas rápidas para entender o tema (sem análise jurídica aqui).\n\n1) O que mais descreve o problema?\nA) Safra/clima (seca, chuva, praga)\nB) Preço/custo/caixa apertado\nC) Banco cobrou/ofereceu proposta\nD) Ambiental/CAR/embargo travou crédito\n\n(Responda com A, B, C ou D)",

    "TRIAGEMQ2": "2) O que está mais urgente?\n1) Parcela vence em até 30 dias / já venceu\n2) Notificação/protesto/ação/execução\n3) Quero evitar que vire cobrança\n4) Só quero me organizar\n\n(Responda 1, 2, 3 ou 4)",

    "TRIAGEMQ3": "3) Você tem algum destes documentos (pode ser foto)?\nA) Contrato/CCB/CPR ou proposta do banco\nB) Extrato de parcelas (vencimentos)\nC) Comprovante de perda/produção (se houver)\nD) CAR/embargo/print do sistema (se for ambiental)\nN) Não tenho agora\n\n(Responda com letras, ex.: A e B, ou N)",

    "TRIAGEMRESULTADO": "Obrigado. ✅ Com o que você informou, eu consigo:\n• te enviar um checklist do que normalmente ajuda a organizar o pedido e a conversa com banco/órgãos; e\n• se você quiser, encaminhar para atendimento humano (advogado(a) da equipe) avaliar com documentos e prazos.\n\n👉 Digite 9 para checklist\n👉 Digite 0 para atendimento humano\n👉 Digite M para menu\n\n⚠️ Lembrete: aqui eu não consigo concluir direitos/estratégia sem análise profissional.",

    "MENU1": "Entendi. Escolha o que mais parece com sua situação:\n\n1) 🌦️ Produção caiu por clima/safra e a parcela apertou\n2) 📉 Preço caiu / custo subiu / caixa não fechou\n3) 🏦 Banco propôs “refazer” a dívida (novo contrato)\n4) 🧾 Checklist para organizar documentos e informações\n5) 🚨 Chegou notificação/protesto/cobrança formal\n\n(0 atendimento humano | 9 documentos | M menu)",

    "M1CLIMA": "📌 Exemplo (hipotético):\nVocê financiou a lavoura, veio seca, colheu menos e a parcela chegou sem o caixa fechar.\n\n🧭 Informação geral:\nEm situações assim, costuma ser importante reunir provas do ocorrido e revisar o contrato e o cronograma do financiamento.\nO caminho adequado depende do documento e do tipo de operação.\n\n✅ Para organizar:\n• contrato/CCB/CPR (se tiver)\n• extrato de parcelas (vencimentos)\n• registros de produção/venda (se houver)\n• relatórios/declarações técnicas (se houver)\n\n👉 Digite 9 para checklist completo\n👉 Digite 0 para atendimento humano\n👉 Digite M para menu",

    "M1CAIXA": "📌 Exemplo (hipotético):\nVocê colheu, mas o preço caiu ou o custo subiu e a parcela ficou pesada.\n\n🧭 Informação geral:\nNesses casos, normalmente ajuda mapear fluxo de caixa (entradas/saídas), parcelas e garantias do contrato.\nSem documentos, eu não consigo indicar a melhor alternativa para o seu caso.\n\n✅ Para organizar:\n• extrato das parcelas e vencimentos\n• previsão de venda/recebimentos\n• contrato/CCB/CPR\n\n👉 Digite 9 (checklist) ou 0 (atendimento humano)",

    "M1PROPOSTA": "📌 Exemplo (hipotético):\nO banco sugeriu juntar tudo em um novo contrato com novo prazo.\n\n🧭 Informação geral:\nAntes de aceitar, é importante entender o que muda: encargos, custo total, garantias e condições do novo contrato.\n\n✅ Roteiro rápido:\n• quais encargos e taxa no novo contrato?\n• mudou a garantia?\n• qual o custo total ao final?\n• o prazo combina com seu ciclo produtivo?\n\n👉 Digite 9 para roteiro/checklist completo\n👉 Digite 0 para atendimento humano",

    "M1CHECKLIST": "✅ Checklist (o básico que normalmente ajuda a organizar):\n1) Contrato/CCB/CPR ou proposta do banco\n2) Extrato com parcelas e vencimentos\n3) Comprovantes de produção/venda (se tiver)\n4) Se houve perda: laudo/declaração técnica (se tiver)\n5) Prints/mensagens com proposta do banco (se houver)\n\n👉 Digite 0 para atendimento humano avaliar com você\n👉 Digite M para menu",

    "M1URGENTE": "Entendi. Quando há notificação/protesto/cobrança formal, costuma existir prazo.\n\n⚠️ Eu não consigo orientar estratégia por aqui.\nSe puder, envie:\n• foto/print do documento recebido\n• data do recebimento\n• nome do remetente (banco/cartório/vara)\n\n👉 Digite 0 para atendimento humano",

    "MENU2": "Certo. Escolha o tema:\n\n1) 🌱 Cultura/ciclo longo (retorno demora)\n2) 📆 Quero reduzir valor da parcela (mais prazo)\n3) 🔁 Diferença: prorrogar x alongar (simples)\n4) 🧾 Checklist para conversar com banco/organizar pedido\n5) ⚠️ Pontos de atenção (encargos/garantias)\n\n(0 atendimento humano | 9 documentos | M menu)",

    "M2DIFERENCA": "Bem simples:\n• Prorrogar = adiar uma data/parcela.\n• Alongar = reorganizar o cronograma por um período maior.\n\n📌 Exemplo (hipotético):\n“Empurrar um vencimento” vs “replanejar todo o calendário”.\n\n👉 Se quiser, eu te envio checklist do que normalmente pedem.\nDigite 9 (checklist) ou 0 (atendimento humano)",

    "M2PONTOSATENCAO": "⚠️ Pontos de atenção (informação geral):\nAlterar prazo pode mudar custo total e condições de garantia.\n\n✅ Antes de assinar algo, geralmente é prudente:\n• comparar custo total (não só a parcela)\n• confirmar garantias exigidas\n• verificar se o prazo combina com o ciclo produtivo\n\n👉 Digite 0 para atendimento humano revisar proposta/documentos",

    "MENU3": "Entendi. Aqui o foco é compreender garantias e riscos do contrato (informação geral).\n\n1) 🧾 Dei imóvel/maquinário como garantia — o que isso muda?\n2) 🏠 Dúvidas sobre propriedade usada pela família (informação geral)\n3) ⚠️ Situações comuns que aumentam risco de cobrança/medidas\n4) ✅ Checklist para avaliar documentos/garantias\n5) 🚨 Já chegou citação/intimação/documento judicial\n\n(0 atendimento humano | 9 documentos | M menu)",

    "M3GARANTIA": "📌 Exemplo (hipotético):\nVocê assinou financiamento com garantia e agora teme consequências.\n\n🧭 Informação geral:\nO que muda bastante é o tipo de garantia e as cláusulas do contrato.\nSem o documento, eu não consigo orientar o seu caso aqui.\n\n✅ Para organizar:\n• contrato/CCB/CPR\n• documento da garantia (se houver)\n• extrato de parcelas\n\n👉 Digite 9 (checklist) ou 0 (atendimento humano)",

    "M3URGENTEJUDICIAL": "Entendi. Se já existe documento judicial, pode haver prazo.\n\n⚠️ Eu não consigo orientar estratégia por aqui.\nEnvie, se puder:\n• foto/print do documento\n• data do recebimento\n\n👉 Digite 0 para atendimento humano",

    "MENU4": "Certo. Escolha:\n\n1) 🧾 Entender situação do CAR (passos gerais)\n2) ⛔ Entender embargo e impacto em crédito (passos gerais)\n3) ✅ Checklist “antes de pedir financiamento”\n4) 🧭 O que fazer quando aparece pendência (passos gerais)\n5) 🌦️ ZARC (janela de plantio e risco – informação geral)\n\n(0 atendimento humano | 9 documentos | M menu)",

    "M4PENDENCIA": "📌 Exemplo (hipotético):\nVocê foi ao banco e disseram que há pendência no CAR/embargo e o crédito travou.\n\n🧭 Passos gerais (sem análise do seu caso):\n1) identificar qual pendência aparece\n2) separar documentos disponíveis (CAR/prints/registro)\n3) verificar se é pendência cadastral, sobreposição ou restrição real\n4) organizar um plano de regularização (quando aplicável)\n\n⚠️ Para indicar o melhor caminho, é preciso ver os documentos.\n👉 Digite 9 (checklist) ou 0 (atendimento humano)",

    "MENU5": "Posso te passar um resumo em linguagem simples. Escolha:\n\n1) Prorrogação / atraso por safra/clima (noções gerais)\n2) Renegociação / refazer dívida (noções gerais)\n3) Alongamento / reorganizar prazo (noções gerais)\n4) Ambiental e crédito (noções gerais)\n5) Garantias e riscos (noções gerais)\n\n⚠️ Isso é conteúdo informativo. Para aplicar ao seu caso, precisa análise humana.\n(0 atendimento humano | M menu)",

    "HANDOFF0": "Certo. Vou encaminhar para atendimento humano com advogado(a) da equipe.\n\nPara organizar o retorno, envie:\n1) Nome\n2) Cidade/UF\n3) Tema (dívida/prazo/garantia/ambiental)\n4) O que é mais urgente (vencimento? cobrança? crédito travado?)\n5) Se tiver: foto/PDF do contrato e/ou extrato de parcelas\n\n🔒 Privacidade:\nOs dados serão usados apenas para retorno e agendamento.\nVocê pode encerrar com SAIR ou pedir exclusão com APAGAR.\n\nQual melhor horário para retorno?\nA) manhã B) tarde C) noite",

    "HANDOFFCONFIRM": "Obrigado. ✅ Registro feito para retorno.\n\nSe quiser, enquanto isso posso enviar um checklist para você separar o que tiver.\nDigite 9 (checklist) ou M (menu).",

    "DOCS9": "✅ Checklist geral (envie o que tiver, mesmo foto):\n\n1) Contrato/CCB/CPR ou proposta do banco\n2) Extrato com parcelas e vencimentos\n3) Comprovantes de produção/venda (se houver)\n4) Se houve perda: laudo/declaração técnica (se houver)\n5) Garantias: documentos do imóvel/maquinário (se houver)\n6) Ambiental: CAR/prints/embargo (se o tema for crédito travado)\n\nSe você resumir em 1 frase (“parcela vence”, “recebi protesto”, “CAR pendente”), eu te direciono o que priorizar.\n(8 triagem | 0 atendimento humano | M menu)",

    "SAIR": "Tudo bem. Encerrando por aqui. 👋\nSe quiser voltar depois, mande \"M\".",

    "APAGAR": "Certo. Registrei seu pedido de exclusão do que foi enviado nesta conversa.\nSe precisar retomar no futuro, mande \"M\".",

    "FALLBACKSTART": "Não entendi a opção.\nResponda com 1, 2, 3, 4, 5 ou 0.\n\n(8 triagem | 9 checklist | M menu)",

    "FALLBACKANY": "Para eu te orientar com segurança aqui, preciso manter a conversa no formato do menu.\nEscolha um número ou use um comando:\n\nM menu | 8 triagem | 9 checklist | 0 atendimento humano"
};

module.exports = {
    POLICY_TEXT,
    STATE_TEXTS
};
