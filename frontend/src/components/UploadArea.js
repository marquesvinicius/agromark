/**
 * Componente UploadArea - AgroMark ESW424
 * Área de upload de arquivos PDF com drag & drop e seleção de Tipo de Movimento
 */

import React, { useCallback, useState, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle, Loader2, CheckCircle, TrendingDown, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

const UploadArea = ({ onFileUpload, isUploading, error, disabled }) => {
  const [dragActive, setDragActive] = useState(false);
  const [tipoMovimento, setTipoMovimento] = useState('DESPESA'); // DESPESA ou RECEITA
  const fileInputRef = useRef(null);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setDragActive(false);

    // Tratar arquivos rejeitados
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      const errors = rejection.errors.map(error => {
        switch (error.code) {
          case 'file-too-large':
            return 'Arquivo muito grande (máximo 10MB)';
          case 'file-invalid-type':
            return 'Tipo de arquivo inválido (apenas PDF)';
          case 'too-many-files':
            return 'Envie apenas um arquivo por vez';
          default:
            return error.message;
        }
      });
      
      toast.error(`Erro no arquivo: ${errors.join(', ')}`);
      return;
    }

    // Processar arquivo aceito
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      console.log('Arquivo selecionado:', file.name, file.size, 'Tipo:', tipoMovimento);
      
      toast.success(`Arquivo selecionado: ${file.name}`);
      // Passa o tipo junto com o arquivo
      onFileUpload(file, tipoMovimento);
    }
  }, [onFileUpload, tipoMovimento]);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject
  } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: disabled || isUploading,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false)
  });

  // Determinar estilo da área de upload
  const getUploadAreaStyle = () => {
    if (disabled) return 'upload-area opacity-50 cursor-not-allowed';
    if (isUploading) return 'upload-area border-primary bg-primary-50';
    if (isDragReject) return 'upload-area border-red-500 bg-red-50';
    
    // Estilo dinâmico baseado no tipo selecionado
    if (isDragAccept || dragActive) {
      return tipoMovimento === 'DESPESA' 
        ? 'upload-area border-red-500 bg-red-50 shadow-md' 
        : 'upload-area border-blue-500 bg-blue-50 shadow-md';
    }
    
    return `upload-area ${tipoMovimento === 'DESPESA' ? 'hover:border-red-300 hover:bg-red-50' : 'hover:border-blue-300 hover:bg-blue-50'}`;
  };

  const getIconComponent = () => {
    if (isUploading) return Loader2;
    if (error) return AlertCircle;
    if (isDragAccept) return CheckCircle;
    return Upload;
  };

  const getIconColor = () => {
    if (isUploading) return 'text-primary-600';
    if (error) return 'text-red-500';
    if (isDragAccept) return 'text-primary-600';
    if (isDragReject) return 'text-red-500';
    
    return tipoMovimento === 'DESPESA' ? 'text-red-500' : 'text-blue-500';
  };

  const getMainText = () => {
    if (disabled) return 'Sistema offline - Upload indisponível';
    if (isUploading) return 'Processando arquivo...';
    if (error) return 'Erro no processamento';
    if (isDragActive) return 'Solte o arquivo aqui';
    return 'Arraste um PDF aqui ou clique para selecionar';
  };

  const getSubText = () => {
    if (disabled) return 'Aguarde a conexão com o servidor ser restabelecida';
    if (isUploading) return 'Extraindo dados via Inteligência Artificial...';
    if (error) return error;
    return 'Arquivos PDF até 10MB • Processamento automático com IA';
  };

  const IconComponent = getIconComponent();

  return (
    <div className="card">
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold font-display text-support">
              Upload de Nota Fiscal
            </h2>
            <p className="text-support-600 font-body">
              Envie um arquivo PDF para processamento automático
            </p>
          </div>

          {/* Seletor de Tipo de Movimento */}
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setTipoMovimento('DESPESA')}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${
                tipoMovimento === 'DESPESA'
                  ? 'bg-white text-red-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <TrendingDown className="w-4 h-4 mr-2" />
              Despesa
            </button>
            <button
              onClick={() => setTipoMovimento('RECEITA')}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${
                tipoMovimento === 'RECEITA'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Receita
            </button>
          </div>
        </div>
      </div>

      <div
        {...getRootProps()}
        className={getUploadAreaStyle()}
      >
        <input {...getInputProps()} ref={fileInputRef} />
        
        <div className="flex flex-col items-center space-y-4">
          
          {/* Ícone */}
          <div className={`p-4 rounded-full transition-colors ${
            isUploading ? 'bg-primary-100' : 
            error ? 'bg-red-100' : 
            isDragAccept ? 'bg-primary-100' : 
            tipoMovimento === 'DESPESA' ? 'bg-red-100' : 'bg-blue-100'
          }`}>
            <IconComponent 
              className={`w-8 h-8 ${getIconColor()} ${isUploading ? 'animate-spin' : ''}`} 
            />
          </div>

          {/* Texto Principal */}
          <div className="text-center">
            <div className={`text-lg font-medium font-display ${
              error ? 'text-red-700' : 
              isUploading ? 'text-primary-700' : 
              'text-support-700'
            }`}>
              {getMainText()}
            </div>
            <div className={`text-sm mt-1 font-body ${
              error ? 'text-red-600' : 
              isUploading ? 'text-primary-600' : 
              'text-support-500'
            }`}>
              {getSubText()}
            </div>
          </div>

          {/* Botão de Ação (quando não está fazendo upload) */}
          {!isUploading && !disabled && (
            <button
              type="button"
              className={`flex items-center justify-center py-3 px-6 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                tipoMovimento === 'RECEITA' 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500' 
                  : 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500'
              }`}
              onClick={(e) => {
                e.stopPropagation(); // Prevenir que o dropzone seja ativado
                if (fileInputRef.current) {
                  fileInputRef.current.click();
                }
              }}
            >
              <FileText className="w-4 h-4 mr-2" />
              Selecionar PDF ({tipoMovimento === 'DESPESA' ? 'Despesa' : 'Receita'})
            </button>
          )}

          {/* Indicador de Progresso */}
          {isUploading && (
            <div className="w-full max-w-xs">
              <div className="bg-gray-200 rounded-full h-2">
                <div className="bg-primary-600 h-2 rounded-full animate-pulse" style={{ width: '70%' }}></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Informações Adicionais */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm font-body">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          <span className="text-support-600">Suporte a PDF</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
          <span className="text-support-600">Máximo 10MB</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          <span className="text-support-600">IA Gemini</span>
        </div>
      </div>

      {/* Dicas */}
      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h4 className="font-medium font-display text-gray-800 mb-2 flex items-center">
          <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
          Dicas para melhor resultado:
        </h4>
        <ul className="text-sm text-gray-600 font-body space-y-1">
          <li>• Use PDFs com texto selecionável (não escaneados como imagem)</li>
          <li>• Certifique-se de que a Nota Fiscal está completa e legível</li>
          <li>• Arquivos menores processam mais rapidamente</li>
        </ul>
      </div>
    </div>
  );
};

export default UploadArea;
