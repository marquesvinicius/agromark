/**
 * Página de Movimentos - AgroMark ESW424
 * Lista todos os movimentos financeiros cadastrados com filtros avançados e abas por tipo
 */

import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle, Search, Filter, Calendar, X, TrendingDown, TrendingUp, Layers } from 'lucide-react';
import LancamentosTabela from '../components/LancamentosTabela';
import { apiService } from '../services/apiService';

const LancamentosPage = () => {
  const [allMovimentos, setAllMovimentos] = useState([]);
  const [filteredMovimentos, setFilteredMovimentos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados de Filtro e Controle
  const [activeTab, setActiveTab] = useState('APAGAR'); // 'APAGAR' | 'ARECEBER' | 'TODOS'
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS'); 

  /**
   * Carrega todos os movimentos da API
   */
  const carregarMovimentos = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const resultado = await apiService.getMovimentos();

      if (resultado.success) {
        const dados = resultado.data || [];
        console.log('📦 Dados carregados:', dados.length, 'registros');
        setAllMovimentos(dados);
      } else {
        setError(resultado.error || 'Erro ao carregar lançamentos');
      }
    } catch (err) {
      console.error('Erro ao carregar movimentos:', err);
      setError(err.message || 'Erro ao conectar com o servidor');
    } finally {
      setIsLoading(false);
    }
  };

  // Carregar dados ao montar
  useEffect(() => {
    carregarMovimentos();
  }, []);

  // Lógica de Filtragem Centralizada
  useEffect(() => {
    let result = [...allMovimentos];

    // 1. Filtro por Tipo (Aba)
    if (activeTab !== 'TODOS') {
      result = result.filter(mov => {
        const movTipo = (mov.tipo || '').toUpperCase();
        const tipoNormalizado = movTipo === 'ARECEBER' ? 'ARECEBER' : 'APAGAR';
        return tipoNormalizado === activeTab;
      });
    }

    // 2. Filtro de Status
    if (statusFilter !== 'TODOS') {
      result = result.filter(mov => (mov.status || 'ATIVO') === statusFilter);
    }

    // 3. Filtro de Data
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      result = result.filter(mov => {
        if (!mov.dataEmissao) return false;
        const movDate = new Date(mov.dataEmissao);
        return movDate >= start;
      });
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter(mov => {
        if (!mov.dataEmissao) return false;
        const movDate = new Date(mov.dataEmissao);
        return movDate <= end;
      });
    }

    // 4. Busca Textual (Multi-campo)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(mov => 
        (mov.numeroNotaFiscal && mov.numeroNotaFiscal.toLowerCase().includes(term)) ||
        (mov.descricao && mov.descricao.toLowerCase().includes(term)) ||
        (mov.fornecedor?.razaoSocial && mov.fornecedor.razaoSocial.toLowerCase().includes(term)) ||
        (mov.faturado?.razaoSocial && mov.faturado.razaoSocial.toLowerCase().includes(term)) ||
        (mov.valorTotal && String(mov.valorTotal).includes(term))
      );
    }

    setFilteredMovimentos(result);
  }, [allMovimentos, activeTab, searchTerm, startDate, endDate, statusFilter]);

  const limparFiltros = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setStatusFilter('TODOS');
  };

  const hasActiveFilters = searchTerm || startDate || endDate || statusFilter !== 'TODOS';

  return (
    <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
      <div className="space-y-6">
        
        {/* Cabeçalho e Abas */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display text-support">
              Movimentos Financeiros
            </h1>
            <p className="text-support-600 mt-1 text-sm">
              Gerencie os lançamentos de receitas e despesas
            </p>
          </div>

          {/* Seletor de Abas */}
          <div className="flex bg-white p-1 rounded-lg shadow-sm border border-gray-200">
            <button
              onClick={() => setActiveTab('TODOS')}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'TODOS'
                  ? 'bg-gray-100 text-gray-800 shadow-sm border border-gray-200'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Layers className="w-4 h-4 mr-2" />
              Todos
            </button>
            <button
              onClick={() => setActiveTab('APAGAR')}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'APAGAR'
                  ? 'bg-red-50 text-red-700 shadow-sm border border-red-100'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <TrendingDown className="w-4 h-4 mr-2" />
              Despesas
            </button>
            <button
              onClick={() => setActiveTab('ARECEBER')}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'ARECEBER'
                  ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Receitas
            </button>
          </div>
        </div>

        {/* Barra de Filtros */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            
            {/* Campo de Busca */}
            <div className="md:col-span-5 space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">
                Buscar
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Nota, Fornecedor, Descrição..."
                  className="input pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Filtro de Datas */}
            <div className="md:col-span-4 grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">
                  De
                </label>
                <div className="relative">
                  <input
                    type="date"
                    className="input pl-9 text-sm"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">
                  Até
                </label>
                <div className="relative">
                  <input
                    type="date"
                    className="input pl-9 text-sm"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                  <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                </div>
              </div>
            </div>

            {/* Filtro de Status e Limpar */}
            <div className="md:col-span-3 flex gap-2 items-end">
              <div className="space-y-1 flex-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="input text-sm"
                >
                  <option value="TODOS">Todos</option>
                  <option value="ATIVO">Ativos</option>
                  <option value="INATIVO">Inativos</option>
                </select>
              </div>
              
              {hasActiveFilters && (
                <button 
                  onClick={limparFiltros}
                  className="h-[42px] px-3 text-primary-700 border border-primary-200 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors flex items-center justify-center mb-[1px]"
                  title="Limpar Filtros"
                >
                  <Filter className="w-4 h-4" />
                  <X className="w-3 h-3 -ml-1" />
                </button>
              )}
            </div>

          </div>
        </div>

        {/* Estados de Interface */}
        {isLoading && allMovimentos.length === 0 ? (
          <div className="card text-center py-12">
            <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
            <p className="text-lg text-support-600 font-body">Carregando dados...</p>
          </div>
        ) : error ? (
          <div className="card border-l-4 border-red-500 bg-red-50">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-900 mb-1">Erro</h3>
                <p className="text-red-700">{error}</p>
                <button onClick={carregarMovimentos} className="text-sm underline mt-2 text-red-800">
                  Tentar novamente
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Resumo dos Resultados */}
            <div className="flex items-center justify-between px-2">
              <span className="text-sm text-gray-500">
                Exibindo <strong>{filteredMovimentos.length}</strong> registro(s)
                {allMovimentos.length > 0 && (
                  <span className="ml-1">(filtrado de {allMovimentos.length} totais)</span>
                )}
              </span>
            </div>

            {/* Tabela */}
            <LancamentosTabela 
              movimentos={filteredMovimentos} 
              onDeleted={() => {
                // Recarrega dados para refletir o status atualizado
                carregarMovimentos();
              }} 
            />
          </>
        )}

      </div>
    </main>
  );
};

export default LancamentosPage;
