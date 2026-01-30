# Dossiê de Engenharia e Especificação Técnica: Sistema MOHSIS 🌾⚖️
## Inteligência Artificial Analítica para Crédito Rural e Risco Climático

**Ref:** MOHSIS-V4.0-MASTER  
**Data:** 30 de Janeiro de 2026  
**Classificação:** Documento Técnico de Engenharia  

---

## 1. Escopo e Propósito Sistêmico
O ecossistema **MOHSIS** é uma plataforma de consultoria técnica de missão crítica, desenhada para automatizar a auditoria de concessões de crédito rural e o pleito de instrumentos jurídicos de prorrogação de dívidas. O sistema integra inteligência artificial generativa com dados oficiais, climáticos e regulatórios, eliminando a dependência de análises manuais e fornecendo prova técnica irrefutável para produtores rurais.

---

## 2. Arquitetura de Processamento de Linguagem e IA

### 2.1. Agente Central e Raciocínio (Core Engine)
*   **Modelo Primário:** OpenAI GPT-5o para inferência lógica de alta complexidade.
*   **Modelo de Apoio:** GPT-5o-mini para tarefas de classificação e pré-processamento de alta performance.
*   **System Prompting:** Protocolo de "Chain of Thought" para decompor solicitações complexas (ex: análise multivariada de perdas de safra).

### 2.2. RAG (Retrieval-Augmented Generation) Profissional
*   **Motor Vetorial:** PostgreSQL com extensão `pgvector`.
*   **Modelos de Embedding:** `text-embedding-3-large` (3072 dimensões) para capturar sutilezas jurídicas do MCR.
*   **Segmentação (Chunking):** Estratégia de "Recursive Character Text Splitting" com sobreposição (context window) para garantir que cláusulas legais não sejam cortadas.

---

## 3. Engenharia de Integração de Dados Reais

### 3.1. Hub Agrometeorológico Proativo (NASA & INMET)
O sistema opera em uma malha de dados redundante para validação de anomalias climáticas:
*   **NASA POWER (Earth Observation):**
    *   **PRECTOT:** Precipitação total diária (mm).
    *   **T2M_MAX/MIN:** Temperaturas extremas para detecção de geada ou estresse hídrico.
    *   **GWETTOP:** Índice de umidade do solo (0-5cm), evidência técnica de seca.
*   **INMET (Rede de Estações de Superfície):** Consulta via API para dados locais de alta resolução.
*   **Lógica de Sincronização:** Se o delta de precisão da estação local exceder 15% ou houver falha de rede, o sistema automaticamente promove os dados orbitais da NASA como "Source of Truth".

### 3.2. Auditoria Regulatória Bancária (BACEN SGS)
Integração via API SGS (Sistema Gerenciador de Séries Temporais):
*   **Série 20770 & 20771:** Taxas médias de Crédito Rural (PJ/PF) — Base para identificar juros abusivos.
*   **Série 11:** Selic acumulada diária para liquidação de sentenças e cálculos moratórios.
*   **Cálculo Matemático:** Aplicação de algoritmos para simulação de sistemas de amortização (Price e SAC) em conformidade com o regramento do Bacen.

---

## 4. Processamento de Mídia e Resiliência (Media Bypass)

### 4.1. Transcrição e Análise Forense de Áudio
*   **Modelo:** Whisper-v3 com pré-processamento de ruído.
*   **Integração Uazapi:** Implementação de um manipulador de binários (Base64) que ignora a expiração de URLs da CDN do WhatsApp, permitindo o processamento de áudios criptografados ou antigos.

### 4.2. Visão Computacional para OCR Estruturado
*   **Vision-Logic:** O sistema utiliza `gpt-4o-vision` para realizar o mapeamento geográfico das informações em Cédulas de Crédito Rural (CCR) e Laudos de Vistoria.
*   **Extração:** Conversão de imagens em JSON estruturado com validação de campos obrigatórios do MCR.

---

## 5. Infraestrutura e Segurança (DevOps)

### 5.1. Stack Tecnológico e Orquestração
*   **Ambiente:** Node.js 18+ (LTS).
*   **Container de Aplicação:** Docker com imagem otimizada de 64-bit.
*   **Monitoramento de Processos:** PM2 com Cluster Mode para alta disponibilidade.

### 5.2. Segurança e LGPD (Data Privacy)
*   **Transitório de Dados:** Os arquivos de mídia (imagens/áudios) são retidos apenas em memória temporária (/tmp) e deletados imediatamente após a transcrição/extração.
*   **Isolamento:** Uso de variáveis de ambiente seguras para todas as chaves de API e tokens de comunicação.

---

## 6. Diferenciais Técnicos Comparativos

| Atributo | Solução Padrão | Ecossistema MOHSIS |
| :--- | :--- | :--- |
| **Precisão de Resposta**| Baseada no conhecimento da IA | Baseada em RAG + Dados de API Reais |
| **Validação Climática** | Pergunta ao usuário | Consulta NASA e INMET automaticamente |
| **Auditoria Financeira**| Estima parcelas | Usa taxas oficiais do Banco Central |
| **Resiliência de Mídia** | Falha em arquivos criptografados | Bypass Base64 via Uazapi oficial |
| **Citação de Fontes** | Não fornece | Identifica DocID, Seção e Item do MCR |

---

## 7. Protocolo de Resposta do Agente
O agente de IA opera sob um "System Prompt" de densidade técnica máxima, instruído a:
1.  **Priorizar Integridade:** Nunca alucinar dados quando a API retornar nulo.
2.  **Referenciar Normas:** Todos os conselhos proferidos devem estar amparados pelo Manual de Crédito Rural.
3.  **Formalismo Técnico:** As respostas são estruturadas para serem utilizadas em negociações formais com gerências bancárias.

---

## Conclusão de Engenharia
O sistema MOHSIS é uma solução de auditoria contínua, unificando os pilares de **Direito Agrário, Meteorologia Científica e Economia Aplicada**. Sua construção modular e integrações oficiais garantem que o produtor rural tenha em mãos não apenas uma interface de conversa, mas um relatório técnico de defesa irrefutável.

---
