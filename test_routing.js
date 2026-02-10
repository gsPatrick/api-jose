const AIAgentService = require('./src/features/AI_Agent/AI_Agent.service');
const { STATE_TEXTS } = require('./src/features/AI_Agent/AIAgentStates');

// Mock Client Service to avoid DB calls
const ClientService = require('./src/features/Client/Client.service');
ClientService.findOrCreateClient = async (number) => {
    return {
        whatsapp: number,
        conversation_stage: 'START',
        current_session: {},
        update: async (data) => {
            console.log(`[DB MOCK] Updated: ${JSON.stringify(data)}`);
            this.conversation_stage = data.conversation_stage || this.conversation_stage;
        }
    };
};

async function testRouting() {
    console.log("--- TESTE DE ROTEAMENTO SEMÂNTICO ---");

    // Create instance to access matchIntent
    const aiService = require('./src/features/AI_Agent/AI_Agent.service');

    const cases = [
        { input: "quero ver sobre chuva", state: "START", expected: "MENU1" }, // Keyword 'CHUVA' -> MENU1? No, wait. 
        // In START, 'CHUVA' is not mapped. 'DIVIDA' is.
        { input: "quero renegociar divida", state: "START", expected: "MENU1" },
        { input: "preciso de prazo", state: "START", expected: "MENU2" },
        { input: "problema ambiental", state: "START", expected: "MENU4" },

        // Deep navigation
        { input: "foi a chuva", state: "MENU1", expected: "M1CLIMA" },
        { input: "preço caiu", state: "MENU1", expected: "M1CAIXA" },

        // New Cases
        { input: "ver revisão de contrato", state: "MENU7", expected: "M7CASO6" },
        { input: "seguro negou", state: "MENU7", expected: "M7CASO7" },
        { input: "burocracia do proagro", state: "MENU7", expected: "M7CASO8" }
    ];

    for (const c of cases) {
        const result = aiService.matchIntent(c.input, c.state);
        const status = result === c.expected ? "PASS" : `FAIL (Expected ${c.expected}, Got ${result})`;
        console.log(`Input: "${c.input}" | State: ${c.state} -> ${status}`);
    }
}

testRouting();
