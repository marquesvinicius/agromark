import React, { useState, useEffect, useRef } from 'react';
import { Sprout } from 'lucide-react'; // Importar o ícone Sprout
import Footer from '../components/Footer';
import { api } from '../services/apiService'; // Importar a instância 'api' diretamente
import MarkAvatar from '../components/MarkAvatar'; // Importar o novo componente

// Função para formatar o texto, convertendo **bold** em <strong>bold</strong>
const formatMessage = (text) => {
    const boldRegex = /\*\*(.*?)\*\*/g;
    return text.replace(boldRegex, '<strong>$1</strong>');
};

const AgentPage = () => {
    const [query, setQuery] = useState('');
    const [conversation, setConversation] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const chatContainerRef = useRef(null);
    const isInitialMount = useRef(true); // Ref para rastrear a montagem inicial

    useEffect(() => {
        // Ignora o efeito na montagem inicial do componente
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        const chatContainer = chatContainerRef.current;
        if (chatContainer) {
            // Scroll suave para o fundo do contêiner do chat
            chatContainer.scrollTo({
                top: chatContainer.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [conversation, isLoading]); // Reruns when conversation or loading state changes

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        setIsLoading(true);
        setError(null);

        const userMessage = { sender: 'user', text: query };
        // Criamos uma nova variável de histórico para enviar o estado *antes* da nova mensagem do usuário ser adicionada
        const currentConversation = [...conversation, userMessage];
        setConversation(currentConversation);

        try {
            // Usar a instância 'api' importada, que já tem baseURL e interceptors
            const response = await api.post('/agent/query', { 
                query,
                history: currentConversation.slice(0, -1) // Enviar o histórico SEM a pergunta atual
            });
            const agentMessage = { sender: 'agent', text: response.data.answer };
            setConversation(prev => [...prev, agentMessage]);
        } catch (err) {
            const errorMessage = err.response?.data?.error || 'Não foi possível obter uma resposta. Tente novamente.';
            setError(errorMessage);
            const agentMessage = { sender: 'agent', text: errorMessage, isError: true };
            setConversation(prev => [...prev, agentMessage]);
        } finally {
            setIsLoading(false);
            setQuery('');
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-gray-50">
            {/* O Header foi removido daqui para corrigir a duplicata */}
            <main className="flex-grow container mx-auto px-4 py-6 sm:py-8">
                <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md">
                    {/* MarkAvatar agora não precisa de posicionamento absoluto, pois o flexbox cuidará disso */}
                    <div className="p-4 sm:p-6 border-b flex flex-col sm:flex-row justify-between sm:items-start">
                        <div className="flex-grow">
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Converse com o Mark</h1>
                            <p className="text-green-700 text-sm mt-2 flex items-center">
                                Mark cultiva respostas a partir dos seus dados <Sprout className="w-4 h-4 ml-1.5" />
                            </p>
                            <p className="text-gray-600 mt-4 max-w-md">
                                Faça uma pergunta em linguagem natural e receba análises precisas sobre seus dados financeiros.
                            </p>
                        </div>
                        <div className="flex-shrink-0 mt-4 sm:mt-0 sm:ml-4">
                            <MarkAvatar />
                        </div>
                    </div>

                    <div ref={chatContainerRef} className="p-4 sm:p-6 h-96 overflow-y-auto bg-gray-100">
                        {conversation.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500 text-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                <p className="mt-4">Nenhuma pergunta feita ainda.</p>
                                <p className="text-sm">Ex: "Qual o fornecedor com mais notas fiscais?"</p>
                            </div>
                        )}
                        <div className="space-y-4">
                            {conversation.map((msg, index) => (
                                <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div
                                        className={`max-w-lg px-4 py-2 rounded-xl ${
                                            msg.sender === 'user' 
                                                ? 'bg-blue-500 text-white' 
                                                : msg.isError ? 'bg-red-100 text-red-800' : 'bg-gray-200 text-gray-800'
                                        }`}
                                    >
                                        <p 
                                          style={{ whiteSpace: 'pre-wrap' }}
                                          dangerouslySetInnerHTML={{ __html: formatMessage(msg.text) }}
                                        />
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="max-w-lg px-4 py-3 rounded-xl bg-gray-200 text-gray-500">
                                        <div className="flex items-center space-x-1">
                                            <span className="h-2 w-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
                                            <span className="h-2 w-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></span>
                                            <span className="h-2 w-2 bg-gray-400 rounded-full animate-pulse"></span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {/* O ref no div vazio foi removido */}
                        </div>
                    </div>

                    <div className="p-4 sm:p-6 border-t bg-white">
                        <form onSubmit={handleSubmit} className="flex items-center space-x-2 sm:space-x-4">
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Digite sua pergunta..."
                                className="flex-grow px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={isLoading}
                            />
                            <button
                                type="submit"
                                className="px-4 sm:px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
                                disabled={isLoading}
                            >
                                {isLoading ? '...' : 'Enviar'}
                            </button>
                        </form>
                        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AgentPage;
