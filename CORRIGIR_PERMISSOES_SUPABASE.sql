-- ====================================================================
-- 🔓 SCRIPT DE PERMISSÕES E SINCRONIZAÇÃO COMPLETA (SUPABASE)
-- ====================================================================
-- Copie TODO este código e cole no SQL Editor do Supabase, depois clique em "Run".

-- 1. Garante que todas as colunas necessárias existem na tabela de lojas
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS faturamento_hoje NUMERIC DEFAULT 0.00;
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS pedidos_hoje INTEGER DEFAULT 0;
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS data_ultimo_reset TIMESTAMPTZ DEFAULT now();

-- 2. Garante a criação da tabela de categorias
CREATE TABLE IF NOT EXISTS public.categorias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  loja_id UUID REFERENCES public.lojas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true
);

-- 3. Garante a criação da tabela de produtos
CREATE TABLE IF NOT EXISTS public.produtos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  loja_id UUID REFERENCES public.lojas(id) ON DELETE CASCADE,
  categoria_id UUID REFERENCES public.categorias(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco NUMERIC NOT NULL,
  preco_promocional NUMERIC,
  foto_url TEXT,
  disponivel BOOLEAN DEFAULT true,
  destaque BOOLEAN DEFAULT false,
  is_novo BOOLEAN DEFAULT false,
  sku TEXT,
  tempo_preparo INTEGER DEFAULT 15,
  ordem INTEGER DEFAULT 0
);

-- 4. Habilita RLS (Row Level Security) e libera acesso público total para ler e salvar lanches
ALTER TABLE public.lojas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxas_entrega ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso público lojas" ON public.lojas;
DROP POLICY IF EXISTS "Acesso público categorias" ON public.categorias;
DROP POLICY IF EXISTS "Acesso público produtos" ON public.produtos;
DROP POLICY IF EXISTS "Acesso público taxas_entrega" ON public.taxas_entrega;
DROP POLICY IF EXISTS "Acesso público cupons" ON public.cupons;

CREATE POLICY "Acesso público lojas" ON public.lojas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público categorias" ON public.categorias FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público produtos" ON public.produtos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público taxas_entrega" ON public.taxas_entrega FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público cupons" ON public.cupons FOR ALL USING (true) WITH CHECK (true);
