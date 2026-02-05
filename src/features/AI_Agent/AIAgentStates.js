// AIAgentStates.js - V17 DEFINITIVE (Hybrid + Disclaimer)
// Provimento 205/2021 - OAB Compliance

const FOOTER_DISCLAIMER = "\nℹ️ Conteúdo informativo (não é consulta). Para análise do seu caso, digite 0 (atendimento humano). M para menu. V para voltar.";

const STATE_TEXTS = {
    // 1) FLUXO PRINCIPAL
    START: `Mohsis:
Olá! 👋 Eu sou o Mohsis, assistente virtual do escritório do Dr. Júnior Lopes.

⚠️ Importante:
Este atendimento é apenas informativo e não substitui uma análise jurídica individualizada. Não é consulta.
Usamos IA com supervisão humana. Apesar do cuidado, podem ocorrer imprecisões; confirme com a equipe.
Se houver prazo/urgência (cobrança formal, protesto, citação/intimação), digite 0.

Para eu te direcionar melhor, escolha:
1) ⚡ Triagem rápida (recomendado – 3 perguntas)
2) 📋 Ver MENU completo agora

(Comandos: M | V | 0 | 8 | 9 | SAIR | APAGAR)${FOOTER_DISCLAIMER}`,

    MENUPRINCIPAL: `Mohsis:
Como posso te ajudar hoje?

MENU
1) 💸 Parcela vencendo / dívida / cobrança
2) 📆 Alongamento de prazo / reorganização de parcelas
3) 🛡️ Garantias / risco sobre imóvel ou bens
4) 🌳 CAR / embargo / ambiental e crédito
5) 📚 Resumos: normas do crédito rural (linguagem simples)
0) 👤 Atendimento humano (advogado(a) da equipe)

(Comandos: M | V | 0 | 8 | 9 | SAIR | APAGAR)${FOOTER_DISCLAIMER}`,

    // 2) TRIAGEM RÁPIDA
    TRIAGEM8: `Mohsis:
Perfeito — triagem rápida em 3 perguntas (responda tudo na mesma mensagem, no formato: LETRA-NÚMERO-NÚMERO. Ex.: A-2-3)

1) Qual é o tema principal?
   A) Parcela/dívida/cobrança
   B) Alongamento/prazo
   C) Garantias/imóvel/bens
   D) Ambiental (CAR/embargo)/crédito travado

2) Existe prazo/urgência (notificação, protesto, citação/intimação, parcela vence em até 7 dias)?
   1) Sim  2) Não  3) Não sei

3) Você tem algum documento em mãos agora?
   1) Contrato/CCB/CPR
   2) Extrato de parcelas
   3) Print do banco/cartório/órgão ambiental
   4) Nada por enquanto${FOOTER_DISCLAIMER}`,

    TRIAGEM_DONE_URGENTE: `Mohsis:
✅ Obrigado. Como você indicou urgência/prazo, o recomendado é atendimento humano direto.

Encaminhando para análise... digite 0 para confirmar.${FOOTER_DISCLAIMER}`,

    // 3) MENU 1 (DÍVIDA)
    MENU1: `Mohsis:
Entendi. Escolha o que mais parece com sua situação:
1) 🌦️ Produção caiu por clima/safra e a parcela apertou
2) 📉 Preço caiu / custo subiu / caixa não fechou
3) 🏦 Banco propôs “refazer” a dívida (novo contrato)
4) 🧾 Checklist para organizar documentos e informações
5) 🚨 Chegou notificação/protesto/cobrança formal
(0 humano | 9 documentos | V voltar | M menu)${FOOTER_DISCLAIMER}`,

    M1CLIMA: `Mohsis:
📌 Exemplo (hipotético): veio seca/enchente, colheu menos e a parcela chegou.
🧠 Informação geral: costuma ser importante reunir provas do ocorrido e revisar contrato e cronograma. O caminho depende do tipo de operação e dos documentos.
✅ Para organizar:
• contrato/CCB/CPR (se tiver)
• extrato de parcelas (vencimentos)
• registros de produção/venda (se houver)
• laudos/declarações técnicas (se houver)
Digite 9 (checklist) | 0 (humano) | V (voltar) | M (menu)${FOOTER_DISCLAIMER}`,

    M1CAIXA: `Mohsis:
📌 Exemplo (hipotético): colheu, mas preço caiu ou custo subiu e a parcela ficou pesada.
🧠 Informação geral: ajuda mapear fluxo de caixa (entradas/saídas), parcelas e garantias. Sem documentos, não dá para indicar alternativa para o seu caso.
✅ Para organizar:
• extrato de parcelas e vencimentos
• previsão de venda/recebimentos
• contrato/CCB/CPR
Digite 9 (checklist) | 0 (humano) | V (voltar) | M (menu)${FOOTER_DISCLAIMER}`,

    M1PROPOSTA: `Mohsis:
📌 Exemplo (hipotético): banco sugeriu juntar tudo em novo contrato com novo prazo.
🧠 Informação geral: antes de aceitar, é importante entender o que muda (encargos, custo total, garantias e condições).
✅ Roteiro rápido:
• qual taxa/encargos no novo contrato?
• mudou a garantia?
• qual o custo total ao final?
• o prazo combina com seu ciclo produtivo?
Digite 9 (roteiro completo) | 0 (humano) | V (voltar) | M (menu)${FOOTER_DISCLAIMER}`,

    M1CHECKLIST: `Mohsis:
✅ Checklist básico para organizar:
1) Contrato/CCB/CPR ou proposta do banco
2) Extrato com parcelas e vencimentos
3) Comprovantes de produção/venda (se tiver)
4) Se houve perda: laudo/declaração técnica (se tiver)
5) Prints/mensagens com proposta do banco (se houver)
Digite 0 (humano) | V (voltar) | M (menu)${FOOTER_DISCLAIMER}`,

    M1URGENTE: `Mohsis:
Entendi. Notificação/protesto/cobrança formal costuma ter prazo.
⚠️ Eu não posso orientar estratégia por aqui.
Se puder, envie:
• foto/print do documento
• data do recebimento
• quem enviou (banco/cartório/vara)
Digite 0 (atendimento humano).
⏱️ Pode haver prazo correndo. Eu não posso orientar estratégia por aqui. Envie foto/print e digite 0 para atendimento humano. M para menu. V para voltar.${FOOTER_DISCLAIMER}`,

    // 4) MENU 2 (PRAZOS)
    MENU2: `Mohsis:
Certo. Escolha o tema:
1) 🌱 Cultura/ciclo longo (retorno demora)
2) 📆 Quero reduzir valor da parcela (mais prazo)
3) 🔁 Diferença: prorrogar x alongar (simples)
4) 🧾 Checklist para conversar com banco/organizar pedido
5) ⚠️ Pontos de atenção (encargos/garantias)
(0 humano | 9 documentos | V voltar | M menu)${FOOTER_DISCLAIMER}`,

    M2CICLOLONGO: `Mohsis:
🌱 Entendi — cultura/ciclo longo normalmente tem retorno mais demorado.
🧠 Informação geral: quando o vencimento não “encaixa” com o ciclo produtivo, a conversa com o banco costuma focar em alinhar calendário de parcelas ao fluxo real de colheita/venda.
📌 Exemplo (hipotético): investimento em cultura perene e as primeiras receitas demoram; parcela chega antes do caixa.
✅ Para se preparar (organização):
• cronograma do ciclo (plantio/tratos/colheita/venda)
• previsão de receitas por mês/safra
• extrato com parcelas/vencimentos
• contrato/CCB/CPR e finalidade do crédito
• comprovantes básicos de custos (insumos/serviços)
🗣️ Modelo de mensagem ao banco:
“Meu ciclo de receita ocorre em //_ a //__. As parcelas vencem em _//. Preciso reorganizar o calendário para que os vencimentos coincidam com a entrada de receita.”
Digite 4 (checklist) | 0 (humano) | V (voltar) | M (menu)${FOOTER_DISCLAIMER}`,

    M2REDUZIR_PARCELA: `Mohsis:
📆 Entendi — você quer reduzir o valor da parcela aumentando prazo.
🧠 Informação geral: alongar o prazo pode baixar a parcela mensal, mas pode aumentar o custo total (por juros/encargos). Por isso, é importante comparar cenários.
✅ Roteiro prático (sem cálculo aqui):
1) Peça ao banco 2–3 opções de prazo e a planilha/simulação do custo total.
2) Compare:
   • valor da parcela
   • número de parcelas
   • taxa/encargos
   • custo total ao final
   • garantias exigidas
3) Confira se o novo calendário cabe no seu fluxo de caixa (mês a mês).
📌 Exemplo de pedido ao banco:
“Pode me enviar uma simulação com prazo de __ meses e outra de __ meses, com taxa, CET/custo total e garantias?”
Digite 5 (pontos de atenção) | 4 (checklist) | 0 (humano) | V (voltar) | M (menu)${FOOTER_DISCLAIMER}`,

    M2DIFERENCA: `Mohsis:
Bem simples:
• Prorrogar = adiar uma data/parcela.
• Alongar = reorganizar o cronograma por um período maior.
📌 Exemplo: “empurrar um vencimento” vs “replanejar todo o calendário”.
Digite 4 (checklist) | 0 (humano) | V (voltar) | M (menu)${FOOTER_DISCLAIMER}`,

    M2CHECKLIST_BANCO: `Mohsis:
🧾 Checklist para conversar com banco (o que normalmente ajuda):
1) Identificação da operação: número do contrato/CCB/CPR, agência, gerente.
2) Extrato das parcelas: vencimentos e valores.
3) Objetivo claro:
   A) só adiar uma parcela (prorrogação)
   B) reorganizar todo o cronograma (alongamento)
4) Justificativa em 3 linhas (fato + impacto + pedido):
   • “ocorreu __ (clima/preço/custo/ciclo) → impactou __ → solicito _.”
5) Provas/apoio (se houver): laudo técnico, notas, relatórios, prints.
6) Proposta de calendário realista (datas que cabem no seu ciclo).
7) Perguntas essenciais ao banco:
   • qual taxa/encargos?
   • haverá tarifa/custo extra?
   • mudou garantia?
   • qual custo total ao final?
   • quais documentos o banco exige?
Digite 9 (checklist geral) | 0 (humano) | V (voltar) | M (menu)${FOOTER_DISCLAIMER}`,

    M2PONTOSATENCAO: `Mohsis:
⚠️ Pontos de atenção (informação geral):
Alterar prazo pode mudar custo total e condições de garantia.
✅ Antes de assinar algo, normalmente é prudente:
• comparar custo total (não só a parcela)
• confirmar garantias exigidas
• verificar se o prazo combina com o ciclo produtivo
Digite 0 (humano) | V (voltar) | M (menu)${FOOTER_DISCLAIMER}`,

    // 5) MENU 3 (GARANTIAS)
    MENU3: `Mohsis:
Entendi. Aqui o foco é compreender garantias e riscos do contrato (informação geral).
1) 🧾 Dei imóvel/maquinário como garantia — o que isso muda?
2) 🏡 Dúvidas sobre propriedade usada pela família (informação geral)
3) ⚠️ Situações comuns que aumentam risco de cobrança/medidas
4) ✅ Checklist para avaliar documentos/garantias
5) 🚨 Já chegou citação/intimação/documento judicial
(0 humano | 9 documentos | V voltar | M menu)${FOOTER_DISCLAIMER}`,

    M3GARANTIAGERAL: `Mohsis:
📌 Exemplo (hipotético): você assinou financiamento com garantia e teme consequências.
🧠 Informação geral: o que muda depende do tipo de garantia (ex.: hipoteca, alienação fiduciária, penhor, aval/fiança, CPR com garantia etc.) e das cláusulas do contrato. Sem documento, não dá para orientar seu caso aqui.
✅ Para organizar:
• contrato/CCB/CPR
• documento da garantia (se houver)
• extrato de parcelas
Digite 4 (checklist garantias) | 0 (humano) | V (voltar) | M (menu)${FOOTER_DISCLAIMER}`,

    M3PROPRIEDADEFAMILIA: `Mohsis:
🏡 Entendi — imóvel/terra é usado pela família e surgiram dúvidas.
🧠 Informação geral (sem análise do seu caso): risco e responsabilidade podem variar conforme:
• quem é o proprietário no registro (matrícula)
• quem assinou o contrato
• se a garantia foi formalmente registrada
• se há coproprietários, herança/inventário, casamento/união estável, usufruto
📌 Situações típicas (para você saber o que separar):
1) “Está no nome do pai/mãe, mas quem financiou foi o filho.”
2) “Terra é de herança e inventário não terminou.”
3) “Imóvel é do casal, mas só um assinou.”
4) “Há arrendamento/posse e não propriedade formal.”
✅ O que ajuda a esclarecer (documentos):
• matrícula atualizada do imóvel (cartório)
• contrato/CCB/CPR
• documento de estado civil (certidão/casamento), quando relevante
• se for herança: info do inventário (nº do processo/termo)
⚠️ Como isso pode envolver terceiros e prazos, o mais seguro é avaliação humana.
Digite 0 (humano) | 4 (checklist) | V (voltar) | M (menu)${FOOTER_DISCLAIMER}`,

    M3RISCOSITUACOES: `Mohsis:
⚠️ Situações comuns que aumentam risco de cobrança/medidas (informação geral):
1) Atraso recorrente e falta de comunicação formal com o banco.
2) Assinar “nova proposta” sem ler encargos/garantias.
3) Garantia registrada (ex.: imóvel/maquinário) + inadimplência prolongada.
4) Misturar dívidas (rural + pessoal) sem entender o que entra no novo contrato.
5) Ignorar notificação/cartório/e-mails do banco.
6) Vender bem dado em garantia sem verificar restrições.
✅ Boa prática (organizacional):
• manter tudo por escrito (protocolo/e-mail/WhatsApp do gerente)
• guardar extratos e comunicações
• pedir simulação/custo total antes de assinar
Digite 4 (checklist garantias) | 0 (humano) | V (voltar) | M (menu)${FOOTER_DISCLAIMER}`,

    M3CHECKLISTGARANTIAS: `Mohsis:
✅ Checklist para avaliar documentos/garantias (sem parecer):
1) Qual é a operação? (contrato/CCB/CPR) e data.
2) Qual é o tipo de garantia indicada no contrato?
3) A garantia foi registrada?
   • Imóvel: matrícula com averbação/registro
   • Veículo/maquinário: gravame/registro pertinente
4) Quem assinou?
   • titular/proprietário? cônjuge? avalista/fiança?
5) Há cláusulas sobre:
   • vencimento antecipado
   • juros/mora/multa
   • possibilidade de execução/medidas
6) Situação atual:
   • parcelas vencidas? quantas? data do primeiro atraso?
7) Comunicação:
   • recebeu notificação/protesto/citação?
Se tiver documento judicial, digite 5.
Digite 0 (humano) | 9 (checklist geral) | V (voltar) | M (menu)${FOOTER_DISCLAIMER}`,

    M3URGENTEJUDICIAL: `Mohsis:
Entendi. Se já existe documento judicial, pode haver prazo.
⚠️ Eu não consigo orientar estratégia por aqui.
Envie, se puder:
• foto/print do documento
• data do recebimento
• qual órgão/vara/cartório aparece
Digite 0 (atendimento humano).
⏱️ Pode haver prazo correndo. Eu não posso orientar estratégia por aqui. Envie foto/print e digite 0 para atendimento humano. M para menu. V para voltar.${FOOTER_DISCLAIMER}`,

    // 6) MENU 4 (AMBIENTAL)
    MENU4: `Mohsis:
Certo. Escolha:
1) 🧾 Entender situação do CAR (passos gerais)
2) ⛔ Entender embargo e impacto em crédito (passos gerais)
3) ✅ Checklist “antes de pedir financiamento”
4) 🧩 O que fazer quando aparece pendência (passos gerais)
5) 🌦️ ZARC (janela de plantio e risco – informação geral)
(0 humano | 9 documentos | V voltar | M menu)${FOOTER_DISCLAIMER}`,

    M4CARPASSOS: `Mohsis:
🧾 Entendi — situação do CAR.
📌 Exemplo (hipotético): no banco disseram que há pendência no CAR e o crédito travou.
🧠 Passos gerais (sem análise do seu caso):
1) Identificar qual mensagem/pendência aparece (print ajuda).
2) Separar o que você tem: recibo CAR, demonstrativo, mapas, CPF/CNPJ, dados do imóvel.
3) Verificar se é:
   A) pendência cadastral (dados incompletos)
   B) sobreposição (limites conflitantes)
   C) restrição/alerta ambiental vinculado ao imóvel
4) Anotar o que o banco está exigindo (ex.: “CAR analisado”, “sem sobreposição”, “sem embargo”).
5) Organizar um plano de regularização (quando aplicável), com suporte técnico/órgão competente.
⚠️ Para indicar o melhor caminho, é preciso ver prints/documentos.
Digite 9 (checklist) | 0 (humano) | V (voltar) | M (menu)${FOOTER_DISCLAIMER}`,

    M4EMBARGOCREDITO: `Mohsis:
⛔ Entendi — embargo e impacto em crédito.
🧠 Informação geral: embargo/restrição ambiental pode gerar travas em operações de crédito porque o banco avalia risco e conformidade. O que importa é entender:
1) Qual é a origem do embargo (qual órgão/autuação/área).
2) Se a restrição é do imóvel todo ou de parte/área específica.
3) Se existe documento formal (auto, termo, notificação) e datas.
✅ Passos gerais (organização):
• faça prints do que aparece (sistemas/gerente)
• se tiver, separe auto/termo/notificação e mapas/coord.
• registre: data em que soube, quem informou, e o que foi pedido pelo banco
• evite “achismos”: peça ao banco a exigência por escrito
⚠️ Se já chegou documento com prazo (autuação/intimação), o recomendado é humano.
Digite 0 (humano) | 9 (checklist) | V (voltar) | M (menu)${FOOTER_DISCLAIMER}`,

    M4CHECKLISTANTESFINANCIAR: `Mohsis:
✅ Checklist “antes de pedir financiamento” (boa prática geral):
1) Documentos pessoais e do produtor (CPF/CNPJ, comprovantes básicos).
2) Operação/atividade: finalidade do crédito e cronograma do ciclo.
3) Imóvel/posse:
   • matrícula/CCIR/ITR (o que você tiver)
   • contrato de arrendamento/posse (se aplicável)
4) Ambiental:
   • recibo do CAR e prints da situação
   • se houver: licenças/autorizações
5) Produção/receita:
   • histórico de venda (se tiver)
   • previsão de receita da safra/ciclo
6) Financeiro:
   • extrato de parcelas de operações anteriores (se houver)
   • lista de dívidas ativas (para não ser pego de surpresa)
7) Perguntas ao banco (peça por escrito):
   • exigências ambientais específicas
   • garantias exigidas
   • taxa/encargos e custo total estimado
Digite 9 (checklist) | 0 (humano) | V (voltar) | M (menu)${FOOTER_DISCLAIMER}`,

    M4PENDENCIAPASSOS: `Mohsis:
🧩 Entendi — apareceu uma pendência e você não sabe o que fazer.
🧠 Passos gerais (organização):
1) Identifique a pendência exata (print/foto da tela ou mensagem do gerente).
2) Classifique em 1 linha:
   A) “documental” (faltou documento)
   B) “cadastro” (dados divergentes)
   C) “ambiental” (CAR/embargo/licença)
   D) “financeira” (restrição/atraso)
3) Monte um pacote simples para análise:
   • print da pendência
   • contrato/CCB/CPR (se existir)
   • extrato de parcelas (se houver)
   • CAR/auto/termo (se for ambiental)
4) Peça ao banco: “qual documento resolve?” e “qual prazo?”
⚠️ Se houver prazo curto, protesto, notificação, citação/intimação: digite 0.
Digite 0 (humano) | 9 (checklist) | V (voltar) | M (menu)${FOOTER_DISCLAIMER}`,

    M4ZARCINFO: `Mohsis:
🌦️ ZARC (informação geral):
O ZARC (Zoneamento Agrícola de Risco Climático) é uma referência técnica usada para indicar janelas de plantio e níveis de risco por cultura/município.
🧠 Por que isso importa no crédito/seguro (em geral):
• pode influenciar exigências de seguro/condições de contratação
• ajuda a planejar calendário e reduzir risco climático
✅ Como usar na prática (sem entrar em detalhe técnico aqui):
1) Identifique cultura e município.
2) Consulte a janela de plantio indicada e o nível de risco.
3) Guarde print/relatório para planejamento e para conversar com banco/seguradora.
⚠️ Para orientar no seu caso (cultura/município/contrato), precisa análise humana.
Digite 0 (humano) | V (voltar) | M (menu)${FOOTER_DISCLAIMER}`,

    // 7) MENU 5 (RESUMOS)
    MENU5: `Mohsis:
Posso te passar um resumo em linguagem simples. Escolha:
1) Prorrogação / atraso por safra/clima (noções gerais)
2) Renegociação / refazer dívida (noções gerais)
3) Alongamento / reorganizar prazo (noções gerais)
4) Ambiental e crédito (noções gerais)
5) Garantias e riscos (noções gerais)
⚠️ Conteúdo informativo. Para aplicar ao seu caso, precisa análise humana.
(0 humano | V voltar | M menu)${FOOTER_DISCLAIMER}`,

    RESUMO1PRORROGACAO: `Mohsis:
📚 Noções gerais — Prorrogação (adiar parcela):
• Em termos simples, é empurrar o vencimento de uma parcela/data.
• Geralmente você precisa justificar o motivo e formalizar o pedido ao banco.
• Guarde: contrato, extrato de parcelas e provas do motivo (se houver).
Digite 9 (checklist) | 0 (humano) | V (voltar) | M (menu)${FOOTER_DISCLAIMER}`,

    RESUMO2RENEGOCIACAO: `Mohsis:
📚 Noções gerais — Renegociação/refazer dívida:
• É quando o banco propõe novo contrato para “juntar” ou replanejar débitos.
• O ponto principal é comparar custo total, encargos e garantias.
• Nunca assine sem entender o que mudou.
Digite 9 (checklist) | 0 (humano) | V (voltar) | M (menu)${FOOTER_DISCLAIMER}`,

    RESUMO3ALONGAMENTO: `Mohsis:
📚 Noções gerais — Alongamento/reorganizar prazo:
• É replanejar o cronograma por mais tempo para ajustar a parcela ao fluxo de caixa.
• Pode reduzir parcela mensal, mas aumentar custo total.
• Combine o calendário com seu ciclo produtivo.
Digite M e escolha o Menu 2 (opção 4 para checklist) | 0 (humano) | V (voltar)${FOOTER_DISCLAIMER}`,

    RESUMO4AMBIENTAL: `Mohsis:
📚 Noções gerais — Ambiental e crédito:
• Pendências em CAR/embargo/restrições podem travar crédito.
• O caminho é identificar a pendência, separar documentos e pedir exigência por escrito.
• Com prazo/intimação: encaminhar para humano.
Digite M e escolha o Menu 4 (opção 4 pendência) | 0 (humano) | V (voltar)${FOOTER_DISCLAIMER}`,

    RESUMO5GARANTIAS: `Mohsis:
📚 Noções gerais — Garantias e riscos:
• Risco depende do tipo de garantia, registro e cláusulas do contrato.
• Separe: contrato, documento/registro da garantia e extrato de parcelas.
• Se chegou documento judicial: prazo pode correr.
Digite M e escolha o Menu 3 (opção 4 checklist) | 0 (humano) | V (voltar)${FOOTER_DISCLAIMER}`,

    // 8) GLOBAL COMMANDS / HANDOFF
    HANDOFF0: `Mohsis:
Certo. Vou encaminhar para atendimento humano com advogado(a) da equipe.
Para organizar o retorno, envie:
1) Nome
2) Cidade/UF
3) Tema (dívida/prazo/garantia/ambiental)
4) O que é mais urgente (vencimento? cobrança? crédito travado?)
5) Se tiver: foto/PDF do contrato e/ou extrato de parcelas
🔒 Privacidade:
Os dados serão usados apenas para retorno e agendamento.
Você pode encerrar com SAIR ou pedir exclusão com APAGAR.
Qual melhor horário para retorno?
A) manhã  B) tarde  C) noite${FOOTER_DISCLAIMER}`,

    HANDOFFCONFIRM: `Mohsis:
Obrigado. ✅ Registro feito para retorno.
Se quiser, enquanto isso posso enviar um checklist para você separar o que tiver.
Digite 9 (checklist) ou M (menu).${FOOTER_DISCLAIMER}`,

    DOCS9: `Mohsis:
✅ Checklist geral (envie o que tiver, mesmo foto):
1) Contrato/CCB/CPR ou proposta do banco
2) Extrato com parcelas e vencimentos
3) Comprovantes de produção/venda (se houver)
4) Se houve perda: laudo/declaração técnica (se houver)
5) Garantias: matrícula do imóvel / doc do maquinário / gravame (se houver)
6) Ambiental: recibo CAR + prints / auto/termo de embargo (se o tema for crédito travado)
Se você resumir em 1 frase (“parcela vence”, “recebi protesto”, “CAR pendente”), eu te digo o que priorizar.
(8 triagem | 0 humano | V voltar | M menu)${FOOTER_DISCLAIMER}`,

    SAIR: `Mohsis:
Tudo bem. Encerrando por aqui. 👋
Se quiser voltar depois, mande “M”.${FOOTER_DISCLAIMER}`,

    APAGAR: `Mohsis:
Certo. Registrei seu pedido de exclusão do que foi enviado nesta conversa.
Se precisar retomar no futuro, mande “M”.${FOOTER_DISCLAIMER}`,

    VOLTARV: `Mohsis:
Ok! Voltando para a etapa anterior.
(Se preferir, mande “M” para o menu principal.)${FOOTER_DISCLAIMER}`,

    FALLBACKSTART: `Mohsis:
Não entendi a opção.
Responda com 1 ou 2.
(Ou use comandos: 0, M, V)${FOOTER_DISCLAIMER}`,

    FALLBACK_ANY: `Mohsis:
Para eu te orientar com segurança, preciso manter a conversa no formato do menu.
Escolha um número ou use um comando:
M (menu) | V (voltar) | 8 (triagem) | 9 (checklist) | 0 (humano)${FOOTER_DISCLAIMER}`
};

const POLICY_TEXT = `
GUARDRAILS DO BOT (regras internas):
1) O bot NÃO emite parecer, NÃO diz “você tem direito”, NÃO recomenda ação judicial, NÃO define tese, NÃO calcula valores.
2) O bot só entrega: explicações gerais, checklist, passos de organização e orientação para procurar atendimento humano.
3) Se houver urgência (cobrança formal, notificação, protesto, prazo, citação/intimação), pedir foto/print e encaminhar para humano (0).
4) Dados: coletar o mínimo.
`;

module.exports = { STATE_TEXTS, POLICY_TEXT };
