/**
 * Componente ResultsDisplay - AgroMark ESW424
 * Exibe os resultados da extração de dados da Nota Fiscal
 */

import React, { useState } from 'react';
import { apiService } from '../services/apiService';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, 
  Download, 
  Eye, 
  Code, 
  Building2, 
  User, 
  FileText, 
  Package, 
  CreditCard, 
  Tag,
  Calendar,
  DollarSign,
  Copy,
  Check,
  BarChart3
} from 'lucide-react';

const ResultsDisplay = ({ results, onReset }) => {
  const [activeTab, setActiveTab] = useState('formatted');
  const [copiedField, setCopiedField] = useState(null);
  const [checkStatus, setCheckStatus] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);

  const copyToClipboard = async (text, fieldName) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toast.success(`${fieldName} copiado!`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      toast.error('Erro ao copiar');
    }
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return 'Não informado';
    
    // Converte para número, independentemente de ser string ou number
    const numberValue = Number(value);

    if (isNaN(numberValue)) return 'Valor inválido';

    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numberValue);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Não informado';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  const formatCNPJ = (cnpj) => {
    if (!cnpj) return 'Não informado';
    if (cnpj.length === 14) {
      return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return cnpj;
  };

  const formatCPF = (cpf) => {
    if (!cpf) return 'Não informado';
    if (cpf.length === 11) {
      return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return cpf;
  };

  const downloadJSON = () => {
    const dataStr = JSON.stringify(results, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `nota_fiscal_${results.notaFiscal?.numero || 'dados'}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast.success('Arquivo JSON baixado!');
  };

  const CopyButton = ({ text, fieldName, className = "" }) => (
    <button
      onClick={() => copyToClipboard(text, fieldName)}
      className={`p-1 text-gray-400 hover:text-gray-600 transition-colors ${className}`}
      title={`Copiar ${fieldName}`}
    >
      {copiedField === fieldName ? (
        <Check className="w-4 h-4 text-green-500" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </button>
  );

  const InfoCard = ({ icon: Icon, title, children, className = "" }) => (
    <div className={`card ${className}`}>
      <div className="flex items-center space-x-2 mb-4">
        <Icon className="w-5 h-5 text-primary-600" />
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  );

  const renderStatusBadge = (status) => {
    if (!status) return null;
    if (status.exists) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-green-100 text-green-700">
          EXISTE — ID {status.id}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
        NÃO EXISTE
      </span>
    );
  };

  const handleCheckAll = async () => {
    try {
      setIsChecking(true);
      const payload = {
        fornecedor: {
          cnpj: results.fornecedor?.cnpj,
          razaoSocial: results.fornecedor?.razaoSocial
        },
        faturado: {
          cpf: results.faturado?.cpf,
          cnpj: results.faturado?.cnpj,
          nomeCompleto: results.faturado?.nome
        },
        // compatibilidade com Etapa 1 (campos aninhados)
        classificacaoDespesa: results.classificacao?.categoria || results?.classificacaoDespesa,
        classificacoes: results.classificacoes || [],
        notaFiscal: { // Adiciona o objeto notaFiscal para a nova checagem
          numero: results.notaFiscal?.numero
        },
        numeroNota: results.notaFiscal?.numero || results?.notaFiscal?.numeroNota,
        dataEmissao: results.notaFiscal?.dataEmissao,
        parcelas: results.financeiro?.parcelas?.map((parcela, index) => ({
          numero: parcela.numero || index + 1,
          dataVencimento: parcela.dataVencimento,
          valor: parcela.valor
        })) || [],
        valorTotal: results.financeiro?.valorTotal,
        itensDescricao: results.produtos?.map((item) => item.descricao) || []
      };

      const response = await apiService.checkAll(payload);
      
      // Verificar se o movimento já existe baseado no número da nota fiscal
      let movimentoExists = false;
      if (results.notaFiscal?.numero) {
        try {
          const movimentosResponse = await apiService.getMovimentos();
          if (movimentosResponse.success && movimentosResponse.data) {
            const movimentoExistente = movimentosResponse.data.find(
              m => m.numeroNotaFiscal === results.notaFiscal?.numero
            );
            movimentoExists = !!movimentoExistente;
          }
        } catch (error) {
          console.warn('Não foi possível verificar movimentos existentes:', error);
        }
      }
      
      // Adicionar informação sobre o movimento ao status
      const statusComMovimento = {
        ...response,
        movimento: {
          exists: movimentoExists
        }
      };
      
      setCheckStatus(statusComMovimento);
      
      if (movimentoExists) {
        toast.success('Verificação concluída - Movimento já existe');
      } else {
        toast.success('Verificação concluída - Pronto para registrar');
      }
    } catch (error) {
      toast.error(error.message || 'Erro ao verificar dados');
    } finally {
      setIsChecking(false);
    }
  };

  const handleCreateAndLaunch = async () => {
    if (!checkStatus) {
      toast.error('Verifique no banco antes de lançar.');
      return;
    }

    const categoriaBase = (results.classificacao?.categoria || results?.classificacaoDespesa || '').toString().trim();
    if (!categoriaBase) {
      toast.error('Classificação de despesa ausente. Revise os dados extraídos.');
      return;
    }

    if (!results.notaFiscal?.numero) {
      toast.error('Número da Nota Fiscal não encontrado. Verifique a extração antes de lançar.');
      return;
    }

    if (!results.financeiro?.valorTotal) {
      toast.error('Valor total não identificado. Ajuste o JSON antes de lançar.');
      return;
    }

    try {
      setIsLaunching(true);

      const basePayload = {
        fornecedor: {
          cnpj: results.fornecedor?.cnpj,
          razaoSocial: results.fornecedor?.razaoSocial,
          fantasia: results.fornecedor?.nomeFantasia
        },
        faturado: {
          cpf: results.faturado?.cpf,
          cnpj: results.faturado?.cnpj,
          nome: results.faturado?.nome
        },
        classificacaoDespesa: categoriaBase,
        classificacoes: [categoriaBase]
      };

      const creation = await apiService.createNecessary(basePayload);

      const parcelasOriginais = Array.isArray(results.financeiro?.parcelas)
        ? results.financeiro.parcelas
        : [];

      const movimentoPayload = {
        movimento: {
          numeroNotaFiscal: results.notaFiscal?.numero,
          dataEmissao: results.notaFiscal?.dataEmissao,
          valorTotal: results.financeiro?.valorTotal,
          descricao: results.classificacao?.observacoes || results.notaFiscal?.descricao || 'Lançamento automático',
          fornecedorId: creation.fornecedorId,
          faturadoId: creation.faturadoId
        },
        parcelas: parcelasOriginais.map((parcela, index) => ({
          identificacao: `${results.notaFiscal?.numero}-parcela-${String(index + 1).padStart(2, '0')}`,
          dataVencimento: parcela.dataVencimento,
          valor: parcela.valor,
          valorSaldo: parcela.valor ?? parcela.valorParcela ?? parcela.valorTotal ?? parcela.valor
        })),
        classificacoes: creation.classificacaoIds
      };

      if (movimentoPayload.parcelas.length === 0 && results.financeiro?.valorTotal) {
        movimentoPayload.parcelas.push({
          identificacao: `${results.notaFiscal?.numero}-parcela-01`,
          dataVencimento: results.financeiro?.parcelas?.[0]?.dataVencimento || results.notaFiscal?.dataEmissao,
          valor: results.financeiro?.valorTotal,
          valorSaldo: results.financeiro?.valorTotal
        });
      }

      const movimento = await apiService.criarMovimento(movimentoPayload);

      toast.success(`Registro lançado com sucesso (Movimento #${movimento.movimentoId})`);
      setCheckStatus({
        fornecedor: { exists: true, id: creation.fornecedorId },
        faturado: { exists: true, id: creation.faturadoId },
        despesa: { exists: true, id: creation.classificacaoIds[0] },
        movimento: { exists: true, id: movimento.movimentoId } // AQUI ESTÁ O ERRO DE DIGITAÇÃO SUTIL
      });
    } catch (error) {
      toast.error(error.message || 'Erro ao lançar movimento');
    } finally {
      setIsLaunching(false);
    }
  };

  const DataRow = ({ label, value, copyable = false, fieldName }) => (
    <div className="py-2 border-b border-gray-100 last:border-b-0">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600 font-medium">{label}:</span>
        {copyable && value && (
          <CopyButton text={value} fieldName={fieldName} />
        )}
      </div>
      <p className="text-sm text-gray-900 break-words mt-1">
        {value || 'Não informado'}
      </p>
    </div>
  );

  return (
    <div className="space-y-6">
      
      {/* Botão Nova Extração */}
      <div className="flex justify-start">
        <button
          onClick={onReset}
          className="btn-outline flex items-center justify-center"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Nova Extração
        </button>
      </div>

      {/* Header com Título e Botões de Ação */}
      <div className="card bg-gradient-to-r from-primary-50 to-white border-primary-100">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Título */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              Dados Extraídos
            </h2>
            <p className="text-sm text-gray-600">
              Processado em {formatDate(results.metadata?.processedAt)}
            </p>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Verificar no Banco */}
            <button
              onClick={handleCheckAll}
              disabled={isChecking}
              className="btn-secondary flex items-center justify-center whitespace-nowrap"
              title="Verificar se fornecedor, faturado e classificação existem no banco"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              {isChecking ? 'Verificando...' : 'Verificar no Banco'}
            </button>

            {/* Criar/Atualizar e Lançar */}
            <button
              onClick={handleCreateAndLaunch}
              disabled={isLaunching || !checkStatus}
              className="btn-primary flex items-center justify-center whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              title={!checkStatus ? 'Clique em "Verificar no Banco" primeiro' : 'Criar registros necessários e lançar movimento financeiro'}
            >
              <Check className="w-4 h-4 mr-2" />
              {isLaunching 
                ? 'Processando...' 
                : !checkStatus 
                  ? 'Verificar Primeiro'
                  : checkStatus.movimento?.exists 
                    ? 'Atualizar Movimento'
                    : 'Registrar Movimento'
              }
            </button>
          </div>
        </div>
      </div>

      {/* Tabs de Visualização */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('formatted')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'formatted'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Eye className="w-4 h-4 mr-2 inline" />
            Visualização Formatada
          </button>
          <button
            onClick={() => setActiveTab('json')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'json'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Code className="w-4 h-4 mr-2 inline" />
            JSON Bruto
          </button>
        </nav>
      </div>

      {/* Conteúdo das Tabs */}
      {activeTab === 'formatted' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Fornecedor */}
          <InfoCard icon={Building2} title="Fornecedor">
            <div className="space-y-2">
              {renderStatusBadge(checkStatus?.fornecedor)}
              <DataRow 
                label="Razão Social" 
                value={results.fornecedor?.razaoSocial} 
                copyable 
                fieldName="Razão Social" 
              />
              <DataRow 
                label="Nome Fantasia" 
                value={results.fornecedor?.nomeFantasia} 
                copyable 
                fieldName="Nome Fantasia" 
              />
              <DataRow 
                label="CNPJ" 
                value={formatCNPJ(results.fornecedor?.cnpj)} 
                copyable 
                fieldName="CNPJ" 
              />
              <DataRow 
                label="Endereço" 
                value={results.fornecedor?.endereco} 
                copyable 
                fieldName="Endereço" 
              />
              <DataRow 
                label="Telefone" 
                value={results.fornecedor?.telefone} 
                copyable 
                fieldName="Telefone" 
              />
            </div>
          </InfoCard>

          {/* Cliente/Faturado */}
          <InfoCard icon={User} title="Cliente/Faturado">
            <div className="space-y-2">
              {renderStatusBadge(checkStatus?.faturado)}
              <DataRow 
                label="Nome" 
                value={results.faturado?.nome} 
                copyable 
                fieldName="Nome do Cliente" 
              />
              <DataRow 
                label="CPF" 
                value={formatCPF(results.faturado?.cpf)} 
                copyable 
                fieldName="CPF" 
              />
              <DataRow 
                label="CNPJ" 
                value={formatCNPJ(results.faturado?.cnpj)} 
                copyable 
                fieldName="CNPJ do Cliente" 
              />
              <DataRow 
                label="Endereço" 
                value={results.faturado?.endereco} 
                copyable 
                fieldName="Endereço do Cliente" 
              />
            </div>
          </InfoCard>

          {/* Nota Fiscal */}
          <InfoCard icon={FileText} title="Nota Fiscal">
            <div className="space-y-2">
              {renderStatusBadge(checkStatus?.movimento)}
              <DataRow 
                label="Número" 
                value={results.notaFiscal?.numero} 
                copyable 
                fieldName="Número da NF" 
              />
              <DataRow 
                label="Série" 
                value={results.notaFiscal?.serie} 
                copyable 
                fieldName="Série" 
              />
              <DataRow 
                label="Data de Emissão" 
                value={formatDate(results.notaFiscal?.dataEmissao)} 
                copyable 
                fieldName="Data de Emissão" 
              />
              <DataRow 
                label="Chave de Acesso" 
                value={results.notaFiscal?.chaveAcesso} 
                copyable 
                fieldName="Chave de Acesso" 
              />
            </div>
          </InfoCard>

          {/* Classificação */}
          <InfoCard icon={Tag} title="Classificação">
            <div className="space-y-2">
              {renderStatusBadge(checkStatus?.despesa)}
              <DataRow 
                label="Categoria" 
                value={results.classificacao?.categoria} 
                copyable 
                fieldName="Categoria" 
              />
              <DataRow 
                label="Observações" 
                value={results.classificacao?.observacoes} 
                copyable 
                fieldName="Observações" 
              />
            </div>
            
            {results.classificacao?.categoria && (
              <div className="mt-4 p-3 bg-primary-50 border border-primary-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Tag className="w-4 h-4 text-primary-600" />
                  <span className="text-sm font-medium text-primary-900">
                    {results.classificacao.categoria}
                  </span>
                </div>
                {results.classificacao.observacoes && (
                  <p className="text-sm text-primary-700 mt-1">
                    {results.classificacao.observacoes}
                  </p>
                )}
              </div>
            )}
          </InfoCard>

          {/* Produtos */}
          <InfoCard icon={Package} title="Produtos/Serviços" className="lg:col-span-2">
            {results.produtos && results.produtos.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 font-medium text-gray-900">Descrição</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-900">Qtd</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-900">Valor Unit.</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-900">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.produtos.map((produto, index) => (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="py-2 px-3 text-gray-900">{produto.descricao}</td>
                        <td className="py-2 px-3 text-right text-gray-600">
                          {produto.quantidade || '-'}
                        </td>
                        <td className="py-2 px-3 text-right text-gray-600">
                          {formatCurrency(produto.valorUnitario)}
                        </td>
                        <td className="py-2 px-3 text-right font-medium text-gray-900">
                          {formatCurrency(produto.valorTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">Nenhum produto encontrado</p>
            )}
          </InfoCard>

          {/* Financeiro */}
          <InfoCard icon={CreditCard} title="Informações Financeiras" className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Valor Total */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Valor Total
                </h4>
                <div className="text-2xl font-bold text-primary-600">
                  {formatCurrency(results.financeiro?.valorTotal)}
                </div>
              </div>

              {/* Parcelas */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  Parcelas
                </h4>
                {results.financeiro?.parcelas && results.financeiro.parcelas.length > 0 ? (
                  <div className="space-y-2">
                    {results.financeiro.parcelas.map((parcela, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-600">
                          Parcela {parcela.numero}
                        </span>
                        <div className="text-right">
                          <div className="font-medium text-gray-900">
                            {formatCurrency(parcela.valor)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatDate(parcela.dataVencimento)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">Nenhuma parcela definida</p>
                )}
              </div>
            </div>
          </InfoCard>

        </div>
      ) : (
        /* JSON Tab */
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Dados em JSON</h3>
            <div className="flex gap-2">
              <button
                onClick={() => copyToClipboard(JSON.stringify(results, null, 2), 'JSON completo')}
                className="btn-secondary flex items-center justify-center"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copiar JSON
              </button>
              <button
                onClick={downloadJSON}
                className="btn-secondary flex items-center justify-center"
                title="Baixar dados extraídos em formato JSON"
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar JSON
              </button>
            </div>
          </div>
          
          <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
            <pre className="text-green-400 text-sm whitespace-pre-wrap">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Metadados do Processamento */}
      <div className="card bg-gray-50 border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <BarChart3 className="w-5 h-5 text-primary-600 mr-2" />
          Informações do Processamento
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-gray-600">Arquivo</div>
            <div className="font-medium text-gray-900">
              {results.metadata?.fileName || 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-gray-600">Tamanho</div>
            <div className="font-medium text-gray-900">
              {results.metadata?.fileSize ? 
                `${(results.metadata.fileSize / 1024).toFixed(1)} KB` : 
                'N/A'
              }
            </div>
          </div>
          <div>
            <div className="text-gray-600">Páginas</div>
            <div className="font-medium text-gray-900">
              {results.metadata?.pages || 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-gray-600">Processado</div>
            <div className="font-medium text-gray-900">
              {formatDate(results.metadata?.processedAt)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsDisplay;
