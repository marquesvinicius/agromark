-- CreateEnum
CREATE TYPE "PessoaTipo" AS ENUM ('FORNECEDOR', 'FATURADO', 'CLIENTE');

-- CreateEnum
CREATE TYPE "StatusRegistro" AS ENUM ('ATIVO', 'INATIVO');

-- CreateEnum
CREATE TYPE "ClassificacaoTipo" AS ENUM ('DESPESA', 'RECEITA');

-- CreateEnum
CREATE TYPE "MovimentoTipo" AS ENUM ('APAGAR', 'ARECEBER');

-- CreateEnum
CREATE TYPE "StatusParcela" AS ENUM ('ABERTA', 'PAGA', 'CANCELADA');

-- CreateTable
CREATE TABLE "pessoa" (
    "id" SERIAL NOT NULL,
    "tipo" "PessoaTipo" NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "fantasia" TEXT,
    "documento" TEXT NOT NULL,
    "status" "StatusRegistro" NOT NULL DEFAULT 'ATIVO',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pessoa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classificacao" (
    "id" SERIAL NOT NULL,
    "tipo" "ClassificacaoTipo" NOT NULL,
    "descricao" TEXT NOT NULL,
    "status" "StatusRegistro" NOT NULL DEFAULT 'ATIVO',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classificacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimento_contas" (
    "id" SERIAL NOT NULL,
    "tipo" "MovimentoTipo" NOT NULL DEFAULT 'APAGAR',
    "numeroNotaFiscal" TEXT NOT NULL,
    "dataEmissao" TIMESTAMP(3) NOT NULL,
    "descricao" TEXT,
    "valorTotal" DECIMAL(14,2) NOT NULL,
    "status" "StatusRegistro" NOT NULL DEFAULT 'ATIVO',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "fornecedorId" INTEGER NOT NULL,
    "faturadoId" INTEGER NOT NULL,

    CONSTRAINT "movimento_contas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parcela_contas" (
    "id" SERIAL NOT NULL,
    "identificacao" TEXT NOT NULL,
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "valorParcela" DECIMAL(14,2) NOT NULL,
    "valorSaldo" DECIMAL(14,2) NOT NULL,
    "statusParcela" "StatusParcela" NOT NULL DEFAULT 'ABERTA',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "movimentoId" INTEGER NOT NULL,

    CONSTRAINT "parcela_contas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimento_classificacao" (
    "movimentoId" INTEGER NOT NULL,
    "classificacaoId" INTEGER NOT NULL,

    CONSTRAINT "movimento_classificacao_pkey" PRIMARY KEY ("movimentoId","classificacaoId")
);

-- CreateIndex
CREATE INDEX "pessoa_tipo_idx" ON "pessoa"("tipo");

-- CreateIndex
CREATE UNIQUE INDEX "pessoa_documento_tipo_key" ON "pessoa"("documento", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "classificacao_descricao_tipo_key" ON "classificacao"("descricao", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "parcela_contas_identificacao_key" ON "parcela_contas"("identificacao");

-- AddForeignKey
ALTER TABLE "movimento_contas" ADD CONSTRAINT "movimento_contas_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "pessoa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimento_contas" ADD CONSTRAINT "movimento_contas_faturadoId_fkey" FOREIGN KEY ("faturadoId") REFERENCES "pessoa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcela_contas" ADD CONSTRAINT "parcela_contas_movimentoId_fkey" FOREIGN KEY ("movimentoId") REFERENCES "movimento_contas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimento_classificacao" ADD CONSTRAINT "movimento_classificacao_movimentoId_fkey" FOREIGN KEY ("movimentoId") REFERENCES "movimento_contas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimento_classificacao" ADD CONSTRAINT "movimento_classificacao_classificacaoId_fkey" FOREIGN KEY ("classificacaoId") REFERENCES "classificacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
