-- ==============================================================================
-- 📊 SQL PARA RECUPERAÇÃO DE CLIENTES POR DIAS DE INATIVIDADE (100% COMPATÍVEL)
-- ==============================================================================
-- Execute este script no SQL Editor do seu Supabase.

-- 1. LIMPAR TABELAS/VIEWS ANTIGAS SE EXISTIREM
DROP VIEW IF EXISTS public.vw_clientes_inatividade CASCADE;
DROP FUNCTION IF EXISTS public.buscar_clientes_inativos CASCADE;
DROP TABLE IF EXISTS public.campanhas_recuperacao_logs CASCADE;
DROP TABLE IF EXISTS public.campanhas_recuperacao CASCADE;

-- 2. VIEW INTELIGENTE: RESUMO DE DIAS DE INATIVIDADE DE CADA CLIENTE
CREATE OR REPLACE VIEW public.vw_clientes_inatividade AS
SELECT 
  prof.id::TEXT AS cliente_id,
  ped.loja_id::TEXT AS loja_id,
  prof.nome,
  prof.whatsapp,
  prof.loyalty_points,
  COUNT(ped.id) AS total_pedidos,
  COALESCE(SUM(ped.total), 0) AS total_gasto,
  COALESCE(AVG(ped.total), 0) AS ticket_medio,
  MAX(ped.created_at) AS ultimo_pedido_em,
  CASE 
    WHEN MAX(ped.created_at) IS NULL THEN 999
    ELSE FLOOR(EXTRACT(EPOCH FROM (now() - MAX(ped.created_at))) / 86400)::INTEGER
  END AS dias_sem_comprar
FROM public.profiles prof
LEFT JOIN public.pedidos ped ON (
  ped.cliente_whatsapp = prof.whatsapp 
  OR ped.cliente_nome = prof.nome
)
GROUP BY prof.id, prof.nome, prof.whatsapp, prof.loyalty_points, ped.loja_id;

-- 3. FUNÇÃO SQL PARA BUSCAR CLIENTES POR DIAS (Ex: 3 dias, 5 dias, etc.)
CREATE OR REPLACE FUNCTION public.buscar_clientes_inativos(
  p_loja_id TEXT DEFAULT NULL,
  p_dias INTEGER DEFAULT 3,
  p_modo TEXT DEFAULT 'gte' -- 'gte' (>= X dias) ou 'exact' (= X dias)
)
RETURNS TABLE (
  cliente_id TEXT,
  loja_id TEXT,
  nome TEXT,
  whatsapp TEXT,
  total_pedidos BIGINT,
  total_gasto NUMERIC,
  ticket_medio NUMERIC,
  ultimo_pedido_em TIMESTAMPTZ,
  dias_sem_comprar INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.cliente_id,
    v.loja_id,
    v.nome::TEXT,
    v.whatsapp::TEXT,
    v.total_pedidos,
    v.total_gasto,
    v.ticket_medio,
    v.ultimo_pedido_em,
    v.dias_sem_comprar
  FROM public.vw_clientes_inatividade v
  WHERE 
    (p_loja_id IS NULL OR v.loja_id = p_loja_id)
    AND (
      CASE 
        WHEN p_modo = 'exact' THEN v.dias_sem_comprar = p_dias
        ELSE (v.dias_sem_comprar >= p_dias AND v.dias_sem_comprar < 999)
      END
    )
  ORDER BY v.dias_sem_comprar ASC, v.total_gasto DESC;
END;
$$;

-- 4. TABELA DE HISTÓRICO DE CAMPANHAS DE RECUPERAÇÃO
CREATE TABLE public.campanhas_recuperacao (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  loja_id TEXT,
  nome TEXT NOT NULL,
  segmento TEXT NOT NULL DEFAULT 'custom_days',
  dias_inatividade INTEGER DEFAULT 3,
  modo_dias TEXT DEFAULT 'gte',
  oferta_tipo TEXT DEFAULT 'cupom',
  oferta_valor NUMERIC DEFAULT 10,
  cupom_codigo TEXT,
  mensagem_template TEXT,
  total_clientes_alvo INTEGER DEFAULT 0,
  total_enviados INTEGER DEFAULT 0,
  status TEXT DEFAULT 'concluido',
  criado_em TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 5. TABELA DE LOGS DE DISPAROS INDIVIDUAIS
CREATE TABLE public.campanhas_recuperacao_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  campanha_id TEXT REFERENCES public.campanhas_recuperacao(id) ON DELETE CASCADE,
  loja_id TEXT,
  cliente_id TEXT,
  cliente_nome TEXT,
  cliente_whatsapp TEXT,
  dias_sem_comprar_no_disparo INTEGER,
  mensagem_enviada TEXT,
  status_envio TEXT DEFAULT 'enviado',
  converteu_pedido_id TEXT,
  enviado_em TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 6. HABILITAR SEGURANÇA (RLS) E POLÍTICAS PÚBLICAS
ALTER TABLE public.campanhas_recuperacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campanhas_recuperacao_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso público campanhas" ON public.campanhas_recuperacao;
CREATE POLICY "Acesso público campanhas" ON public.campanhas_recuperacao FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso público logs campanhas" ON public.campanhas_recuperacao_logs;
CREATE POLICY "Acesso público logs campanhas" ON public.campanhas_recuperacao_logs FOR ALL USING (true) WITH CHECK (true);
