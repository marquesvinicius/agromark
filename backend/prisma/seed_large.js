const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const FORNECEDORES_NAMES = [
  'Agro Insumos LTDA', 'Fertilizantes Goiás', 'Sementes Boa Safra', 
  'Tratores e Peças SA', 'Combustíveis do Vale', 'Cooperativa Rural',
  'AgroTech Soluções', 'Fazenda Vizinha', 'Transportadora Rápida',
  'Manutenção de Maquinário Silva'
];

const CLASSIFICACOES_DESPESA = [
  'Insumos Agrícolas', 'Combustível', 'Manutenção de Máquinas', 
  'Salários', 'Energia Elétrica', 'Impostos', 'Frete', 'Aluguel de Pasto'
];

const CLASSIFICACOES_RECEITA = [
  'Venda de Soja', 'Venda de Milho', 'Prestação de Serviço', 'Aluguel de Equipamento'
];

async function main() {
  console.log('🌱 Iniciando seed massivo de 200 registros...');

  // 1. Limpar banco (opcional, mas bom para testes limpos)
  // await prisma.parcelaContas.deleteMany();
  // await prisma.movimentoClassificacao.deleteMany();
  // await prisma.movimentoContas.deleteMany();
  // await prisma.pessoa.deleteMany();
  // await prisma.classificacao.deleteMany();

  // 2. Criar Classificações
  const classificacoes = [];
  for (const desc of CLASSIFICACOES_DESPESA) {
    const c = await prisma.classificacao.upsert({
      where: { descricao_tipo: { descricao: desc, tipo: 'DESPESA' } },
      update: {},
      create: { descricao: desc, tipo: 'DESPESA' }
    });
    classificacoes.push(c);
  }

  // 3. Criar Faturado (Nós)
  const faturado = await prisma.pessoa.upsert({
    where: { documento_tipo: { documento: '12345678000199', tipo: 'FATURADO' } },
    update: {},
    create: {
      razaoSocial: 'Minha Fazenda LTDA',
      fantasia: 'Fazenda São José',
      documento: '12345678000199',
      tipo: 'FATURADO'
    }
  });

  // 4. Criar Fornecedores
  const fornecedores = [];
  for (let i = 0; i < FORNECEDORES_NAMES.length; i++) {
    const f = await prisma.pessoa.upsert({
      where: { 
        documento_tipo: { 
          documento: `00000000000${i}`, 
          tipo: 'FORNECEDOR' 
        } 
      },
      update: {},
      create: {
        razaoSocial: FORNECEDORES_NAMES[i],
        fantasia: FORNECEDORES_NAMES[i],
        documento: `00000000000${i}`,
        tipo: 'FORNECEDOR'
      }
    });
    fornecedores.push(f);
  }

  // 5. Gerar 200 Movimentos
  for (let i = 1; i <= 200; i++) {
    const fornecedor = fornecedores[Math.floor(Math.random() * fornecedores.length)];
    const classificacao = classificacoes[Math.floor(Math.random() * classificacoes.length)];
    
    const valorBase = (Math.random() * 5000 + 100).toFixed(2);
    const dataEmissao = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
    
    const movimento = await prisma.movimentoContas.create({
      data: {
        tipo: 'APAGAR',
        numeroNotaFiscal: `NF-${2024}-${String(i).padStart(4, '0')}`,
        dataEmissao: dataEmissao,
        valorTotal: parseFloat(valorBase),
        descricao: `Compra de ${classificacao.descricao} - Registro Automático ${i}`,
        fornecedorId: fornecedor.id,
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

    // Criar Parcela (Vencimento 30 dias depois)
    const dataVencimento = new Date(dataEmissao);
    dataVencimento.setDate(dataVencimento.getDate() + 30);

    await prisma.parcelaContas.create({
      data: {
        identificacao: `PARC-${movimento.numeroNotaFiscal}-01`,
        dataVencimento: dataVencimento,
        valorParcela: parseFloat(valorBase),
        valorSaldo: parseFloat(valorBase),
        statusParcela: 'ABERTA',
        movimentoId: movimento.id
      }
    });

    if (i % 20 === 0) console.log(`✅ Criados ${i} registros...`);
  }

  console.log('🚀 Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

