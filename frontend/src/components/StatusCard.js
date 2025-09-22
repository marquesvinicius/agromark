/**
 * Componente StatusCard - AgroMark ESW424
 * Exibe status da conexão com API e Gemini
 */

import React from 'react';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';

const StatusCard = ({ isOnline, geminiConnected, loading, onRefresh }) => {
  
  const handleRefreshClick = async () => {
    console.log('Usuário clicou em refresh - testando Gemini...');
    if (onRefresh) {
      onRefresh(true); // Parâmetro true indica que é refresh manual
    }
  };
  const getStatusIcon = (status, isLoading) => {
    if (isLoading) {
      return <RefreshCw className="w-4 h-4 animate-spin" />;
    }
    
    if (status === true) {
      return <CheckCircle className="w-4 h-4 text-primary-600" />;
    }
    
    if (status === false) {
      return <XCircle className="w-4 h-4 text-expense" />;
    }
    
    // status === null (não verificado)
    return <RefreshCw className="w-4 h-4 text-support-400" />;
  };

  const getStatusText = (status, isLoading, label) => {
    if (isLoading) return `Verificando ${label}...`;
    if (status === true) return `${label} Online`;
    if (status === false) return `${label} Offline`;
    return `${label} Não verificado`;
  };

  const getStatusColor = (status, isLoading) => {
    if (isLoading) return 'text-support-600';
    if (status === true) return 'text-primary-600-600';
    if (status === false) return 'text-expense-600';
    return 'text-support-600'; // status === null
  };

  // Determinar cor geral do card
  const getCardStyle = () => {
    if (loading) return 'bg-secondary-50 border-secondary-200';
    if (isOnline && geminiConnected === true) return 'bg-primary-50 border-primary-200';
    if (isOnline && geminiConnected === false) return 'bg-accent-50 border-accent-200';
    if (isOnline && geminiConnected === null) return 'bg-secondary-50 border-secondary-200';
    return 'bg-expense-50 border-expense-200';
  };

  const getOverallStatus = () => {
    if (loading) return { icon: RefreshCw, text: 'Verificando status...', color: 'text-support-600' };
    if (isOnline && geminiConnected === true) return { icon: CheckCircle, text: 'Sistema operacional', color: 'text-primary-600-600' };
    if (isOnline && geminiConnected === false) return { icon: AlertCircle, text: 'IA indisponível', color: 'text-accent-600' };
    if (isOnline && geminiConnected === null) return { icon: RefreshCw, text: 'Conferir status da IA', color: 'text-support-600' };
    return { icon: XCircle, text: 'Sistema offline', color: 'text-expense-600' };
  };

  const overallStatus = getOverallStatus();
  const StatusIcon = overallStatus.icon;

  return (
    <div className="container mx-auto px-4 py-2">
      <div className={`card ${getCardStyle()} transition-all duration-200`}>
        
        {/* Layout Desktop */}
        <div className="hidden md:flex items-center justify-between">
          
          {/* Status Geral */}
          <div className="flex items-center space-x-3">
            <StatusIcon className={`w-5 h-5 ${overallStatus.color} ${loading ? 'animate-spin' : ''}`} />
            <div>
              <div className={`font-medium ${overallStatus.color}`}>
                {overallStatus.text}
              </div>
              <div className="text-xs text-gray-500">
                Status do sistema em tempo real
              </div>
            </div>
          </div>

          {/* Detalhes dos Serviços */}
          <div className="flex items-center space-x-6">
            
            {/* API Status */}
            <div className="flex items-center space-x-2">
              {isOnline ? <Wifi className="w-4 h-4 text-primary-600" /> : <WifiOff className="w-4 h-4 text-expense" />}
              <div className="text-sm font-body">
                <div className={`font-medium ${getStatusColor(isOnline, loading)}`}>
                  {getStatusText(isOnline, loading, 'API')}
                </div>
              </div>
            </div>

            {/* Gemini Status */}
            <div className="flex items-center space-x-2">
              {getStatusIcon(geminiConnected, loading)}
              <div className="text-sm font-body">
                <div className={`font-medium ${getStatusColor(geminiConnected, loading)}`}>
                  {getStatusText(geminiConnected, loading, 'Gemini AI')}
                </div>
              </div>
            </div>

            {/* Botão de Refresh */}
            <button
              onClick={handleRefreshClick}
              disabled={loading}
              className="p-2 text-support-400 hover:text-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Atualizar status (testa Gemini API)"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Layout Mobile */}
        <div className="md:hidden space-y-3">
          
          {/* Status Geral */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <StatusIcon className={`w-5 h-5 ${overallStatus.color} ${loading ? 'animate-spin' : ''}`} />
              <div>
                <div className={`font-medium ${overallStatus.color}`}>
                  {overallStatus.text}
                </div>
                <div className="text-xs text-gray-500">
                  Status do sistema
                </div>
              </div>
            </div>
            
            {/* Botão de Refresh */}
            <button
              onClick={handleRefreshClick}
              disabled={loading}
              className="p-2 text-support-400 hover:text-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Atualizar status"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Detalhes dos Serviços - Mobile */}
          <div className="grid grid-cols-2 gap-3">
            
            {/* API Status */}
            <div className="flex items-center space-x-2">
              {isOnline ? <Wifi className="w-4 h-4 text-primary-600" /> : <WifiOff className="w-4 h-4 text-expense" />}
              <div className="text-sm">
                <div className={`font-medium ${getStatusColor(isOnline, loading)}`}>
                  {getStatusText(isOnline, loading, 'API')}
                </div>
              </div>
            </div>

            {/* Gemini Status */}
            <div className="flex items-center space-x-2">
              {getStatusIcon(geminiConnected, loading)}
              <div className="text-sm">
                <div className={`font-medium ${getStatusColor(geminiConnected, loading)}`}>
                  {getStatusText(geminiConnected, loading, 'IA')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Alertas */}
        {!loading && (!isOnline || geminiConnected === false) && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-600">
                {!isOnline && (
                  <div>
                    <strong>API Offline:</strong> Verifique se o backend está rodando na porta 5000.
                  </div>
                )}
                {isOnline && geminiConnected === false && (
                  <div>
                    <strong>Gemini AI Indisponível:</strong> Funcionalidade de extração pode estar limitada.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatusCard;
