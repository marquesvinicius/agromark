/**
 * Teste Simples da API Gemini - AgroMark ESW424
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('./config');

async function testGemini() {
  console.log('🧪 Testando API Gemini...\n');
  
  if (!config.geminiApiKey || config.geminiApiKey === 'sua_nova_chave_aqui') {
    console.error('❌ ERRO: Chave da API não configurada!');
    console.log('📝 Edite o arquivo backend/.env e configure sua chave:');
    console.log('   GEMINI_API_KEY=AIzaSyC...sua_chave_aqui');
    console.log('\n💡 Depois reinicie o backend com: npm start');
    return;
  }
  
  console.log(`🔑 Chave: ${config.geminiApiKey.substring(0, 10)}...`);
  
  try {
    const genAI = new GoogleGenerativeAI(config.geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    console.log('🔄 Testando conexão...');
    const result = await model.generateContent("Responda apenas: OK");
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ SUCESSO: API funcionando!');
    console.log(`📝 Resposta: "${text.trim()}"`);
    
  } catch (error) {
    console.error('❌ ERRO na API:');
    console.error(`   ${error.message}`);
    
    if (error.message.includes('API_KEY_INVALID')) {
      console.log('\n💡 DICA: Verifique se a chave está correta no .env');
    } else if (error.message.includes('QUOTA_EXCEEDED')) {
      console.log('\n💡 DICA: Cota excedida - aguarde ou use outra chave');
    }
  }
}

testGemini();


