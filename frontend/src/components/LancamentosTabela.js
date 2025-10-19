/**
 * Componente LancamentosTabela - AgroMark ESW424
 * Tabela de exibição dos movimentos financeiros
 */

import React from 'react';
import { FileText, Calendar, DollarSign, Users } from 'lucide-react';

const LancamentosTabela = ({ movimentos }) => {
  /**
   * Formata data no formato dd/mm/yyyy
   */
  const formatarData = (dataString) => {
    if (!dataString) return '-';
    
    try {
      const data = new Date(dataString);
      const dia = String(data.getDate()).padStart(2, '0');
      const mes = String(data.getMonth() + 1).padStart(2, '0');
      const ano = data.getFullYear();
      return `${dia}/${mes}/${ano}`;
    } catch {
      return '-';
    }
  };

  /**
   * Formata valor para moeda brasileira
   */
  const formatarMoeda = (valor) => {
    if (valor === null || valor === undefined) return 'R$ 0,00';
    
    try {
      const numero = parseFloat(valor);
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(numero);
    } catch {
      return 'R$ 0,00';
    }
  };

  // Se não houver movimentos, exibir mensagem
  if (!movimentos || movimentos.length === 0) {
    return (
      <div className="card text-center py-12">
        <FileText className="w-16 h-16 text-support-300 mx-auto mb-4" />
        <p className="text-lg text-support-600 font-body">
          Nenhum movimento encontrado.
        </p>
        <p className="text-sm text-support-500 mt-2">
          Os movimentos financeiros aparecerão aqui após serem criados.
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-secondary-100 border-b border-secondary-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-support uppercase tracking-wider">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4" />
                  <span>NF</span>
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-support uppercase tracking-wider">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span>Data Emissão</span>
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-support uppercase tracking-wider">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>Fornecedor</span>
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-support uppercase tracking-wider">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>Faturado</span>
                </div>
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-support uppercase tracking-wider">
                <div className="flex items-center justify-end space-x-2">
                  <DollarSign className="w-4 h-4" />
                  <span>Valor Total</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-secondary-200">
            {movimentos.map((movimento) => (
              <tr 
                key={movimento.id} 
                className="hover:bg-secondary-50 transition-colors"
              >
                <td className="px-4 py-3 text-sm font-medium text-support">
                  {movimento.numeroNotaFiscal || '-'}
                </td>
                <td className="px-4 py-3 text-sm text-support-600">
                  {formatarData(movimento.dataEmissao)}
                </td>
                <td className="px-4 py-3 text-sm text-support-600">
                  {movimento.fornecedor?.razaoSocial || '-'}
                </td>
                <td className="px-4 py-3 text-sm text-support-600">
                  {movimento.faturado?.razaoSocial || '-'}
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-primary-600 text-right">
                  {formatarMoeda(movimento.valorTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Rodapé com total */}
      <div className="bg-secondary-50 border-t border-secondary-200 px-4 py-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-support-600">
            Total de movimentos: <strong>{movimentos.length}</strong>
          </span>
          <span className="text-sm font-semibold text-support">
            Valor Total: {' '}
            <span className="text-primary-600">
              {formatarMoeda(
                movimentos.reduce((acc, mov) => acc + (parseFloat(mov.valorTotal) || 0), 0)
              )}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default LancamentosTabela;


