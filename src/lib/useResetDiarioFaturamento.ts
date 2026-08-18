/**
 * 🔄 HOOK CUSTOMIZADO PARA RESET DIÁRIO
 * Detecta automaticamente quando é 00:00 e reseta o faturamento
 * Usa APENAS Supabase, sem serviços externos!
 */

import { useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';

export function useResetDiarioFaturamento(lojaId: string) {
  const ultimoResetRef = useRef<string | null>(null);

  useEffect(() => {
    if (!lojaId) return;

    const verificarEResetar = async () => {
      try {
        // Carregar data do último reset do banco
        const { data: loja, error } = await supabase
          .from('lojas')
          .select('data_ultimo_reset')
          .eq('id', lojaId)
          .single();

        if (error) throw error;

        const dataUltimoReset = new Date(loja?.data_ultimo_reset || '');
        const agora = new Date();

        // Comparar apenas data (YYYY-MM-DD)
        const dataUltimoResetStr = dataUltimoReset.toISOString().split('T')[0];
        const agoraStr = agora.toISOString().split('T')[0];

        // Se a data mudou, significa que já passou de 00:00 em outro dia
        if (dataUltimoResetStr !== agoraStr && ultimoResetRef.current !== agoraStr) {
          console.log('🔄 Detectado novo dia! Resetando faturamento...');
          
          // Chamar função de reset do Supabase
          const { data, error: resetError } = await supabase
            .rpc('resetar_faturamento_diario');

          if (resetError) {
            console.error('❌ Erro ao resetar:', resetError);
          } else {
            console.log('✅ Faturamento resetado com sucesso!', data);
            ultimoResetRef.current = agoraStr;
            const nowIso = new Date().toISOString();
            localStorage.setItem(`pedifacil_store_reset_${lojaId}`, nowIso);
            localStorage.removeItem(`pedifacil_local_orders_${lojaId}`);
          }
        }
      } catch (error) {
        console.error('Erro ao verificar reset diário:', error);
      }
    };

    // Verificar a cada 1 minuto
    verificarEResetar();
    const interval = setInterval(verificarEResetar, 60000);

    return () => clearInterval(interval);
  }, [lojaId]);
}

export default useResetDiarioFaturamento;
