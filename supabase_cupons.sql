-- ====================================================================
-- 🎟️ SCRIPT SQL: TABELA E PERMISSÕES DE CUPONS (SUPABASE)
-- ====================================================================
-- Execute este script no "SQL Editor" do seu Supabase.
-- Ele cria a tabela de cupons (ou atualiza se já existir) com todas as
-- colunas, índices, restrição única por loja e permissões públicas (RLS).

-- 1. Criação da Tabela de Cupons
CREATE TABLE IF NOT EXISTS public.cupons (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  loja_id UUID REFERENCES public.lojas(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  tipo TEXT DEFAULT 'percentual', -- 'percentual' (%) ou 'fixo' (R$)
  valor NUMERIC NOT NULL DEFAULT 0,
  valor_minimo NUMERIC DEFAULT 0,
  quantidade_maxima INTEGER DEFAULT 999,
  quantidade_usada INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  validade TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Garantir colunas caso a tabela já tenha sido criada anteriormente
ALTER TABLE public.cupons ADD COLUMN IF NOT EXISTS loja_id UUID REFERENCES public.lojas(id) ON DELETE CASCADE;
ALTER TABLE public.cupons ADD COLUMN IF NOT EXISTS codigo TEXT;
ALTER TABLE public.cupons ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'percentual';
ALTER TABLE public.cupons ADD COLUMN IF NOT EXISTS valor NUMERIC DEFAULT 0;
ALTER TABLE public.cupons ADD COLUMN IF NOT EXISTS valor_minimo NUMERIC DEFAULT 0;
ALTER TABLE public.cupons ADD COLUMN IF NOT EXISTS quantidade_maxima INTEGER DEFAULT 999;
ALTER TABLE public.cupons ADD COLUMN IF NOT EXISTS quantidade_usada INTEGER DEFAULT 0;
ALTER TABLE public.cupons ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;
ALTER TABLE public.cupons ADD COLUMN IF NOT EXISTS validade TIMESTAMPTZ;
ALTER TABLE public.cupons ADD COLUMN IF NOT EXISTS criado_em TIMESTAMPTZ DEFAULT now();

-- 3. Índice único para evitar duplicidade de código na mesma loja
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cupons_loja_id_codigo_key'
  ) THEN
    ALTER TABLE public.cupons ADD CONSTRAINT cupons_loja_id_codigo_key UNIQUE (loja_id, codigo);
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_cupons_loja_id ON public.cupons (loja_id);
CREATE INDEX IF NOT EXISTS idx_cupons_codigo ON public.cupons (codigo);

-- 4. Habilitar RLS e Configurar Permissões de Leitura / Escrita
ALTER TABLE public.cupons ENABLE ROW LEVEL SECURITY;

-- Limpar policies antigas se existirem
DROP POLICY IF EXISTS "Permitir leitura pública de cupons" ON public.cupons;
DROP POLICY IF EXISTS "Permitir inserção de cupons" ON public.cupons;
DROP POLICY IF EXISTS "Permitir atualização de cupons" ON public.cupons;
DROP POLICY IF EXISTS "Permitir exclusão de cupons" ON public.cupons;
DROP POLICY IF EXISTS "Acesso total aos cupons" ON public.cupons;

-- Criar política de acesso total para o app (anônimo e autenticado)
CREATE POLICY "Acesso total aos cupons" 
ON public.cupons 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Conceder permissões para os papéis do Supabase
GRANT ALL ON TABLE public.cupons TO anon, authenticated, service_role;
