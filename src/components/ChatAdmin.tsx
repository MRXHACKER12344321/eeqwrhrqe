import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { Send, X, MessageCircle, Loader } from 'lucide-react';

interface ChatMessage {
  id: string;
  loja_id: string;
  remetente: string;
  nome_remetente: string;
  mensagem: string;
  tipo: 'admin' | 'staff' | 'sistema';
  criado_em: string;
}

interface ChatAdminProps {
  lojaId?: string | null;
  nomeAdmin: string;
  corPrimaria?: string;
}

export default function ChatAdmin({ lojaId, nomeAdmin, corPrimaria = '#FF3D00' }: ChatAdminProps) {
  const [mensagens, setMensagens] = useState<ChatMessage[]>([]);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [mostrarChat, setMostrarChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Carregar mensagens
  useEffect(() => {
    if (!lojaId) {
      setMensagens([]);
      setLoading(false);
      return;
    }

    carregarMensagens();
    const interval = setInterval(carregarMensagens, 3000);
    return () => clearInterval(interval);
  }, [lojaId]);

  const carregarMensagens = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_admin')
        .select('*')
        .eq('loja_id', lojaId)
        .order('criado_em', { ascending: true })
        .limit(100);

      if (error) throw error;
      setMensagens(data || []);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    scrollParaFinal();
  }, [mensagens]);

  const scrollParaFinal = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const enviarMensagem = async () => {
    if (!novaMensagem.trim() || !lojaId) return;

    setEnviando(true);
    try {
      const { data, error } = await supabase
        .from('chat_admin')
        .insert([
          {
            loja_id: lojaId,
            remetente: 'admin',
            nome_remetente: nomeAdmin,
            mensagem: novaMensagem,
            tipo: 'admin',
            criado_em: new Date().toISOString()
          }
        ])
        .select();

      if (error) throw error;

      setNovaMensagem('');
      carregarMensagens();
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setEnviando(false);
    }
  };

  const formatarHora = (data: string) => {
    return new Date(data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatarData = (data: string) => {
    const hoje = new Date();
    const dataMensagem = new Date(data);
    
    if (dataMensagem.toDateString() === hoje.toDateString()) {
      return 'Hoje';
    } else if (dataMensagem.toDateString() === new Date(hoje.getTime() - 86400000).toDateString()) {
      return 'Ontem';
    } else {
      return dataMensagem.toLocaleDateString('pt-BR');
    }
  };

  // Agrupar mensagens por data
  const agruparPorData = () => {
    const grupos: { [key: string]: ChatMessage[] } = {};
    
    mensagens.forEach((msg) => {
      const data = formatarData(msg.criado_em);
      if (!grupos[data]) grupos[data] = [];
      grupos[data].push(msg);
    });

    return Object.entries(grupos);
  };

  return (
    <>
      {/* Botão Flutuante */}
      {!mostrarChat && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={() => setMostrarChat(true)}
          style={{ backgroundColor: corPrimaria }}
          className="fixed bottom-8 right-8 p-4 rounded-full shadow-2xl z-40 hover:scale-110 transition-transform"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <MessageCircle className="w-6 h-6 text-white" />
          </motion.div>
          {mensagens.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
              {mensagens.length > 99 ? '99+' : mensagens.length}
            </span>
          )}
        </motion.button>
      )}

      {/* Chat Modal */}
      <AnimatePresence>
        {mostrarChat && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed bottom-0 right-0 top-0 z-50 w-full md:w-96 md:bottom-8 md:right-8 md:rounded-3xl overflow-hidden"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMostrarChat(false)}
              className="absolute inset-0 bg-black/30 md:hidden"
            />

            {/* Chat Container */}
            <div className="relative h-full md:h-96 bg-slate-900 border border-slate-800 flex flex-col shadow-2xl">
              {/* Header */}
              <div
                className="px-4 py-3 flex items-center justify-between text-white"
                style={{ backgroundColor: corPrimaria }}
              >
                <div>
                  <h3 className="font-bold text-sm">💬 Chat Admin</h3>
                  <p className="text-xs opacity-75">{mensagens.length} mensagens</p>
                </div>
                <button
                  onClick={() => setMostrarChat(false)}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mensagens */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gradient-to-b from-slate-900 to-slate-950">
                {loading ? (
                  <div className="flex items-center justify-center h-full text-slate-400">
                    <Loader className="w-5 h-5 animate-spin" />
                  </div>
                ) : mensagens.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-400 text-sm text-center px-4">
                    Nenhuma mensagem ainda. Comece uma conversa! 🚀
                  </div>
                ) : (
                  <div className="space-y-3">
                    {agruparPorData().map(([data, msgs]) => (
                      <div key={data}>
                        <div className="flex items-center gap-2 my-2">
                          <div className="flex-1 h-px bg-slate-800" />
                          <span className="text-xs text-slate-500 px-2">{data}</span>
                          <div className="flex-1 h-px bg-slate-800" />
                        </div>
                        {msgs.map((msg) => (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${msg.remetente === 'admin' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-xs rounded-2xl px-3 py-2 text-sm ${
                                msg.remetente === 'admin'
                                  ? 'bg-sky-600 text-white rounded-br-none'
                                  : msg.tipo === 'sistema'
                                  ? 'bg-slate-800 text-slate-300 rounded-lg'
                                  : 'bg-slate-800 text-slate-300 rounded-bl-none'
                              }`}
                            >
                              {msg.remetente !== 'admin' && msg.tipo !== 'sistema' && (
                                <p className="text-xs font-bold mb-0.5" style={{ color: corPrimaria }}>
                                  {msg.nome_remetente}
                                </p>
                              )}
                              <p className="break-words">{msg.mensagem}</p>
                              <p className="text-xs opacity-70 mt-1">{formatarHora(msg.criado_em)}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-slate-800 p-3 bg-slate-900">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Digite uma mensagem..."
                    value={novaMensagem}
                    onChange={(e) => setNovaMensagem(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        enviarMensagem();
                      }
                    }}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                  <button
                    onClick={enviarMensagem}
                    disabled={!novaMensagem.trim() || enviando}
                    className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 p-2 rounded-lg transition-colors text-white"
                  >
                    {enviando ? <Loader className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
