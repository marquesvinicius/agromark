const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const despesasSeed = [
  'MANUTENÇÃO E OPERAÇÃO',
  'INFRAESTRUTURA E UTILIDADES',
  'INSUMOS AGRÍCOLAS',
  'RECURSOS HUMANOS',
  'SERVIÇOS OPERACIONAIS',
  'ADMINISTRATIVAS',
  'SEGUROS E PROTEÇÃO',
  'IMPOSTOS E TAXAS',
  'INVESTIMENTOS'
];

async function runSeed() {
  try {
    for (const descricao of despesasSeed) {
      await prisma.classificacao.upsert({
        where: {
          descricao_tipo: {
            descricao,
            tipo: 'DESPESA'
          }
        },
        create: {
          descricao,
          tipo: 'DESPESA'
        },
        update: {}
      });
    }

    console.log('🌱 Seed de classificações concluído.');
  } catch (error) {
    console.error('❌ Erro ao executar seed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runSeed();


