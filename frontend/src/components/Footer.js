/**
 * Componente Footer - AgroMark ESW424
 * Rodapé da aplicação
 */

import React from 'react';
import { Zap, Shield, Users, MapPin, Phone, Mail } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-white border-t border-secondary-200 mt-12">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Sobre o Projeto */}
          <div className="md:col-span-1">
            <div className="flex items-center mb-4">
              <img 
                src="/logo-final.png" 
                alt="AgroMark Logo" 
                className="w-8 h-8 mr-2 object-contain"
              />
              <h3 className="text-lg font-bold font-display text-primary-700">
                AgroMark
              </h3>
            </div>
            <p className="text-sm text-support-600 font-body leading-relaxed mb-2">
              Plataforma completa de gestão administrativo-financeira para o agronegócio, 
              com processamento inteligente de documentos e análise de dados avançada.
            </p>
            <p className="text-xs text-support-400">
              Versão 1.1.0 - Processador de Documentos
            </p>
          </div>

          {/* Container Grid para Recursos e Contato (Lado a lado no mobile) */}
          <div className="grid grid-cols-2 gap-4 md:col-span-2 md:grid-cols-2 md:gap-8">
            
            {/* Recursos */}
            <div>
              <h4 className="text-sm font-semibold font-display text-support-800 mb-3 uppercase tracking-wider">
                Recursos
              </h4>
              <ul className="space-y-2">
                <li className="flex items-center text-xs sm:text-sm text-support-600">
                  <Zap className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-primary-600 flex-shrink-0" />
                  Processamento IA
                </li>
                <li className="flex items-center text-xs sm:text-sm text-support-600">
                  <Shield className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-primary-600 flex-shrink-0" />
                  Dados Seguros
                </li>
                <li className="flex items-center text-xs sm:text-sm text-support-600">
                  <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-primary-600 flex-shrink-0" />
                  Multi-usuário
                </li>
              </ul>
            </div>

            {/* Contato */}
            <div>
              <h4 className="text-sm font-semibold font-display text-support-800 mb-3 uppercase tracking-wider">
                Contato
              </h4>
              <ul className="space-y-2">
                <li className="flex items-center text-xs sm:text-sm text-support-600">
                  <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-primary-600 flex-shrink-0" />
                  Goiás, Brasil
                </li>
                <li className="flex items-center text-xs sm:text-sm text-support-600">
                  <Phone className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-primary-600 flex-shrink-0" />
                  +55 (62) 9999-9999
                </li>
                <li className="flex items-center text-xs sm:text-sm text-support-600 break-all">
                  <Mail className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-primary-600 flex-shrink-0" />
                  contato@agromark.com
                </li>
              </ul>
            </div>

          </div>

        </div>

        {/* Copyright */}
        <div className="border-t border-secondary-200 mt-8 pt-6 text-center">
          <p className="text-sm text-support-500 font-body">
            © {new Date().getFullYear()} AgroMark. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
