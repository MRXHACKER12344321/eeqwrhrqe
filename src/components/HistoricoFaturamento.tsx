import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar, DollarSign, ShoppingBag, TrendingUp, Download,
  ChevronLeft, ChevronRight, AlertCircle, Zap, X
} from 'lucide-react';
import {
  obterFaturamentoDia,
  obterHistoricoFaturamento,
  obterEstatisticasFaturamento,
  formatarDataPT,
  calcularTempoDesdeReset,
  exportarRelatorioCSV,
  normalizeDateValue,
  RelatorioFaturamento
} from '../lib/faturamentoUtils';

interface HistoricoFaturamentoProps {
  lojaId: string;
  lojaNome?: string;
  corPrimaria?: string;
}

export default function HistoricoFaturamento({
  lojaId,
  lojaNome = 'Minha Loja',
  corPrimaria = '#FF3D00'
}: HistoricoFaturamentoProps) {
  const [faturamentoHoje, setFaturamentoHoje] = useState({ faturamento_hoje: 0, pedidos_hoje: 0, data_ultimo_reset: '' });
  const [historico, setHistorico] = useState<RelatorioFaturamento[]>([]);
  const [estatisticas, setEstatisticas] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [diasSelecionados, setDiasSelecionados] = useState(7);
  const [expandirDetalhes, setExpandirDetalhes] = useState(false);
  const [exportandoCSV, setExportandoCSV] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [diaSelecionado, setDiaSelecionado] = useState<RelatorioFaturamento | null>(null);

  // Carregar dados
  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      try {
        const [faturamento, hist, stats] = await Promise.all([
          obterFaturamentoDia(lojaId),
          obterHistoricoFaturamento(lojaId, diasSelecionados),
          obterEstatisticasFaturamento(lojaId, diasSelecionados),
        ]);

        setFaturamentoHoje(faturamento);
        setHistorico(hist);
        setEstatisticas(stats);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
    // Atualizar a cada 2 minutos
    const interval = setInterval(carregarDados, 120000);
    return () => clearInterval(interval);
  }, [lojaId, diasSelecionados]);

  useEffect(() => {
    if (!historico || historico.length === 0) {
      setDiaSelecionado(null);
      return;
    }

    const normalizedSelectedDate = normalizeDateValue(selectedDate);
    const diaArquivo = normalizedSelectedDate
      ? historico.find((item) => normalizeDateValue(item.data_referencia) === normalizedSelectedDate)
      : null;

    setDiaSelecionado(diaArquivo || null);
  }, [historico, selectedDate]);

  const handleExportarCSV = async () => {
    setExportandoCSV(true);
    const result = await exportarRelatorioCSV(lojaId, diasSelecionados);
    setExportandoCSV(false);
    if (result) {
      console.log('CSV exportado com sucesso!');
    }
  };

  const calcularDiasDesde = (data: string) => {
    const hoje = new Date();
    const selecionada = new Date(data + 'T00:00:00');
    const diff = hoje.getTime() - selecionada.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const tempoDesdeReset = calcularTempoDesdeReset(faturamentoHoje.data_ultimo_reset);
  const totalAtualizado = faturamentoHoje.faturamento_hoje + (estatisticas?.total_periodo || 0);

  return (
    <div className="space-y-6">
      {/* CARD PRINCIPAL - FATURAMENTO DE HOJE */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl overflow-hidden border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-6 md:p-8"
        style={{
          borderColor: corPrimaria + '30',
          boxShadow: `0 0 40px ${corPrimaria}10`
        }}
      >
        {/* Background decorative element */}
        <div className="absolute top-0 right-0 w-48 h-48 opacity-5" style={{
          background: `radial-gradient(circle, ${corPrimaria}, transparent)`
        }}></div>

        <div className="relative z-10">
          {/* Header com status */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                Faturamento de Hoje
              </h2>
              <h3 className="text-3xl md:text-4xl font-black" style={{ color: corPrimaria }}>
                R$ {faturamentoHoje.faturamento_hoje.toFixed(2)}
              </h3>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                <Zap className="w-4 h-4" style={{ color: corPrimaria }} />
                <span>Atualizado {tempoDesdeReset.texto}</span>
              </div>
              <div className="text-2xl font-black text-emerald-400">
                {faturamentoHoje.pedidos_hoje} pedidos
              </div>
            </div>
          </div>

          {/* Linha do tempo */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-slate-950 rounded-xl p-3">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Ticket Médio</span>
              <span className="text-lg font-black text-sky-400 block mt-1">
                R$ {faturamentoHoje.pedidos_hoje > 0 
                  ? (faturamentoHoje.faturamento_hoje / faturamentoHoje.pedidos_hoje).toFixed(2) 
                  : '0.00'}
              </span>
            </div>
            <div className="bg-slate-950 rounded-xl p-3">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Tipo de Reset</span>
              <span className="text-lg font-black text-violet-400 block mt-1">00:00 Diário</span>
            </div>
            <div className="bg-slate-950 rounded-xl p-3 col-span-2 md:col-span-1">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Último Reset</span>
              <span className="text-xs font-mono text-slate-300 block mt-1">
                {new Date(faturamentoHoje.data_ultimo_reset).toLocaleTimeString('pt-BR')}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ESTATÍSTICAS DO PERÍODO */}
      {estatisticas && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total do período */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                <DollarSign className="w-12 h-12" />
              </div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">
                Total ({diasSelecionados} dias)
              </span>
              <span className="text-2xl font-black text-sky-400 mt-2 block">
                R$ {estatisticas.total_periodo.toFixed(2)}
              </span>
              <span className="text-[9px] text-slate-500 mt-1 block">
                Média: R$ {estatisticas.media_diaria.toFixed(2)}/dia
              </span>
            </div>

            {/* Maior venda */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10">
                <TrendingUp className="w-12 h-12" />
              </div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">
                Maior Dia
              </span>
              <span className="text-2xl font-black text-emerald-400 mt-2 block">
                R$ {estatisticas.maior_dia.toFixed(2)}
              </span>
              <span className="text-[9px] text-slate-500 mt-1 block">
                {estatisticas.dias_com_venda} dias com venda
              </span>
            </div>

            {/* Menor venda */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10">
                <AlertCircle className="w-12 h-12" />
              </div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">
                Menor Dia
              </span>
              <span className="text-2xl font-black text-orange-400 mt-2 block">
                R$ {estatisticas.menor_dia.toFixed(2)}
              </span>
              <span className="text-[9px] text-slate-500 mt-1 block">
                Ticket médio: R$ {estatisticas.ticket_medio.toFixed(2)}
              </span>
            </div>

            {/* Total de pedidos */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10">
                <ShoppingBag className="w-12 h-12" />
              </div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">
                Total de Pedidos
              </span>
              <span className="text-2xl font-black text-violet-400 mt-2 block">
                {estatisticas.total_pedidos}
              </span>
              <span className="text-[9px] text-slate-500 mt-1 block">
                Média: {(estatisticas.total_pedidos / diasSelecionados).toFixed(0)} pedidos/dia
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* FILTRO DE PERÍODO */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 md:flex-row md:items-center md:justify-between"
      >
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-slate-400">Período:</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {[7, 15, 30].map((dias) => (
            <button
              key={dias}
              onClick={() => setDiasSelecionados(dias)}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                diasSelecionados === dias
                  ? 'bg-sky-500 text-black'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {dias} dias
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-2xl px-3 py-2">
            <label htmlFor="date-selector" className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              Escolher dia
            </label>
            <input
              id="date-selector"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-950 text-slate-100 text-xs font-medium outline-none"
            />
          </div>

          <button
            onClick={handleExportarCSV}
            disabled={exportandoCSV}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-450 text-black px-4 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            {exportandoCSV ? 'Exportando...' : 'CSV'}
          </button>
        </div>
      </motion.div>

      {/* HISTÓRICO TABELA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden"
      >
        <div className="px-4 py-4 border-b border-slate-800 bg-slate-950 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Dia selecionado</p>
            <p className="text-sm font-semibold text-slate-100">{selectedDate}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Resultado</p>
            <p className="text-sm font-semibold text-slate-100">
              {diaSelecionado ? `R$ ${diaSelecionado.total_faturamento.toFixed(2)} em ${diaSelecionado.total_pedidos} pedidos` : 'Escolha um dia acima para ver os detalhes.'}
            </p>
          </div>
          {diaSelecionado && (
            <button
              onClick={() => setDiaSelecionado(null)}
              className="text-xs font-bold uppercase px-3 py-2 rounded-full bg-slate-700 text-slate-200 hover:bg-slate-600 transition-colors"
            >
              Limpar dia
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-800 bg-slate-950">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase">Data</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-slate-400 uppercase">Faturamento</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-slate-400 uppercase">Pedidos</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-slate-400 uppercase">Ticket Médio</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-slate-400 uppercase">Horário</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              <AnimatePresence>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400">
                      Carregando...
                    </td>
                  </tr>
                ) : historico.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400">
                      Nenhum dado de faturamento encontrado
                    </td>
                  </tr>
                ) : (
                  historico.map((item, idx) => (
                    <motion.tr
                      key={item.data_referencia}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => setDiaSelecionado(item)}
                      className="hover:bg-slate-850 transition-colors cursor-pointer hover:shadow-lg hover:shadow-sky-500/20"
                    >
                      <td className="px-4 py-3 text-slate-300 font-medium">
                        {formatarDataPT(item.data_referencia)}
                      </td>
                      <td className="text-right px-4 py-3 font-bold text-sky-400">
                        R$ {item.total_faturamento.toFixed(2)}
                      </td>
                      <td className="text-right px-4 py-3 font-bold text-emerald-400">
                        {item.total_pedidos}
                      </td>
                      <td className="text-right px-4 py-3 text-slate-400">
                        R$ {item.ticket_medio.toFixed(2)}
                      </td>
                      <td className="text-right px-4 py-3 text-xs text-slate-500">
                        {item.horario_inicio.split(' ')[1]} - {item.horario_fim.split(' ')[1]}
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* INFORMAÇÕES SOBRE RESET */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-blue-950/30 border border-blue-900/50 rounded-2xl p-4"
      >
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-200">
            <p className="font-bold mb-1">ℹ️ Sistema de Reset Diário</p>
            <p>
              Os valores de faturamento são automaticamente reiniciados a cada dia às 00:00 (meia-noite).
              O histórico de todos os dias é salvo na tabela de relatórios para consulta posterior.
            </p>
          </div>
        </div>
      </motion.div>

      {/* MODAL DE DETALHES DO DIA */}
      <AnimatePresence>
        {diaSelecionado && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDiaSelecionado(null)}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Detalhes do Dia</p>
                  <h2 className="text-3xl md:text-4xl font-black" style={{ color: corPrimaria }}>
                    {formatarDataPT(diaSelecionado.data_referencia)}
                  </h2>
                </div>
                <button
                  onClick={() => setDiaSelecionado(null)}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Grid de informações */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Faturamento */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-950 border border-sky-500/30 rounded-2xl p-4"
                >
                  <span className="text-xs font-bold text-sky-400 uppercase tracking-wider block mb-2">
                    Faturamento Total
                  </span>
                  <p className="text-3xl font-black text-sky-400">
                    R$ {diaSelecionado.total_faturamento.toFixed(2)}
                  </p>
                </motion.div>

                {/* Pedidos */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="bg-slate-950 border border-emerald-500/30 rounded-2xl p-4"
                >
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-2">
                    Total de Pedidos
                  </span>
                  <p className="text-3xl font-black text-emerald-400">
                    {diaSelecionado.total_pedidos}
                  </p>
                </motion.div>

                {/* Ticket Médio */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-slate-950 border border-violet-500/30 rounded-2xl p-4"
                >
                  <span className="text-xs font-bold text-violet-400 uppercase tracking-wider block mb-2">
                    Ticket Médio
                  </span>
                  <p className="text-3xl font-black text-violet-400">
                    R$ {diaSelecionado.ticket_medio.toFixed(2)}
                  </p>
                </motion.div>

                {/* Horário */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="bg-slate-950 border border-orange-500/30 rounded-2xl p-4"
                >
                  <span className="text-xs font-bold text-orange-400 uppercase tracking-wider block mb-2">
                    Período
                  </span>
                  <p className="text-sm font-mono text-orange-400">
                    {diaSelecionado.horario_inicio.split(' ')[1]} - {diaSelecionado.horario_fim.split(' ')[1]}
                  </p>
                </motion.div>
              </div>

              {/* Análise */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-2xl p-4"
              >
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Resumo</h3>
                <div className="space-y-2 text-sm text-slate-300">
                  <div className="flex justify-between">
                    <span>Faturamento por Pedido:</span>
                    <span className="font-bold text-sky-400">R$ {diaSelecionado.ticket_medio.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-800">
                    <span>Lucro Estimado:</span>
                    <span className="font-bold text-emerald-400">
                      R$ {(diaSelecionado.total_faturamento * 0.7).toFixed(2)}
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Botão fechar */}
              <button
                onClick={() => setDiaSelecionado(null)}
                className="w-full mt-6 bg-sky-500 hover:bg-sky-450 text-black font-bold py-3 rounded-xl transition-colors"
              >
                Fechar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
