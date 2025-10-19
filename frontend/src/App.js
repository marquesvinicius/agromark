/**
 * Aplicação Principal - AgroMark ESW424
 * Interface React para processamento de Notas Fiscais
 * 
 * Autor: Marques Vinícius Melo Martins
 * Disciplina: ESW424 - Prática de Engenharia de Software
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Zap, FileText, CheckCircle, Database, Rocket } from 'lucide-react';
import Header from './components/Header';
import UploadArea from './components/UploadArea';
import ResultsDisplay from './components/ResultsDisplay';
import StatusCard from './components/StatusCard';
import Footer from './components/Footer';
import LancamentosPage from './pages/LancamentosPage';
import { apiService } from './services/apiService';

// Componente da Página Inicial (Upload)
const HomePage = ({ uploadState, handleFileUpload, handleReset, apiStatus, checkApiStatus }) => {
  return (
    <>
      {/* Status da API */}
      <StatusCard 
        isOnline={apiStatus.isOnline}
        geminiConnected={apiStatus.geminiConnected}
        loading={apiStatus.loading}
        onRefresh={checkApiStatus}
      />

      {/* Conteúdo Principal */}
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-8">
          
          {/* Seção de Introdução */}
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold font-display text-support sm:text-4xl">
              Processador de Notas Fiscais
            </h1>
            <p className="text-lg text-support-600 max-w-2xl mx-auto font-body">
              Faça upload de um PDF de Nota Fiscal e utilize inteligência artificial 
              para extrair automaticamente os dados financeiros e administrativos.
            </p>
            
            {/* Badges informativos */}
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              <span className="badge-info">
                <Zap className="w-4 h-4 mr-1" />
                Powered by Gemini AI
              </span>
              <span className="badge-info">
                <FileText className="w-4 h-4 mr-1" />
                Suporte a PDF
              </span>
              <span className="badge-info">
                <CheckCircle className="w-4 h-4 mr-1" />
                Processamento Instantâneo
              </span>
            </div>
          </div>

          {/* Área de Upload ou Resultados */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Coluna Principal - Upload/Resultados */}
            <div className="lg:col-span-8">
              {!uploadState.hasResults ? (
                <UploadArea
                  onFileUpload={handleFileUpload}
                  isUploading={uploadState.isUploading}
                  error={uploadState.error}
                  disabled={!apiStatus.isOnline}
                />
              ) : (
                <ResultsDisplay
                  results={uploadState.results}
                  onReset={handleReset}
                />
              )}
            </div>

            {/* Coluna Lateral - Informações */}
            <div className="lg:col-span-4">
              <div className="space-y-6">
                
                {/* Dados Extraídos */}
                <div className="card">
                  <h3 className="text-lg font-semibold font-display text-support mb-4 flex items-center">
                    <Database className="w-5 h-5 text-primary-600 mr-2" />
                    Fluxo Etapa 2
                  </h3>
                  <div className="space-y-2 text-sm text-support-600 font-body">
                    <p>1. Faça upload da NF e revise os dados extraídos</p>
                    <p>2. Clique em <strong>Verificar no Banco</strong> para confirmar cadastros</p>
                    <p>3. Use <strong>Criar/Atualizar e Lançar</strong> para gravar tudo com segurança</p>
                    <p>4. Veja o status de EXISTE/NÃO EXISTE diretamente nos cartões</p>
                  </div>
                </div>

                {/* Categorias de Despesa */}
                <div className="card">
                  <h3 className="text-lg font-semibold font-display text-support mb-4 flex items-center">
                    <CheckCircle className="w-5 h-5 text-primary-600 mr-2" />
                    Categorias Disponíveis
                  </h3>
                  <div className="space-y-1 text-sm font-body">
                    {[
                      'Manutenção e Operação',
                      'Infraestrutura e Utilidades',
                      'Insumos Agrícolas',
                      'Recursos Humanos',
                      'Serviços Operacionais',
                      'Outros'
                    ].map((categoria, index) => (
                      <div key={index} className="text-support-600">
                        • {categoria}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recursos da Plataforma */}
                <div className="card bg-primary-50 border-primary-200">
                  <h3 className="text-lg font-semibold font-display text-primary-600-900 mb-3 flex items-center">
                    <Rocket className="w-5 h-5 text-primary-600-700 mr-2" />
                    Lançamento Rápido
                  </h3>
                  <div className="space-y-2 text-sm text-primary-600-800 font-body">
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-primary-600-600 mt-1" />
                      <span>Criação automática de fornecedor, faturado e classificação caso não existam.</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-primary-600-600 mt-1" />
                      <span>Movimento de contas gerado com parcelas e vínculos corretos.</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-primary-600-600 mt-1" />
                      <span>Toast confirma o ID do movimento após o lançamento.</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <Footer />
    </>
  );
};

function App() {
  const [uploadState, setUploadState] = useState({
    isUploading: false,
    hasResults: false,
    results: null,
    error: null
  });
  
  const [apiStatus, setApiStatus] = useState({
    isOnline: false,
    geminiConnected: null, // null = não verificado, true = online, false = offline
    loading: true
  });

  // Verificar status da API ao carregar
  useEffect(() => {
    checkApiStatus();
  }, []);

  const checkApiStatus = async (forceRefresh = false) => {
    try {
      setApiStatus(prev => ({ ...prev, loading: true }));
      
      // Sempre verificar API primeiro (sem LLM)
      const apiStatus = await apiService.checkHealth();
      
      let geminiStatus = { success: false, data: { status: 'unknown' } };
      
      // Se for refresh manual, testar LLM também
      if (forceRefresh) {
        console.log('Testando LLM por solicitação do usuário...');
        geminiStatus = await apiService.checkLLMReadiness();
      }
      
      setApiStatus({
        isOnline: apiStatus.success,
        geminiConnected: forceRefresh ? (geminiStatus.success && geminiStatus.data?.status === 'ok') : null,
        loading: false
      });
      
      if (forceRefresh) {
        console.log('Status atualizado pelo usuário:', {
          api: apiStatus.success ? 'OK' : 'ERROR',
          llm: geminiStatus.data?.status || 'unknown'
        });
      }
    } catch (error) {
      console.error('Erro ao verificar status da API:', error);
      setApiStatus({
        isOnline: false,
        geminiConnected: null,
        loading: false
      });
    }
  };

  const handleFileUpload = async (file) => {
    try {
      setUploadState({
        isUploading: true,
        hasResults: false,
        results: null,
        error: null
      });

      const results = await apiService.uploadPDF(file);
      
      setUploadState({
        isUploading: false,
        hasResults: true,
        results: results.data,
        error: null
      });

    } catch (error) {
      console.error('Erro no upload:', error);
      setUploadState({
        isUploading: false,
        hasResults: false,
        results: null,
        error: error.message || 'Erro desconhecido no processamento'
      });
    }
  };

  const handleReset = () => {
    setUploadState({
      isUploading: false,
      hasResults: false,
      results: null,
      error: null
    });
  };

  return (
    <Router>
      <div className="min-h-screen bg-secondary flex flex-col font-body">
        {/* Toast Notifications */}
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#333333',
              color: '#fff',
              fontFamily: 'Montserrat, system-ui, sans-serif',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#277D47',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#E76F51',
                secondary: '#fff',
              },
            },
          }}
        />

        {/* Header */}
        <Header />

        {/* Rotas */}
        <Routes>
          {/* Rota da Página Inicial (Upload) */}
          <Route 
            path="/" 
            element={
              <HomePage 
                uploadState={uploadState}
                handleFileUpload={handleFileUpload}
                handleReset={handleReset}
                apiStatus={apiStatus}
                checkApiStatus={checkApiStatus}
              />
            } 
          />
          
          {/* Rota da Página de Lançamentos */}
          <Route path="/lancamentos" element={<LancamentosPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
