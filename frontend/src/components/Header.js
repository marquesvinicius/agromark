/**
 * Componente Header - AgroMark ESW424
 * Cabeçalho da aplicação com branding e navegação
 */

import React from 'react';
import { Github, ExternalLink } from 'lucide-react';

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

          {/* Links */}
          <div className="hidden md:flex items-center space-x-2">
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
              href="/API_DOCUMENTATION.md"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-support-400 hover:text-primary-600 transition-colors"
              title="Documentação da API"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
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
