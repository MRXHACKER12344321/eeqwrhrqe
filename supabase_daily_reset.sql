-- ====================================================================
-- 📊 SCHEMA COMPLEMENTAR - RESET DIÁRIO DE FATURAMENTO
-- ====================================================================
-- Execute este script no SQL Editor do Supabase APÓS executar o schema principal
-- Este script adiciona tabelas e funções para resetar faturamento à meia-noite

-- 1️⃣ ADICIONAR COLUNAS À TABELA DE LOJAS (se não existirem)
ALTER TABLE public.lojas 
ADD COLUMN IF NOT EXISTS faturamento_hoje NUMERIC DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS pedidos_hoje INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS data_ultimo_reset TIMESTAMPTZ DEFAULT now();

-- 2️⃣ CRIAR TABELA DE HISTÓRICO DE FATURAMENTO DIÁRIO
CREATE TABLE IF NOT EXISTS public.faturamento_diario (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  data_referencia DATE NOT NULL,
  total_faturamento NUMERIC NOT NULL DEFAULT 0.00,
  total_pedidos INTEGER NOT NULL DEFAULT 0,
  data_inicio TIMESTAMPTZ NOT NULL,
  data_fim TIMESTAMPTZ NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT now(),
  UNIQUE(loja_id, data_referencia)
);

-- 3️⃣ HABILITAR RLS NA TABELA DE FATURAMENTO
ALTER TABLE public.faturamento_diario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso público faturamento_diario" ON public.faturamento_diario;
CREATE POLICY "Acesso público faturamento_diario" 
  ON public.faturamento_diario FOR ALL USING (true) WITH CHECK (true);

-- 4️⃣ CRIAR ÍNDICES PARA CONSULTAS RÁPIDAS
CREATE INDEX IF NOT EXISTS idx_faturamento_loja_data 
  ON public.faturamento_diario(loja_id, data_referencia DESC);
CREATE INDEX IF NOT EXISTS idx_faturamento_data 
  ON public.faturamento_diario(data_referencia DESC);

-- 5️⃣ CRIAR FUNÇÃO DE ATUALIZAÇÃO AUTOMÁTICA (trigger ao inserir pedido)
CREATE OR REPLACE FUNCTION public.atualizar_faturamento_loja()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar faturamento e contagem de pedidos da loja
  UPDATE public.lojas
  SET 
    faturamento_hoje = faturamento_hoje + NEW.total,
    pedidos_hoje = pedidos_hoje + 1
  WHERE id = NEW.loja_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6️⃣ CRIAR TRIGGER QUE EXECUTA A FUNÇÃO ACIMA
DROP TRIGGER IF EXISTS trigger_atualizar_faturamento ON public.pedidos;
CREATE TRIGGER trigger_atualizar_faturamento
AFTER INSERT ON public.pedidos
FOR EACH ROW
EXECUTE FUNCTION public.atualizar_faturamento_loja();

-- 7️⃣ CRIAR FUNÇÃO PARA RESETAR VALORES À MEIA-NOITE
-- (Você pode chamar isso via Supabase Edge Functions ou via um cron job externo)
CREATE OR REPLACE FUNCTION public.resetar_faturamento_diario()
RETURNS TABLE(loja_id UUID, valores_salvos BOOLEAN) AS $$
DECLARE
  loja RECORD;
BEGIN
  -- Para cada loja que teve movimento hoje
  FOR loja IN 
    SELECT id, faturamento_hoje, pedidos_hoje, data_ultimo_reset
    FROM public.lojas
    WHERE (faturamento_hoje > 0 OR pedidos_hoje > 0)
  LOOP
    -- 1. Salvar valores do dia anterior no histórico
    INSERT INTO public.faturamento_diario 
      (loja_id, data_referencia, total_faturamento, total_pedidos, data_inicio, data_fim)
    VALUES (
      loja.id,
      CURRENT_DATE - INTERVAL '1 day',
      loja.faturamento_hoje,
      loja.pedidos_hoje,
      loja.data_ultimo_reset,
      NOW()
    )
    ON CONFLICT (loja_id, data_referencia) DO UPDATE SET
      total_faturamento = EXCLUDED.total_faturamento,
      total_pedidos = EXCLUDED.total_pedidos,
      data_fim = NOW();

    -- 2. Resetar valores da loja para zero
    UPDATE public.lojas
    SET 
      faturamento_hoje = 0.00,
      pedidos_hoje = 0,
      data_ultimo_reset = NOW()
    WHERE id = loja.id;
    
    RETURN QUERY SELECT loja.id, TRUE;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 8️⃣ CRIAR VIEW PARA FACILITAR CONSULTAS DO HISTÓRICO
CREATE OR REPLACE VIEW public.relatorio_faturamento AS
SELECT 
  fd.loja_id,
  l.nome as loja_nome,
  fd.data_referencia,
  fd.total_faturamento,
  fd.total_pedidos,
  ROUND(fd.total_faturamento::numeric / NULLIF(fd.total_pedidos, 0), 2) as ticket_medio,
  TO_CHAR(fd.data_inicio, 'DD/MM/YYYY HH24:MI') as horario_inicio,
  TO_CHAR(fd.data_fim, 'DD/MM/YYYY HH24:MI') as horario_fim
FROM public.faturamento_diario fd
JOIN public.lojas l ON fd.loja_id = l.id
ORDER BY fd.loja_id, fd.data_referencia DESC;

-- 9️⃣ COMENTÁRIOS EXPLICATIVOS
COMMENT ON TABLE public.faturamento_diario IS 
'Histórico diário de faturamento. Atualizado automaticamente à meia-noite.';

COMMENT ON FUNCTION public.resetar_faturamento_diario() IS 
'Função que reseta valores diários para zero e salva no histórico. Chamar via Supabase Edge Functions ou cron externo.';

COMMENT ON VIEW public.relatorio_faturamento IS 
'View para consultas fáceis do histórico de faturamento com cálculos de ticket médio.';

-- ====================================================================
-- 🔔 INSTRUÇÕES PARA USAR:
-- ====================================================================
-- 1. Execute este script completo no SQL Editor do Supabase
-- 2. Crie uma Supabase Edge Function ou use um cron job externo para chamar:
--    SELECT * FROM public.resetar_faturamento_diario();
--    Deve ser executado 1x por dia às 00:01
-- 3. No frontend, consulte os valores:
--    - faturamento_hoje / pedidos_hoje da tabela "lojas" (valores do dia)
--    - Histórico: SELECT * FROM public.relatorio_faturamento WHERE loja_id = '...'

-- Schema de reset diário criado com sucesso! ✅
