/**
 * Componente UploadArea - AgroMark ESW424
 * Área de upload de arquivos PDF com drag & drop
 */

import React, { useCallback, useState, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const UploadArea = ({ onFileUpload, isUploading, error, disabled }) => {
  const [dragActive, setDragActive] = useState(false);
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
      console.log('Arquivo selecionado:', file.name, file.size);
      
      toast.success(`Arquivo selecionado: ${file.name}`);
      onFileUpload(file);
    }
  }, [onFileUpload]);

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
    if (isDragReject) return 'upload-area border-expense bg-expense-50';
    if (isDragAccept || dragActive) return 'upload-area-active';
    return 'upload-area';
  };

  const getIconComponent = () => {
    if (isUploading) return Loader2;
    if (error) return AlertCircle;
    if (isDragAccept) return CheckCircle;
    return Upload;
  };

  const getIconColor = () => {
    if (isUploading) return 'text-primary-600';
    if (error) return 'text-expense';
    if (isDragAccept) return 'text-primary-600';
    if (isDragReject) return 'text-expense';
    return 'text-support-400';
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
        <h2 className="text-2xl font-bold font-display text-support mb-2">
          Upload de Nota Fiscal
        </h2>
        <p className="text-support-600 font-body">
          Envie um arquivo PDF de Nota Fiscal para extração automática dos dados
        </p>
      </div>

      <div
        {...getRootProps()}
        className={getUploadAreaStyle()}
      >
        <input {...getInputProps()} ref={fileInputRef} />
        
        <div className="flex flex-col items-center space-y-4">
          
          {/* Ícone */}
          <div className={`p-4 rounded-full ${
            isUploading ? 'bg-primary-100' : 
            error ? 'bg-expense-100' : 
            isDragAccept ? 'bg-primary-100' : 
            'bg-secondary-200'
          }`}>
            <IconComponent 
              className={`w-8 h-8 ${getIconColor()} ${isUploading ? 'animate-spin' : ''}`} 
            />
          </div>

          {/* Texto Principal */}
          <div className="text-center">
            <div className={`text-lg font-medium font-display ${
              error ? 'text-expense-700' : 
              isUploading ? 'text-primary-600-700' : 
              'text-support-700'
            }`}>
              {getMainText()}
            </div>
            <div className={`text-sm mt-1 font-body ${
              error ? 'text-expense-600' : 
              isUploading ? 'text-primary-600-600' : 
              'text-support-500'
            }`}>
              {getSubText()}
            </div>
          </div>

          {/* Botão de Ação (quando não está fazendo upload) */}
          {!isUploading && !disabled && (
            <button
              type="button"
              className="btn-primary flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation(); // Prevenir que o dropzone seja ativado
                if (fileInputRef.current) {
                  fileInputRef.current.click();
                }
              }}
            >
              <FileText className="w-4 h-4 mr-2" />
              Selecionar PDF
            </button>
          )}

          {/* Indicador de Progresso */}
          {isUploading && (
            <div className="w-full max-w-xs">
              <div className="bg-primary-200 rounded-full h-2">
                <div className="bg-primary h-2 rounded-full animate-pulse-slow" style={{ width: '70%' }}></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Informações Adicionais */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm font-body">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-primary rounded-full"></div>
          <span className="text-support-600">Suporte a PDF</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-accent rounded-full"></div>
          <span className="text-support-600">Máximo 10MB</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-income rounded-full"></div>
          <span className="text-support-600">IA Gemini</span>
        </div>
      </div>

      {/* Dicas */}
      <div className="mt-6 p-4 bg-primary-50 border border-primary-200 rounded-lg">
        <h4 className="font-medium font-display text-primary-600-900 mb-2 flex items-center">
          <CheckCircle className="w-4 h-4 text-primary-600-700 mr-2" />
          Dicas para melhor resultado:
        </h4>
        <ul className="text-sm text-primary-600-800 font-body space-y-1">
          <li>• Use PDFs com texto selecionável (não escaneados como imagem)</li>
          <li>• Certifique-se de que a Nota Fiscal está completa e legível</li>
          <li>• Arquivos menores processam mais rapidamente</li>
        </ul>
      </div>
    </div>
  );
};

export default UploadArea;
