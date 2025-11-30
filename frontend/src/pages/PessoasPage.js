import React, { useState, useEffect } from 'react';
import { 
  Users, Building2, Truck, Plus, Edit2, Trash2, 
  Search, CheckCircle, XCircle, Loader2 
} from 'lucide-react';
import { apiService } from '../services/apiService';
import toast from 'react-hot-toast';

const PessoasPage = () => {
  const [activeTab, setActiveTab] = useState('FORNECEDOR'); // FORNECEDOR, CLIENTE, FATURADO
  const [pessoas, setPessoas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPessoa, setEditingPessoa] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    razaoSocial: '',
    fantasia: '',
    documento: '',
    tipo: 'FORNECEDOR'
  });

  const carregarPessoas = React.useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiService.getPessoas({
        tipo: activeTab,
        search: searchTerm
      });
      if (result.success) {
        setPessoas(result.data || []);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchTerm]);

  // Debounce para busca automática
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      carregarPessoas();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [carregarPessoas]);

  const handleSearch = (e) => {
    e.preventDefault();
    carregarPessoas();
  };

  const handleOpenModal = (pessoa = null) => {
    if (pessoa) {
      setEditingPessoa(pessoa);
      setFormData({
        razaoSocial: pessoa.razaoSocial,
        fantasia: pessoa.fantasia || '',
        documento: pessoa.documento,
        tipo: pessoa.tipo
      });
    } else {
      setEditingPessoa(null);
      setFormData({
        razaoSocial: '',
        fantasia: '',
        documento: '',
        tipo: activeTab
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let result;
      if (editingPessoa) {
        result = await apiService.updatePessoa(editingPessoa.id, formData);
      } else {
        result = await apiService.createPessoa(formData);
      }

      if (result.success) {
        toast.success(editingPessoa ? 'Registro atualizado!' : 'Registro criado!');
        setIsModalOpen(false);
        carregarPessoas();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Erro ao salvar');
    }
  };

  const handleToggleStatus = async (pessoa) => {
    if (!window.confirm(`Deseja ${pessoa.status === 'ATIVO' ? 'inativar' : 'reativar'} este registro?`)) return;

    try {
      const result = pessoa.status === 'ATIVO' 
        ? await apiService.inativarPessoa(pessoa.id)
        : await apiService.reativarPessoa(pessoa.id);

      if (result.success) {
        toast.success('Status atualizado!');
        carregarPessoas();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  return (
    <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col space-y-6">
        
        {/* Cabeçalho */}
        <div className="flex flex-col space-y-4 md:flex-row md:justify-between md:items-center md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold font-display text-support">Manter Pessoas</h1>
            <p className="text-support-600">Gerencie fornecedores, clientes e faturados</p>
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="btn-primary w-full md:w-auto flex items-center justify-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Registro</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="w-full">
          <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-lg shadow-sm w-full">
            {[
              { id: 'FORNECEDOR', label: 'Fornecedores', icon: Truck },
              { id: 'CLIENTE', label: 'Clientes', icon: Users },
              { id: 'FATURADO', label: 'Faturados', icon: Building2 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-primary-100 text-primary-700' 
                    : 'text-support-600 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-12 relative">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1 mb-1 block">
                Buscar
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar por nome ou documento..."
                  className="input pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
                />
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                {searchTerm && (
                  <button 
                    onClick={() => {
                      setSearchTerm('');
                      // Disparar busca limpa após renderização
                      setTimeout(() => {
                        // A busca acontece no useEffect quando searchTerm mudar,
                        // mas aqui queremos garantir que o estado limpo dispare o efeito.
                        // Se searchTerm for state, o efeito já roda.
                      }, 0);
                    }}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabela */}
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Razão Social / Nome</th>
                  <th className="px-6 py-4">Nome Fantasia</th>
                  <th className="px-6 py-4">Documento (CPF/CNPJ)</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && pessoas.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Carregando dados...
                    </td>
                  </tr>
                ) : pessoas.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                ) : (
                  pessoas.map((pessoa) => (
                    <tr key={pessoa.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{pessoa.razaoSocial}</td>
                      <td className="px-6 py-4 text-gray-600">{pessoa.fantasia || '-'}</td>
                      <td className="px-6 py-4 text-gray-600 font-mono">{pessoa.documento}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          pessoa.status === 'ATIVO' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {pessoa.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button 
                          onClick={() => handleOpenModal(pessoa)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleToggleStatus(pessoa)}
                          className={`${pessoa.status === 'ATIVO' ? 'text-red-500 hover:text-red-700' : 'text-green-500 hover:text-green-700'} p-1`}
                          title={pessoa.status === 'ATIVO' ? 'Inativar' : 'Reativar'}
                        >
                          {pessoa.status === 'ATIVO' ? <Trash2 className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de Cadastro/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full md:max-w-md overflow-hidden animate-fade-in my-auto">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-lg text-gray-800">
                {editingPessoa ? 'Editar Registro' : 'Novo Registro'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Razão Social / Nome *</label>
                <input
                  type="text"
                  required
                  className="input w-full"
                  value={formData.razaoSocial}
                  onChange={(e) => setFormData({...formData, razaoSocial: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Fantasia</label>
                <input
                  type="text"
                  className="input w-full"
                  value={formData.fantasia}
                  onChange={(e) => setFormData({...formData, fantasia: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Documento (CPF/CNPJ) *</label>
                <input
                  type="text"
                  required
                  className="input w-full"
                  value={formData.documento}
                  onChange={(e) => setFormData({...formData, documento: e.target.value})}
                />
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

export default PessoasPage;

