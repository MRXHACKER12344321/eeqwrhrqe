/**
 * 📊 UTILITÁRIOS PARA RESET DIÁRIO DE FATURAMENTO
 * Funções para gerenciar faturamento diário e histórico
 */

import { supabase } from './supabaseClient';

export interface RelatorioFaturamento {
  loja_id: string;
  loja_nome: string;
  data_referencia: string;
  total_faturamento: number;
  total_pedidos: number;
  ticket_medio: number;
  horario_inicio: string;
  horario_fim: string;
}

/**
 * Obtém o faturamento do dia atual e histórico da loja
 */
export async function obterFaturamentoDia(lojaId: string) {
  try {
    const { data: loja, error: errorLoja } = await supabase
      .from('lojas')
      .select('faturamento_hoje, pedidos_hoje, data_ultimo_reset')
      .eq('id', lojaId)
      .single();

    if (errorLoja) throw errorLoja;

    return {
      faturamento_hoje: loja?.faturamento_hoje || 0,
      pedidos_hoje: loja?.pedidos_hoje || 0,
      data_ultimo_reset: loja?.data_ultimo_reset || new Date().toISOString(),
    };
  } catch (error) {
    console.error('Erro ao obter faturamento do dia:', error);
    return { faturamento_hoje: 0, pedidos_hoje: 0, data_ultimo_reset: new Date().toISOString() };
  }
}

/**
 * Obtém histórico de faturamento dos últimos 30 dias
 */
export async function obterHistoricoFaturamento(
  lojaId: string,
  diasRetroceder: number = 30
): Promise<RelatorioFaturamento[]> {
  try {
    const { data, error } = await supabase
      .from('relatorio_faturamento')
      .select(
        'loja_id, loja_nome, data_referencia, total_faturamento, total_pedidos, ticket_medio, horario_inicio, horario_fim'
      )
      .eq('loja_id', lojaId)
      .gte('data_referencia', new Date(Date.now() - diasRetroceder * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0])
      .order('data_referencia', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Erro ao obter histórico de faturamento:', error);
    return [];
  }
}

/**
 * Obtém estatísticas gerais do período (últimos 7/30 dias)
 */
export async function obterEstatisticasFaturamento(lojaId: string, dias: number = 7) {
  try {
    const historico = await obterHistoricoFaturamento(lojaId, dias);

    if (historico.length === 0) {
      return {
        total_periodo: 0,
        media_diaria: 0,
        maior_dia: 0,
        menor_dia: 0,
        total_pedidos: 0,
        ticket_medio: 0,
        dias_com_venda: 0,
      };
    }

    const totalPeriodo = historico.reduce((sum, h) => sum + h.total_faturamento, 0);
    const totalPedidos = historico.reduce((sum, h) => sum + h.total_pedidos, 0);
    const maiorDia = Math.max(...historico.map(h => h.total_faturamento));
    const menorDia = Math.min(...historico.map(h => h.total_faturamento));
    const diasComVenda = historico.filter(h => h.total_faturamento > 0).length;

    return {
      total_periodo: totalPeriodo,
      media_diaria: totalPeriodo / dias,
      maior_dia: maiorDia,
      menor_dia: menorDia,
      total_pedidos: totalPedidos,
      ticket_medio: totalPeriodo / Math.max(totalPedidos, 1),
      dias_com_venda: diasComVenda,
    };
  } catch (error) {
    console.error('Erro ao calcular estatísticas:', error);
    return {
      total_periodo: 0,
      media_diaria: 0,
      maior_dia: 0,
      menor_dia: 0,
      total_pedidos: 0,
      ticket_medio: 0,
      dias_com_venda: 0,
    };
  }
}

/**
 * Formata a data para exibição em português
 */
export function parseDateString(data: string | Date): Date | null {
  if (data instanceof Date) return data;
  if (typeof data !== 'string') return null;

  const isoDateMatch = data.match(/^\d{4}-\d{2}-\d{2}$/);
  if (isoDateMatch) {
    return new Date(data + 'T00:00:00');
  }

  const brDateMatch = data.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brDateMatch) {
    const [, day, month, year] = brDateMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const parsed = new Date(data);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function normalizeDateValue(data: string | Date): string | null {
  const date = parseDateString(data);
  return date ? date.toISOString().split('T')[0] : null;
}

export function formatarDataPT(data: string | Date): string {
  const d = parseDateString(data);
  if (!d) return String(data);

  const meses = [
    'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
    'jul', 'ago', 'set', 'out', 'nov', 'dez'
  ];
  const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
  
  return `${dias[d.getDay()]} ${d.getDate()} de ${meses[d.getMonth()]}`;
}

/**
 * Calcula horas e minutos desde o último reset
 */
export function calcularTempoDesdeReset(dataReset: string | Date): {
  horas: number;
  minutos: number;
  texto: string;
} {
  const reset = typeof dataReset === 'string' ? new Date(dataReset) : dataReset;
  const agora = new Date();
  const diferenca = agora.getTime() - reset.getTime();
  
  const horas = Math.floor(diferenca / (1000 * 60 * 60));
  const minutos = Math.floor((diferenca % (1000 * 60 * 60)) / (1000 * 60));
  
  let texto = '';
  if (horas > 0) {
    texto += `${horas}h `;
  }
  texto += `${minutos}m atrás`;
  
  return { horas, minutos, texto };
}

/**
 * Exporta relatório de faturamento em CSV
 */
export async function exportarRelatorioCSV(lojaId: string, dias: number = 30) {
  try {
    const historico = await obterHistoricoFaturamento(lojaId, dias);

    if (historico.length === 0) {
      console.warn('Nenhum dado para exportar');
      return null;
    }

    // Montar CSV
    const headers = [
      'Data', 'Faturamento (R$)', 'Pedidos', 'Ticket Médio (R$)', 
      'Horário Início', 'Horário Fim'
    ];

    const rows = historico.map(h => [
      h.data_referencia,
      h.total_faturamento.toFixed(2),
      h.total_pedidos,
      h.ticket_medio.toFixed(2),
      h.horario_inicio,
      h.horario_fim,
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `faturamento_${lojaId}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return true;
  } catch (error) {
    console.error('Erro ao exportar CSV:', error);
    return null;
  }
}
