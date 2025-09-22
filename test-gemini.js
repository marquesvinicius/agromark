/**
 * Script de Teste da API Gemini - AgroMark ESW424
 * Testa se a nova chave está funcionando
 */

require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGeminiAPI() {
  console.log('🧪 Testando nova chave da API Gemini...\n');
  
  // Verificar se a chave existe
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey || apiKey === 'sua_nova_chave_aqui') {
    console.error('❌ ERRO: Chave da API não configurada!');
    console.log('📝 Edite o arquivo backend/.env e configure sua chave:');
    console.log('   GEMINI_API_KEY=AIzaSyC...sua_chave_aqui');
    process.exit(1);
  }
  
  console.log(`🔑 Chave encontrada: ${apiKey.substring(0, 10)}...`);
  
  try {
    // Testar conexão
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    console.log('🔄 Testando conexão com Gemini...');
    const result = await model.generateContent("Responda apenas: OK");
    const response = await result.response;
    const text = response.text();
    
    if (text.trim().toUpperCase().includes('OK')) {
      console.log('✅ SUCESSO: API Gemini funcionando!');
      console.log(`📝 Resposta: "${text.trim()}"`);
    } else {
      console.log('⚠️ AVISO: API respondeu, mas formato inesperado');
      console.log(`📝 Resposta: "${text.trim()}"`);
    }
    
  } catch (error) {
    console.error('❌ ERRO na API Gemini:');
    console.error(`   Tipo: ${error.name}`);
    console.error(`   Mensagem: ${error.message}`);
    
    if (error.message.includes('API_KEY_INVALID')) {
      console.log('\n💡 DICA: Verifique se a chave está correta');
    } else if (error.message.includes('QUOTA_EXCEEDED')) {
      console.log('\n💡 DICA: Cota excedida - aguarde ou use outra chave');
    } else if (error.message.includes('PERMISSION_DENIED')) {
      console.log('\n💡 DICA: Verifique as permissões da chave');
    }
  }
}

// Executar teste
testGeminiAPI().then(() => {
  console.log('\n🏁 Teste concluído!');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Erro no teste:', error);
  process.exit(1);
});
