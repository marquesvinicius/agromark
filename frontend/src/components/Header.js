/**
 * Componente Header - AgroMark ESW424
 * Cabeçalho da aplicação com branding e navegação
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Github, ExternalLink, Home, FileText } from 'lucide-react';

const Header = () => {
  return (
    <header className="bg-white shadow-sm border-b border-secondary-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          
          {/* Logo e Título */}
          <div className="flex items-center space-x-3 md:space-x-4">
            <div className="flex items-center">
              <img 
                src="/logo-final.png" 
                alt="AgroMark Logo" 
                className="w-10 h-10 md:w-12 md:h-12 object-contain"
              />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl md:text-2xl font-bold font-display">
                <span style={{color: '#277D47'}}>Agro</span>
                <span style={{color: '#333333'}}>Mark</span>
              </h1>
              <p className="text-xs md:text-sm text-support-600 font-body">
                Gestão com raízes fortes
              </p>
            </div>
            {/* Título simplificado para mobile */}
            <div className="sm:hidden">
              <h1 className="text-lg font-bold font-display">
                <span style={{color: '#277D47'}}>Agro</span>
                <span style={{color: '#333333'}}>Mark</span>
              </h1>
            </div>
          </div>

          {/* Navegação e Links */}
          <div className="flex items-center space-x-1">
            {/* Menu de Navegação */}
            <nav className="hidden md:flex items-center space-x-1 mr-2">
              <Link
                to="/"
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-support-600 hover:text-primary-600 hover:bg-secondary-50 rounded-md transition-colors"
                title="Página Inicial"
              >
                <Home className="w-4 h-4" />
                <span>Início</span>
              </Link>
              <Link
                to="/lancamentos"
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-support-600 hover:text-primary-600 hover:bg-secondary-50 rounded-md transition-colors"
                title="Ver Lançamentos"
              >
                <FileText className="w-4 h-4" />
                <span>Lançamentos</span>
              </Link>
            </nav>

            {/* Links Externos */}
            <div className="hidden md:flex items-center space-x-1 border-l border-secondary-200 pl-2">
              <a
                href="https://github.com/marquesvinicius/agromark"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-support-400 hover:text-primary-600 transition-colors"
                title="Ver no GitHub"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="https://github.com/marquesvinicius/agromark/blob/master/frontend/public/API_DOCUMENTATION.md"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-support-400 hover:text-primary-600 transition-colors"
                title="Documentação da API"
              >
                <ExternalLink className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Menu Mobile */}
          <div className="md:hidden">
            <button className="p-2 text-support-400 hover:text-primary-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
