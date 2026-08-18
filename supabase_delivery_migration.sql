-- ====================================================================
-- 📍 MIGRAÇÃO: SISTEMA DE ENTREGA COM GEOCODIFICAÇÃO
-- Execute este script no SQL Editor do Supabase
-- ====================================================================

-- 1. ADICIONAR COLUNAS À TABELA LOJAS
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,8);
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,8);
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS latitude_longitude_atualizado_em TIMESTAMPTZ;

-- 2. ADICIONAR CONFIGURAÇÕES DE ENTREGA À TABELA LOJAS
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS delivery_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS delivery_type TEXT DEFAULT 'faixas'; -- 'distancia' ou 'faixas'
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS delivery_min_distance_km NUMERIC DEFAULT 0.5;
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS delivery_max_distance_km NUMERIC DEFAULT 20;
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS delivery_base_price NUMERIC DEFAULT 5.00;
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS delivery_price_per_km NUMERIC DEFAULT 2.00;

-- 3. CRIAR TABELA DE FAIXAS DE ENTREGA
CREATE TABLE IF NOT EXISTS public.delivery_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  loja_id UUID REFERENCES public.lojas(id) ON DELETE CASCADE NOT NULL,
  min_distance_km NUMERIC NOT NULL CHECK (min_distance_km >= 0),
  max_distance_km NUMERIC NOT NULL CHECK (max_distance_km > min_distance_km),
  price NUMERIC NOT NULL CHECK (price >= 0),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. CRIAR TABELA DE CACHE DE ENDEREÇOS
CREATE TABLE IF NOT EXISTS public.address_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  address_hash TEXT UNIQUE NOT NULL,
  full_address TEXT NOT NULL,
  latitude NUMERIC(10,8) NOT NULL,
  longitude NUMERIC(10,8) NOT NULL,
  source TEXT DEFAULT 'heigit',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  last_used_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 5. ADICIONAR COLUNAS DE COORDENADAS AOS PEDIDOS
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS cliente_latitude NUMERIC(10,8);
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS cliente_longitude NUMERIC(10,8);
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS cliente_cep TEXT;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS distancia_km NUMERIC(6,2);
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS taxa_entrega_calculada BOOLEAN DEFAULT false;

-- 6. HABILITAR RLS NAS NOVAS TABELAS
ALTER TABLE public.delivery_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.address_cache ENABLE ROW LEVEL SECURITY;

-- 7. CRIAR POLÍTICAS DE ACESSO
CREATE POLICY "Acesso público delivery_rules" ON public.delivery_rules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público address_cache" ON public.address_cache FOR ALL USING (true) WITH CHECK (true);

-- 8. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_delivery_rules_loja_id ON public.delivery_rules(loja_id);
CREATE INDEX IF NOT EXISTS idx_address_cache_hash ON public.address_cache(address_hash);
CREATE INDEX IF NOT EXISTS idx_address_cache_last_used ON public.address_cache(last_used_at DESC);
CREATE INDEX IF NOT EXISTS idx_lojas_latitude_longitude ON public.lojas(latitude, longitude) WHERE latitude IS NOT NULL;

-- 9. CRIAR FUNÇÃO PARA CALCULAR HASH DE ENDEREÇO
CREATE OR REPLACE FUNCTION public.hash_address(
  rua TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT
) RETURNS TEXT AS $$
BEGIN
  RETURN encode(
    digest(
      LOWER(COALESCE(rua, '') || COALESCE(numero, '') || COALESCE(bairro, '') || COALESCE(cidade, '') || COALESCE(estado, '') || COALESCE(cep, '')),
      'sha256'
    ),
    'hex'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 10. CRIAR FUNÇÃO PARA ATUALIZAR TIMESTAMP
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. CRIAR TRIGGER PARA DELIVERY_RULES
CREATE TRIGGER update_delivery_rules_updated_at
  BEFORE UPDATE ON public.delivery_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- 12. CRIAR TRIGGER PARA ADDRESS_CACHE (atualizar last_used_at)
CREATE OR REPLACE FUNCTION public.update_address_cache_last_used()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_used_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_address_cache_last_used
  BEFORE UPDATE ON public.address_cache
  FOR EACH ROW
  EXECUTE FUNCTION public.update_address_cache_last_used();

-- ====================================================================
-- ✅ MIGRAÇÃO CONCLUÍDA
-- ====================================================================
