import React, { useState, useEffect } from 'react';
import { 
  Tags, TrendingUp, TrendingDown, Plus, Edit2, Trash2, 
  Search, CheckCircle, XCircle, Loader2 
} from 'lucide-react';
import { apiService } from '../services/apiService';
import toast from 'react-hot-toast';

const ClassificacoesPage = () => {
  const [activeTab, setActiveTab] = useState('DESPESA'); // DESPESA, RECEITA
  const [classificacoes, setClassificacoes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [formData, setFormData] = useState({
    descricao: '',
    tipo: 'DESPESA'
  });

  const carregarDados = React.useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiService.getClassificacoes({
        tipo: activeTab,
        search: searchTerm
      });
      if (result.success) {
        setClassificacoes(result.data || []);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Erro ao carregar classificações');
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchTerm]);

  // Debounce para busca automática
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      carregarDados();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [carregarDados]);

  const handleSearch = (e) => {
    e.preventDefault();
    carregarDados();
  };

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        descricao: item.descricao,
        tipo: item.tipo
      });
    } else {
      setEditingItem(null);
      setFormData({
        descricao: '',
        tipo: activeTab
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let result;
      if (editingItem) {
        result = await apiService.updateClassificacao(editingItem.id, formData);
      } else {
        result = await apiService.createClassificacao(formData);
      }

      if (result.success) {
        toast.success(editingItem ? 'Atualizado com sucesso!' : 'Criado com sucesso!');
        setIsModalOpen(false);
        carregarDados();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Erro ao salvar');
    }
  };

  const handleToggleStatus = async (item) => {
    if (!window.confirm(`Deseja ${item.status === 'ATIVO' ? 'inativar' : 'reativar'} este item?`)) return;

    try {
      const result = item.status === 'ATIVO' 
        ? await apiService.inativarClassificacao(item.id)
        : await apiService.reativarClassificacao(item.id);

      if (result.success) {
        toast.success('Status atualizado!');
        carregarDados();
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
            <h1 className="text-3xl font-bold font-display text-support">Classificações</h1>
            <p className="text-support-600">Gerencie categorias de Receitas e Despesas</p>
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="btn-primary w-full md:w-auto flex items-center justify-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Classificação</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="w-full">
          <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-lg shadow-sm w-full">
            <button
              onClick={() => setActiveTab('DESPESA')}
              className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'DESPESA' 
                  ? 'bg-red-50 text-red-700 shadow-sm border border-red-100' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              <TrendingDown className="w-4 h-4" />
              <span>Despesas</span>
            </button>
            <button
              onClick={() => setActiveTab('RECEITA')}
              className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'RECEITA' 
                  ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Receitas</span>
            </button>
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
                  placeholder="Buscar classificação..."
                  className="input pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
                />
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
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
                  <th className="px-6 py-4 w-2/3">Descrição</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && classificacoes.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="px-6 py-8 text-center text-gray-500">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Carregando dados...
                    </td>
                  </tr>
                ) : classificacoes.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="px-6 py-8 text-center text-gray-500">
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                ) : (
                  classificacoes.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 flex items-center">
                        <Tags className="w-4 h-4 text-gray-400 mr-2" />
                        {item.descricao}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.status === 'ATIVO' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button 
                          onClick={() => handleOpenModal(item)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleToggleStatus(item)}
                          className={`${item.status === 'ATIVO' ? 'text-red-500 hover:text-red-700' : 'text-green-500 hover:text-green-700'} p-1`}
                          title={item.status === 'ATIVO' ? 'Inativar' : 'Reativar'}
                        >
                          {item.status === 'ATIVO' ? <Trash2 className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full md:max-w-md overflow-hidden animate-fade-in my-auto">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-lg text-gray-800">
                {editingItem ? 'Editar Classificação' : 'Nova Classificação'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
                <input
                  type="text"
                  required
                  className="input w-full"
                  value={formData.descricao}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
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

export default ClassificacoesPage;

