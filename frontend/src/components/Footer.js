/**
 * Componente Footer - AgroMark
 * Rodapé da aplicação com informações corporativas
 */

import React from 'react';
import { MapPin, Phone, Mail, Shield, Zap, Users } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-secondary-200 mt-auto">
      <div className="container mx-auto px-4 py-8">
        
        {/* Conteúdo Principal */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          {/* Sobre a AgroMark */}
          <div className="md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <img 
                src="/logo-final.png" 
                alt="AgroMark Logo" 
                className="w-8 h-8 object-contain"
              />
              <div>
                <h3 className="font-bold font-display text-support">
                  <span style={{color: '#277D47'}}>Agro</span>
                  <span style={{color: '#333333'}}>Mark</span>
                </h3>
                <p className="text-xs text-support-600 font-body">
                  Gestão com raízes fortes
                </p>
              </div>
            </div>
            <p className="text-sm text-support-600 font-body mb-4 max-w-md">
              Plataforma completa de gestão administrativo-financeira para o agronegócio, 
              com processamento inteligente de documentos e análise de dados avançada.
            </p>
            <div className="text-xs text-support-500 font-body">
              Versão 1.1.0 - Processador de Documentos
            </div>
          </div>

          {/* Recursos */}
          <div>
            <h4 className="font-semibold font-display text-support mb-3">Recursos</h4>
            <div className="space-y-2 text-sm text-support-600 font-body">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-primary-600" />
                <span>Processamento IA</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-primary-600" />
                <span>Dados Seguros</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-primary-600" />
                <span>Multi-usuário</span>
              </div>
            </div>
          </div>

          {/* Contato */}
          <div>
            <h4 className="font-semibold font-display text-support mb-3">Contato</h4>
            <div className="space-y-2 text-sm text-support-600 font-body">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-primary-600" />
                <span>Goiás, Brasil</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-primary-600" />
                <span>+55 (62) 9999-9999</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-primary-600" />
                <span>contato@agromark.com</span>
              </div>
            </div>
          </div>
        </div>

        {/* Linha Divisória */}
        <div className="border-t border-secondary-200 mt-6 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0">
            
            {/* Copyright */}
            <div className="text-sm text-support-500 font-body">
              © {currentYear} AgroMark. Todos os direitos reservados.
            </div>

            {/* Links Legais */}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
