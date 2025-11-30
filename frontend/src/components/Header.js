/**
 * Componente Header - AgroMark ESW424
 * Cabeçalho da aplicação com branding e navegação
 */

import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Github, ExternalLink, Home, FileText, Bot, X, Users, Tags } from 'lucide-react';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { to: "/", label: "Início", icon: Home, end: true },
    { to: "/movimentos", label: "Movimentos", icon: FileText },
    { to: "/pessoas", label: "Pessoas", icon: Users },
    { to: "/classificacoes", label: "Classificações", icon: Tags },
    { to: "/agent", label: "Agente IA", icon: Bot },
  ];

  return (
    <header className="bg-white shadow-sm border-b border-secondary-200 relative">
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
            {/* Menu de Navegação Desktop */}
            <nav className="hidden md:flex items-center space-x-1 mr-2">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `flex items-center space-x-2 px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-primary-600'
                        : 'text-support-600 hover:text-primary-600'
                    }`
                  }
                  title={link.label}
                >
                  <link.icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </NavLink>
              ))}
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
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)} 
              className="p-2 text-support-400 hover:text-primary-600"
              aria-label="Abrir menu"
            >
              {isMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Navegação Mobile */}
      {isMenuOpen && (
        <nav className="md:hidden bg-white border-t border-secondary-200 animate-fade-in">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                onClick={() => setIsMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center space-x-2 px-3 py-2 text-base font-medium transition-colors rounded-md ${
                    isActive
                      ? 'text-white bg-primary-600'
                      : 'text-support-600 hover:text-primary-600 hover:bg-secondary-100'
                  }`
                }
              >
                <link.icon className="w-5 h-5" />
                <span>{link.label}</span>
              </NavLink>
            ))}
          </div>
          <div className="pt-4 pb-3 border-t border-secondary-200">
            <div className="flex items-center justify-center space-x-4">
              <a
                href="https://github.com/marquesvinicius/agromark"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-support-400 hover:text-primary-600 transition-colors"
                title="Ver no GitHub"
              >
                <Github className="w-6 h-6" />
              </a>
              <a
                href="https://github.com/marquesvinicius/agromark/blob/master/frontend/public/API_DOCUMENTATION.md"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-support-400 hover:text-primary-600 transition-colors"
                title="Documentação da API"
              >
                <ExternalLink className="w-6 h-6" />
              </a>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
};

export default Header;
