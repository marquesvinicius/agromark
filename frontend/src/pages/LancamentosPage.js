/**
 * Página de Movimentos - AgroMark ESW424
 * Lista todos os movimentos financeiros cadastrados
 */

import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import LancamentosTabela from '../components/LancamentosTabela';
import { apiService } from '../services/apiService';

const LancamentosPage = () => {
  const [movimentos, setMovimentos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Carrega os movimentos da API
   */
  const carregarMovimentos = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const resultado = await apiService.getMovimentos();

      if (resultado.success) {
        setMovimentos(resultado.data || []);
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

  // Carregar movimentos ao montar o componente
  useEffect(() => {
    carregarMovimentos();
  }, []);

  return (
    <>
      {/* Conteúdo Principal */}
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-6">
          
          {/* Cabeçalho da Página */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold font-display text-support">
                Movimentos Financeiros
              </h1>
              <p className="text-support-600 mt-2">
                Visualize todos os movimentos registrados no sistema
              </p>
            </div>
            
            {/* Botão de Atualizar */}
            <button
              onClick={carregarMovimentos}
              disabled={isLoading}
              className="btn-secondary flex items-center space-x-2"
              title="Atualizar lista"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </button>
          </div>

          {/* Estado de Carregamento */}
          {isLoading && (
            <div className="card text-center py-12">
              <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
              <p className="text-lg text-support-600 font-body">
                Carregando movimentos...
              </p>
              <p className="text-sm text-support-500 mt-2">
                Por favor, aguarde enquanto buscamos os dados
              </p>
            </div>
          )}

          {/* Estado de Erro */}
          {!isLoading && error && (
            <div className="card border-l-4 border-red-500 bg-red-50">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-red-900 mb-1">
                    Erro ao Carregar Movimentos
                  </h3>
                  <p className="text-red-700 mb-3">
                    {error}
                  </p>
                  <button
                    onClick={carregarMovimentos}
                    className="btn-primary text-sm"
                  >
                    Tentar Novamente
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tabela de Movimentos */}
          {!isLoading && !error && (
            <LancamentosTabela movimentos={movimentos} />
          )}

        </div>
      </main>
    </>
  );
};

export default LancamentosPage;

