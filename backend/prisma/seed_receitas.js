const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CLIENTES_NAMES = [
  'Cargill Agrícola SA', 'Bunge Alimentos', 'Cooperativa Agroindustrial', 
  'JBS Friboi', 'Minerva Foods', 'Amaggi Exportação'
];

const CLASSIFICACOES_RECEITA = [
  'Venda de Soja', 'Venda de Milho', 'Venda de Gado', 'Prestação de Serviço'
];

async function main() {
  console.log('💰 Iniciando seed de RECEITAS e CLIENTES...');

  // 1. Obter o Faturado (Nós)
  const faturado = await prisma.pessoa.findFirst({
    where: { tipo: 'FATURADO' }
  });

  if (!faturado) {
    console.error('❌ Nenhum Faturado encontrado. Rode o seed_large.js primeiro.');
    return;
  }

  // 2. Garantir Classificações de Receita
  const classificacoes = [];
  for (const desc of CLASSIFICACOES_RECEITA) {
    const c = await prisma.classificacao.upsert({
      where: { descricao_tipo: { descricao: desc, tipo: 'RECEITA' } },
      update: {},
      create: { descricao: desc, tipo: 'RECEITA' }
    });
    classificacoes.push(c);
  }

  // 3. Criar Clientes
  const clientes = [];
  for (let i = 0; i < CLIENTES_NAMES.length; i++) {
    const c = await prisma.pessoa.upsert({
      where: { 
        documento_tipo: { 
          documento: `99999999000${i}`, 
          tipo: 'CLIENTE' 
        } 
      },
      update: {},
      create: {
        razaoSocial: CLIENTES_NAMES[i],
        fantasia: CLIENTES_NAMES[i],
        documento: `99999999000${i}`,
        tipo: 'CLIENTE'
      }
    });
    clientes.push(c);
  }
  console.log(`✅ ${clientes.length} Clientes criados/atualizados.`);

  // 4. Gerar 50 Movimentos de Receita
  for (let i = 1; i <= 50; i++) {
    const cliente = clientes[Math.floor(Math.random() * clientes.length)];
    const classificacao = classificacoes[Math.floor(Math.random() * classificacoes.length)];
    
    // Valores maiores para receita
    const valorBase = (Math.random() * 50000 + 10000).toFixed(2);
    const dataEmissao = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
    
    const movimento = await prisma.movimentoContas.create({
      data: {
        tipo: 'ARECEBER', // Importante: Tipo RECEITA
        numeroNotaFiscal: `VENDA-${2024}-${String(i).padStart(3, '0')}`,
        dataEmissao: dataEmissao,
        valorTotal: parseFloat(valorBase),
        descricao: `${classificacao.descricao} - Contrato #${i + 1000}`,
        fornecedorId: cliente.id, // No modelo atual, usamos o campo fornecedorId para a contraparte (Cliente)
        faturadoId: faturado.id,
        status: 'ATIVO'
      }
    });

    // Vincular classificação
    await prisma.movimentoClassificacao.create({
      data: {
        movimentoId: movimento.id,
        classificacaoId: classificacao.id
      }
    });

    // Criar Parcela (Vencimento 15 dias depois)
    const dataVencimento = new Date(dataEmissao);
    dataVencimento.setDate(dataVencimento.getDate() + 15);

    await prisma.parcelaContas.create({
      data: {
        identificacao: `PARC-REC-${movimento.numeroNotaFiscal}`,
        dataVencimento: dataVencimento,
        valorParcela: parseFloat(valorBase),
        valorSaldo: parseFloat(valorBase),
        statusParcela: 'ABERTA',
        movimentoId: movimento.id
      }
    });
  }

  console.log('🚀 Seed de RECEITAS concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

